// src/components/AvaliacoesModule.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
  ArrowLeft, Plus, Search, Filter, ChevronRight, RefreshCw,
  Check, User, Dumbbell, Ruler, GitCompare, X as XIcon,
  CheckSquare, Square, BarChart2, Trash2, FileDown,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';

const fns         = getFunctions();
const fnListar    = httpsCallable(fns, 'listarAvaliacoes');
const fnPorAluno  = httpsCallable(fns, 'buscarAvaliacoesPorAluno');
const fnCriar     = httpsCallable(fns, 'criarAvaliacao');
const fnAlunos    = httpsCallable(fns, 'listarAlunos');
const fnDetalhe   = httpsCallable(fns, 'buscarAlunoDetalhe');
const fnExcluir   = httpsCallable(fns, 'excluirAvaliacao');

// ─── helpers ──────────────────────────────────────────────────────────────────
const hasDobras = (av) =>
  (av.skinfold_triceps||0)+(av.skinfold_subscapular||0)+
  (av.skinfold_suprailiac||0)+(av.skinfold_abdominal||0) > 0;

const fmtDate = (d) => {
  if (!d) return '—';
  const [y,m,dd] = d.split('-');
  return `${dd}/${m}/${y}`;
};

const fmtNum = (v, dec=1) =>
  v == null || v === 0 ? '—' : Number(v).toFixed(dec);

// Fórmulas com descrição de uso clínico
const FORMULAS = [
  { key:'jp7_body_fat',      label:'Jackson & Pollock 7', short:'JP7', desc:'Pop. geral e atletas (mais preciso)'    },
  { key:'jp3_body_fat',      label:'Jackson & Pollock 3', short:'JP3', desc:'Acompanhamento rápido (menos dobras)'   },
  { key:'jp4_body_fat',      label:'Jackson & Pollock 4', short:'JP4', desc:'Intermediário entre JP3 e JP7'          },
  { key:'faulkner_body_fat', label:'Faulkner',            short:'FLK', desc:'Atletas (4 dobras específicas)'         },
  { key:'guedes_body_fat',   label:'Guedes',              short:'GDS', desc:'Validada para brasileiros'              },
];

const NUM_FIELDS = [
  'height','age','weight',
  'neck_circumference','shoulder_circumference','chest_circumference',
  'waist_circumference','abdomen_circumference','hip_circumference',
  'left_arm_relaxed','left_arm_flexed','left_forearm',
  'right_arm_relaxed','right_arm_flexed','right_forearm',
  'left_thigh','left_calf','right_thigh','right_calf',
  'wrist_circumference','ankle_circumference',
  'skinfold_triceps','skinfold_subscapular','skinfold_suprailiac',
  'skinfold_abdominal','skinfold_chest','skinfold_midaxillary','skinfold_thigh',
];

const emptyForm = () => ({
  aluno:'',nome_completo:'',profissional:'herickebony@gmail.com',
  date: new Date().toISOString().split('T')[0],
  sex:'Feminino',height:'',age:'',weight:'',
  neck_circumference:0,shoulder_circumference:0,chest_circumference:0,
  waist_circumference:0,abdomen_circumference:0,hip_circumference:0,
  left_arm_relaxed:0,left_arm_flexed:0,left_forearm:0,
  right_arm_relaxed:0,right_arm_flexed:0,right_forearm:0,
  left_thigh:0,left_calf:0,right_thigh:0,right_calf:0,
  wrist_circumference:0,ankle_circumference:0,
  skinfold_triceps:0,skinfold_subscapular:0,skinfold_suprailiac:0,
  skinfold_abdominal:0,skinfold_chest:0,skinfold_midaxillary:0,skinfold_thigh:0,
});

// ─── FormField fora do componente (evita perda de foco) ──────────────────────
const FormField = React.memo(({ label, field, type='number', step='0.1', required=false, colSpan='', value, onChange }) => (
    <div className={colSpan}>
      <label className="block text-[10px] font-bold text-ebony-muted uppercase mb-1">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <input
        type={type} step={step} value={value ?? ''}
        onChange={e => onChange(field, e.target.value)}
        className="w-full px-3 py-2 bg-ebony-deep border border-ebony-border text-white rounded-lg text-sm outline-none focus:border-ebony-primary transition-colors placeholder-gray-600"
      />
    </div>
  ));
  
  const Section = ({ icon: Icon, title, children }) => (
    <div className="bg-ebony-surface border border-ebony-border rounded-xl p-5">
      <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
        <Icon size={14} className="text-ebony-primary"/> {title}
      </h3>
      {children}
    </div>
  );

  const ChartTip = ({ active, payload, label }) => {

  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a1a1f] border border-[#2d2d35] rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-gray-400 mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{color:p.color}} className="font-bold">{p.name}: {p.value}</p>
      ))}
    </div>
  );
};



// ─── componente ───────────────────────────────────────────────────────────────
export default function AvaliacoesModule() {
  const [view, setView]             = useState('list');
  const [loading, setLoading]       = useState(false);
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [alunoAvs, setAlunoAvs]     = useState([]);
  const [selectedAluno, setSelectedAluno] = useState(null);
  const [search, setSearch]         = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [onlyDobras, setOnlyDobras] = useState(false);
  const [formulaKey, setFormulaKey] = useState('jp7_body_fat');
  const [students, setStudents]     = useState([]);
  const [formData, setFormData]     = useState(emptyForm());

  // seleção na lista para comparar
  const [selectedRows, setSelectedRows] = useState(new Set());

  // quais colunas mostrar no compare view (null = todas)
  const [visibleAvNames, setVisibleAvNames] = useState(null);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const chartRef = useRef(null);
  const [selectedFormulas, setSelectedFormulas] = useState(new Set(['jp7_body_fat']));
  const [showFormulasDrop, setShowFormulasDrop] = useState(false);
  const formulasDropRef = useRef(null);

  const searchTimer    = useRef(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [showStudentDrop, setShowStudentDrop] = useState(false);
  const studentDropRef = useRef(null);

  const gerarPDF = useCallback(async () => {
    if (!alunoAvs.length || !selectedAluno) return;
    const avs = visibleAvNames
      ? alunoAvs.filter(a => visibleAvNames.has(a.name))
      : alunoAvs;
    if (!avs.length) return;

    setPdfGenerating(true);
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const W = doc.internal.pageSize.getWidth();
      const H = doc.internal.pageSize.getHeight();

      const RED     = [133, 0, 0];
      const BG      = [255, 255, 255];
      const SURFACE = [248, 248, 250];
      const BORDER  = [226, 226, 232];
      const TEXT    = [20, 20, 26];
      const MUTED   = [110, 110, 120];
      const GREEN   = [22, 163, 74];
      const REDTXT  = [185, 28, 28];
      const LTRED   = [254, 242, 242];

      const tableAvs = avs.slice(-10);
      const lat      = avs[avs.length - 1];
      const fLabel   = FORMULAS.find(f => f.key === formulaKey)?.short || '';
      const formulasSel = FORMULAS.filter(f => selectedFormulas.has(f.key));

      const addPageBg = () => {
        doc.setFillColor(...BG);
        doc.rect(0, 0, W, H, 'F');
        // faixa topo
        doc.setFillColor(...RED);
        doc.rect(0, 0, W, 12, 'F');
        // barra lateral esquerda sutil
        doc.setFillColor(245, 245, 248);
        doc.rect(0, 12, 6, H - 12, 'F');
      };

      const addHeader = (title) => {
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('SHAPEFY  •  AVALIAÇÃO DE COMPOSIÇÃO CORPORAL', 10, 8);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(title, W - 10, 8, { align: 'right' });
      };

      const addFooter = (page, total) => {
        doc.setDrawColor(...BORDER);
        doc.setLineWidth(0.2);
        doc.line(10, H - 8, W - 10, H - 8);
        doc.setFontSize(7);
        doc.setTextColor(...MUTED);
        doc.text(`${selectedAluno.nome_completo}  •  Gerado em ${new Date().toLocaleDateString('pt-BR')}`, 10, H - 4);
        doc.text(`${page} / ${total}`, W - 10, H - 4, { align: 'right' });
      };

      // ── PÁGINA 1 ──────────────────────────────────────────────────────────
      addPageBg();
      addHeader(selectedAluno.nome_completo || '');

      // nome
      doc.setTextColor(...TEXT);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text(selectedAluno.nome_completo || '', 10, 24);

      // subtítulo
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...MUTED);
      doc.text(`${avs.length} avaliações  •  Última: ${fmtDate(lat?.date)}  •  Fórmula principal: ${fLabel}`, 10, 30);

      // linha separadora
      doc.setDrawColor(...RED);
      doc.setLineWidth(0.5);
      doc.line(10, 33, W - 10, 33);

      // hero cards (4 cards)
      const cards = [
        { label: 'PESO ATUAL',          key: 'weight',    unit: 'kg', dec: 1, invert: false },
        { label: `%GORDURA (${fLabel})`, key: formulaKey,  unit: '%',  dec: 1, invert: false },        
        { label: 'MASSA GORDA',         key: 'fat_mass',  unit: 'kg', dec: 2, invert: false },
      ];
      let cx = 10;
      cards.forEach(card => {
        const val   = lat?.[card.key];
        const delta = avs.length > 1 ? (val||0) - (avs[0]?.[card.key]||0) : null;
        const isGood = card.invert ? delta > 0 : delta < 0;

        // fundo card
        doc.setFillColor(...SURFACE);
        doc.setDrawColor(...BORDER);
        doc.setLineWidth(0.3);
        doc.roundedRect(cx, 36, 62, 26, 2, 2, 'FD');

        // label
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...MUTED);
        doc.text(card.label, cx + 4, 43);

        // valor
        doc.setFontSize(17);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...TEXT);
        doc.text(val ? `${fmtNum(val, card.dec)} ${card.unit}` : '—', cx + 4, 53);

        // delta
        if (delta != null && delta !== 0) {
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...(isGood ? GREEN : REDTXT));
          doc.text(`${delta > 0 ? '+' : ''}${delta.toFixed(2)} ${card.unit} no período`, cx + 4, 59);
        }
        cx += 65;
      });

      // captura gráfico
      let chartImgData = null;
      if (chartRef.current) {
        try {
          const canvas = await html2canvas(chartRef.current, {
            backgroundColor: '#ffffff', scale: 2, useCORS: true,
          });
          chartImgData = canvas.toDataURL('image/png');
        } catch(e) { console.warn('Gráfico não capturado:', e); }
      }

      // tabela comparativa
      const mainRows = [
        { label: 'Peso (kg)',           key: 'weight'               },
        { label: `%Gordura (${fLabel})`,key: formulaKey             },
        { label: 'Massa Gorda (kg)',    key: 'fat_mass'             },        
        { label: 'Cintura (cm)',        key: 'waist_circumference'  },
        { label: 'Abdômen (cm)',        key: 'abdomen_circumference'},
        { label: 'Quadril (cm)',        key: 'hip_circumference'    },
        { label: 'WHR',                key: 'whr'                  },
      ].filter(r => tableAvs.some(a => (a[r.key]||0) > 0));

      const tableLeft  = chartImgData ? 148 : 10;
      const tableWidth = W - tableLeft - 10;

      autoTable(doc, {
        startY: 66,
        head: [['Indicador', ...tableAvs.map(a => fmtDate(a.date))]],
        body: mainRows.map(r => [
          r.label,
          ...tableAvs.map((a, ci) => {
            const val  = a[r.key];
            const prev = ci > 0 ? tableAvs[ci-1][r.key] : null;
            const d    = prev && val ? val - prev : null;
            return val ? `${fmtNum(val,2)}${d && d !== 0 ? (d<0?' ↓':' ↑') : ''}` : '—';
          })
        ]),
        theme: 'grid',
        styles: {
          fontSize: 7.5, textColor: TEXT, fillColor: BG,
          cellPadding: { top: 3, bottom: 3, left: 3, right: 2 },
          lineColor: BORDER, lineWidth: 0.2,
        },
        headStyles: {
          fillColor: RED, textColor: [255,255,255],
          fontStyle: 'bold', fontSize: 7, cellPadding: 3,
        },
        alternateRowStyles: { fillColor: SURFACE },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 36, textColor: TEXT } },
        margin: { left: tableLeft, right: 10 },
        didParseCell: (data) => {
          if (data.column.index === tableAvs.length && data.section !== 'head') {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = LTRED;
            data.cell.styles.textColor = RED;
          }
        },
      });

      // adiciona gráfico na página 1
      if (chartImgData) {
        const imgH = (150 / W) * 90;
        doc.addImage(chartImgData, 'PNG', 10, 66, 132, imgH);
      }

      // ── PÁGINA 2: circunferências ─────────────────────────────────────────
      const circRows = [
        { label: 'Pescoço',           key: 'neck_circumference'      },
        { label: 'Ombros',            key: 'shoulder_circumference'  },
        { label: 'Peito/Tórax',       key: 'chest_circumference'     },
        { label: 'Cintura',           key: 'waist_circumference'     },
        { label: 'Abdômen',           key: 'abdomen_circumference'   },
        { label: 'Quadril',           key: 'hip_circumference'       },
        { label: 'Braço Esq. Rel.',   key: 'left_arm_relaxed'        },
        { label: 'Braço Esq. Cont.',  key: 'left_arm_flexed'         },
        { label: 'Braço Dir. Rel.',   key: 'right_arm_relaxed'       },
        { label: 'Braço Dir. Cont.',  key: 'right_arm_flexed'        },
        { label: 'Antebraço Esq.',    key: 'left_forearm'            },
        { label: 'Antebraço Dir.',    key: 'right_forearm'           },
        { label: 'Coxa Esq.',         key: 'left_thigh'              },
        { label: 'Coxa Dir.',         key: 'right_thigh'             },
        { label: 'Panturrilha Esq.',  key: 'left_calf'               },
        { label: 'Panturrilha Dir.',  key: 'right_calf'              },
      ].filter(r => tableAvs.some(a => (a[r.key]||0) > 0));

      if (circRows.length) {
        doc.addPage();
        addPageBg();
        addHeader('Circunferências');
        doc.setTextColor(...TEXT);
        doc.setFontSize(15);
        doc.setFont('helvetica', 'bold');
        doc.text('CIRCUNFERÊNCIAS (cm)', 10, 22);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...MUTED);
        doc.text(selectedAluno.nome_completo || '', 10, 28);
        doc.setDrawColor(...RED);
        doc.setLineWidth(0.4);
        doc.line(10, 31, W - 10, 31);

        autoTable(doc, {
          startY: 35,
          head: [['Medida', ...tableAvs.map(a => fmtDate(a.date))]],
          body: circRows.map(r => [
            r.label,
            ...tableAvs.map((a, ci) => {
              const val  = a[r.key];
              const prev = ci > 0 ? tableAvs[ci-1][r.key] : null;
              const d = ci > 0 ? val - (tableAvs[ci-1][r.key]||0) : null;
              const arrow = d != null && d !== 0 ? (d < 0 ? ' ↓' : ' ↑') : '';
              return val ? `${fmtNum(val,2)}${arrow}` : '—';
            })
          ]),
          theme: 'grid',
          styles: { fontSize: 7.5, textColor: TEXT, fillColor: BG, cellPadding: 2.5, lineColor: BORDER, lineWidth: 0.2 },
          headStyles: { fillColor: RED, textColor: [255,255,255], fontStyle: 'bold', fontSize: 7 },
          alternateRowStyles: { fillColor: SURFACE },
          columnStyles: { 0: { fontStyle: 'bold', cellWidth: 42, textColor: TEXT } },
          margin: { left: 10, right: 10 },                
        });
      }

      // ── PÁGINA 3: dobras + fórmulas selecionadas ──────────────────────────
      const hasAnyDobras = tableAvs.some(a =>
        (a.skinfold_triceps||0)+(a.skinfold_subscapular||0)+
        (a.skinfold_suprailiac||0)+(a.skinfold_abdominal||0) > 0
      );

      if (hasAnyDobras) {
        doc.addPage();
        addPageBg();
        addHeader('Dobras Cutâneas');
        doc.setTextColor(...TEXT);
        doc.setFontSize(15);
        doc.setFont('helvetica', 'bold');
        doc.text('DOBRAS CUTÂNEAS (mm)', 10, 22);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...MUTED);
        doc.text(selectedAluno.nome_completo || '', 10, 28);
        doc.setDrawColor(...RED);
        doc.setLineWidth(0.4);
        doc.line(10, 31, W - 10, 31);

        const skinfoldRows = [
          { label: 'Tríceps',      key: 'skinfold_triceps'     },
          { label: 'Subescapular', key: 'skinfold_subscapular' },
          { label: 'Suprailíaca',  key: 'skinfold_suprailiac'  },
          { label: 'Abdominal',    key: 'skinfold_abdominal'   },
          { label: 'Peitoral',     key: 'skinfold_chest'       },
          { label: 'Axilar Média', key: 'skinfold_midaxillary' },
          { label: 'Coxa',         key: 'skinfold_thigh'       },
        ].filter(r => tableAvs.some(a => (a[r.key]||0) > 0));

        // separador visual entre dobras e fórmulas
        const separatorRow = [{
          content: '% GORDURA POR FÓRMULA',
          colSpan: tableAvs.length + 1,
          styles: {
            fillColor: [240, 240, 245],
            fontStyle: 'bold',
            fontSize: 7,
            textColor: MUTED,
            cellPadding: { top: 4, bottom: 4, left: 3, right: 3 },
          }
        }];

        // linhas de fórmulas selecionadas
        const formulaRowsPDF = formulasSel.map(f => [
          { content: `${f.short} — ${f.label}\n${f.desc}`, styles: { fontStyle: 'bold', fontSize: 7 } },
          ...tableAvs.map((a, ci) => {
            const val  = a[f.key];
            const prev = ci > 0 ? tableAvs[ci-1][f.key] : null;
            const d    = prev && val ? val - prev : null;
            return val ? fmtNum(val,1) : '—';
          })
        ]);

        autoTable(doc, {
          startY: 35,
          head: [['Dobra / Fórmula', ...tableAvs.map(a => fmtDate(a.date))]],
          body: [
            ...skinfoldRows.map(r => [
              r.label,
              ...tableAvs.map(a => a[r.key] > 0 ? fmtNum(a[r.key], 1) : '—')
            ]),
            separatorRow,
            ...formulaRowsPDF,
          ],
          theme: 'grid',
          styles: { fontSize: 7.5, textColor: TEXT, fillColor: BG, cellPadding: 2.5, lineColor: BORDER, lineWidth: 0.2 },
          headStyles: { fillColor: RED, textColor: [255,255,255], fontStyle: 'bold', fontSize: 7 },
          alternateRowStyles: { fillColor: SURFACE },
          columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50, textColor: TEXT } },
          margin: { left: 10, right: 10 },          
        });
      }

      // rodapés
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        addFooter(i, pageCount);
      }

      const nome = `avaliacao_${(selectedAluno.nome_completo||'aluno').replace(/\s+/g,'_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(nome);
    } finally {
      setPdfGenerating(false);
      setShowPdfPreview(false);
    }
  }, [alunoAvs, visibleAvNames, selectedAluno, formulaKey, selectedFormulas]);

  const handleExcluir = useCallback(async (e, av) => {
    e.stopPropagation();
    if (!window.confirm(`Excluir avaliação de ${av.nome_completo} em ${fmtDate(av.date)}?\n\nEsta ação não pode ser desfeita.`)) return;
    try {
      await fnExcluir({ name: av.name });
      setAvaliacoes(prev => prev.filter(a => a.name !== av.name));
    } catch(err) {
      alert('Erro ao excluir: ' + err.message);
    }
  }, []);

  // handler estável — não recria a cada render, evita perda de foco
  const handleFieldChange = useCallback((field, val) => {
    setFormData(p => ({ ...p, [field]: val }));
  }, []);

  // auto-fill ao selecionar aluno
  const handleSelectStudent = useCallback(async (student) => {
    setFormData(p => ({
      ...p,
      aluno: student.alunoFrappeId || student.name,
      nome_completo: student.nome_completo || student.name || '',
    }));
    setStudentSearch(student.nome_completo || student.name || '');
    setShowStudentDrop(false);
    // busca perfil para preencher altura, idade, sexo e peso
    try {
      const res = await fnDetalhe({ id: student.name });
      const d = res.data?.data || {};
      setFormData(p => ({
        ...p,
        height: d.height || d.altura || p.height,
        age:    d.age    || d.idade  || p.age,
        sex:    d.sex    || d.sexo   || p.sex,
        weight: d.weight || d.peso   || p.weight,
      }));
    } catch(e) {
      console.warn('Auto-fill do perfil falhou (não crítico):', e.message);
    }
  }, []);

  // fecha dropdowns ao clicar fora
  useEffect(() => {
    const handler = (e) => {
      if (studentDropRef.current && !studentDropRef.current.contains(e.target)) {
        setShowStudentDrop(false);
      }
      if (formulasDropRef.current && !formulasDropRef.current.contains(e.target)) {
        setShowFormulasDrop(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ─── carga inicial (50 mais recentes) ──────────────────────────────────────
  const loadAvaliacoes = useCallback(async () => {
    setLoading(true);
    try {
      let all = [];
      let offset = 0;
      const pageSize = 100;
      let hasMore = true;
      while (hasMore && offset < 2000) {
        const res = await fnListar({ limit: pageSize, offset });
        const batch = res.data?.data || [];
        if (!batch.length) break;
        all = [...all, ...batch];
        // só continua se veio exatamente pageSize (tem mais páginas)
        hasMore = batch.length === pageSize && offset > 0
          ? batch[0]?.name !== all[all.length - batch.length - 1]?.name
          : batch.length === pageSize;
        offset += pageSize;
      }
      setAvaliacoes(all);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (view === 'list') { loadAvaliacoes(); setSelectedRows(new Set()); }
  }, [view, loadAvaliacoes]);

  // ─── busca por nome com debounce ────────────────────────────────────────────
  useEffect(() => {
    clearTimeout(searchTimer.current);
    if (search.length === 0) { loadAvaliacoes(); return; }
    if (search.length < 2) return;
    searchTimer.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        // busca com todas as variações de capitalização
        const variacoes = [
          search,
          search.toLowerCase(),
          search.charAt(0).toUpperCase() + search.slice(1).toLowerCase(),
          search.toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
        ];
        const resultados = await Promise.all(
          variacoes.map(v => fnListar({ nome: v, limit: 200 }).then(r => r.data?.data || []))
        );
        // merge e deduplica por name
        const mapa = {};
        resultados.flat().forEach(av => { mapa[av.name] = av; });
        setAvaliacoes(Object.values(mapa));
      } catch(e) { console.error(e); }
      finally { setSearchLoading(false); }
    }, 500);
    return () => clearTimeout(searchTimer.current);
  }, [search]);

  // ─── abrir compare view ────────────────────────────────────────────────────
  const openCompare = useCallback(async (av, preSelected = null) => {
    setLoading(true);
    setSelectedAluno({ aluno: av.aluno, nome_completo: av.nome_completo });
    setAlunoAvs([]);
    setVisibleAvNames(preSelected); // null = todas, Set = só as selecionadas
    setView('compare');
    try {
      const res = await fnPorAluno({ aluno: av.aluno });
      setAlunoAvs(res.data?.data || []);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  // ─── abrir form ────────────────────────────────────────────────────────────
 // ─── abrir form ────────────────────────────────────────────────────────────
 const openForm = useCallback(async (preAluno = null) => {
  const base = emptyForm();
  if (preAluno) { base.aluno = preAluno.aluno||''; base.nome_completo = preAluno.nome_completo||''; }
  setFormData(base);
  setStudentSearch(preAluno?.nome_completo || '');
  setShowStudentDrop(false);
  setView('form');
  try {
    let allStudents = [];
    let page = 1;
    let hasMore = true;
    while (hasMore && page <= 50) {
      const res = await fnAlunos({ limit: 100, page });
      const lista = res.data?.list || res.data?.data || [];
      allStudents = [...allStudents, ...lista];
      hasMore = res.data?.hasMore || false;
      page++;
    }
    setStudents(allStudents);
  } catch(e) { console.error('Erro ao listar alunos:', e); }
}, []);

  const handleSave = async () => {
    if (!formData.aluno || !formData.weight || !formData.date) {
      alert('Preencha os campos obrigatórios: Aluno, Data e Peso.'); return;
    }
    setLoading(true);
    try {
      const payload = { ...formData };
      NUM_FIELDS.forEach(k => { if (payload[k] !== '') payload[k] = Number(payload[k])||0; });
      await fnCriar({ payload });
      alert('✅ Avaliação salva!');
      if (selectedAluno) { await openCompare(selectedAluno); }
      else { setView('list'); }
    } catch(e) { alert('Erro: '+(e.message||'verifique o console')); }
    finally { setLoading(false); }
  };

  // ─── lista filtrada (client-side após fetch) ────────────────────────────────
  const filtered = useMemo(() =>
    avaliacoes.filter(av => {
      const matchNome = !search || 
        av.nome_completo?.toLowerCase().includes(search.toLowerCase());
      return matchNome && (!onlyDobras || hasDobras(av));
    }),
  [avaliacoes, search, onlyDobras]);

  // ─── toggles de seleção ────────────────────────────────────────────────────
  const toggleRow = (e, name) => {
    e.stopPropagation();
    setSelectedRows(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const selectedArray = [...selectedRows];
  const firstSelected = filtered.find(av => av.name === selectedArray[0]);

  // ─── avaliações visíveis no compare ────────────────────────────────────────
  const visibleAvs = useMemo(() => {
    if (!visibleAvNames) return alunoAvs;
    if (visibleAvNames.size === 0) return []; // nenhuma selecionada — gráficos ficam vazios mas tabela mostra tudo
    return alunoAvs.filter(av => visibleAvNames.has(av.name));
  }, [alunoAvs, visibleAvNames]);

  const toggleAvColumn = (name) => {
    setVisibleAvNames(prev => {
      const base = prev ? new Set(prev) : new Set(alunoAvs.map(a => a.name));
      base.has(name) ? base.delete(name) : base.add(name);
      return base;
    });
  };

  const latest = visibleAvs[visibleAvs.length - 1];
  const first  = visibleAvs[0];
  const getDelta = (key) => {
    if (!latest||!first||latest===first) return null;
    return (latest[key]||0) - (first[key]||0);
  };

  const chartData = useMemo(() =>
    visibleAvs.map(av => ({
      date:    fmtDate(av.date),
      Peso:    av.weight      || null,
      Gordura: av[formulaKey] || null,
    })),
  [visibleAvs, formulaKey]);

  const curFormula = FORMULAS.find(f => f.key === formulaKey);

  // ══════════════════════════════════════════════════════════════════════════
  //  LISTA
  // ══════════════════════════════════════════════════════════════════════════
  const renderList = () => (
    <div className="animate-in fade-in duration-300">
      {/* header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Avaliações Corporais</h1>
          <p className="text-sm text-ebony-muted mt-0.5">
            {(searchLoading||loading) ? 'Buscando...' : `${filtered.length} avaliações`}
            {search.length > 0 && !loading && !searchLoading && (
              <span className="ml-1 text-ebony-primary">· filtrado por "{search}"</span>
            )}
          </p>
        </div>
        <button
          onClick={() => openForm()}
          className="flex items-center gap-2 bg-ebony-primary hover:bg-red-900 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors shadow-lg"
        >
          <Plus size={16}/> Nova Avaliação
        </button>
      </div>

      {/* filtros */}
      <div className="flex gap-3 mb-5 flex-wrap items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ebony-muted"/>
          {(searchLoading) && <RefreshCw size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-ebony-muted animate-spin"/>}
          <input
            type="text"
            placeholder="Buscar por aluno... (mín. 2 letras)"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-2 bg-ebony-surface border border-ebony-border text-white placeholder-gray-600 rounded-lg text-sm outline-none focus:border-ebony-primary transition-colors"
          />
        </div>
        <button
          onClick={() => setOnlyDobras(v => !v)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-bold transition-colors ${
            onlyDobras
              ? 'bg-ebony-primary border-ebony-primary text-white'
              : 'bg-ebony-surface border-ebony-border text-ebony-muted hover:text-white'
          }`}
        >
          <Filter size={14}/> Com Dobras
        </button>

        {/* seletor de fórmula */}
        <div className="flex flex-col gap-0.5">
          <select
            value={formulaKey}
            onChange={e => setFormulaKey(e.target.value)}
            className="px-3 py-2 bg-ebony-surface border border-ebony-border text-white rounded-lg text-sm outline-none cursor-pointer"
          >
            {FORMULAS.map(f => (
              <option key={f.key} value={f.key}>{f.short} — {f.label}</option>
            ))}
          </select>
          <p className="text-[10px] text-ebony-muted pl-1">{curFormula?.desc}</p>
        </div>

        <button
          onClick={loadAvaliacoes}
          className="p-2 bg-ebony-surface border border-ebony-border rounded-lg text-ebony-muted hover:text-white transition-colors"
          title="Recarregar"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''}/>
        </button>
      </div>

      {/* tabela */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-ebony-muted">
          <RefreshCw size={20} className="animate-spin mr-2"/> Carregando...
        </div>
      ) : (
        <div className="bg-ebony-surface border border-ebony-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ebony-border bg-ebony-deep">
                <th className="w-10 px-3 py-3">
                  {/* select all visible */}
                  <button
                    onClick={() => {
                      if (selectedRows.size === filtered.length) { setSelectedRows(new Set()); }
                      else { setSelectedRows(new Set(filtered.map(a => a.name))); }
                    }}
                    className="text-ebony-muted hover:text-white transition-colors"
                  >
                    {selectedRows.size === filtered.length && filtered.length > 0
                      ? <CheckSquare size={15}/>
                      : <Square size={15}/>}
                  </button>
                </th>
                {['Aluno','Data','Peso','% Gordura','Dobras',''].map(h => (
                  <th key={h} className="text-left text-[10px] font-bold text-ebony-muted uppercase px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-14 text-ebony-muted text-sm">
                    {onlyDobras ? 'Nenhuma avaliação com dobras cutâneas.' : 'Nenhuma avaliação encontrada.'}
                  </td>
                </tr>
              ) : filtered.map((av, i) => {
                const isChecked = selectedRows.has(av.name);
                return (
                  <tr
                    key={av.name}
                    onClick={() => openCompare(av)}
                    className={`border-b border-ebony-border/50 transition-colors cursor-pointer
                      ${isChecked ? 'bg-ebony-primary/10 hover:bg-ebony-primary/15' : i%2 ? 'bg-ebony-deep/20 hover:bg-ebony-deep/50' : 'hover:bg-ebony-deep/40'}`}
                  >
                    <td className="w-10 px-3 py-3" onClick={e => toggleRow(e, av.name)}>
                      {isChecked
                        ? <CheckSquare size={15} className="text-ebony-primary"/>
                        : <Square size={15} className="text-ebony-muted/50 hover:text-ebony-muted"/>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-white leading-tight">{av.nome_completo}</div>
                      <div className="text-[10px] text-ebony-muted font-mono">{av.aluno}</div>
                    </td>
                    <td className="px-4 py-3 text-ebony-muted whitespace-nowrap">{fmtDate(av.date)}</td>
                    <td className="px-4 py-3 text-white font-medium whitespace-nowrap">
                      {fmtNum(av.weight,1)}{av.weight?' kg':''}
                    </td>
                    <td className="px-4 py-3 text-white whitespace-nowrap">
                      {fmtNum(av[formulaKey],1)}{av[formulaKey]?'%':''}
                    </td>
                    <td className="px-4 py-3">
                      {hasDobras(av)
                        ? <span className="bg-green-500/15 text-green-400 border border-green-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">✓ Dobras</span>
                        : <span className="text-ebony-muted/40 text-[10px]">—</span>}
                    </td>
                    <td className="px-4 py-3 flex items-center gap-2 justify-end">
                      <button
                        onClick={e => handleExcluir(e, av)}
                        className="p-1.5 text-ebony-muted/40 hover:text-red-400 transition-colors rounded"
                        title="Excluir avaliação"
                      >
                        <Trash2 size={14}/>
                      </button>
                      <ChevronRight size={16} className="text-ebony-muted"/>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!search && filtered.length === 50 && (
            <div className="px-4 py-3 border-t border-ebony-border bg-ebony-deep/40 text-center">
              <p className="text-[11px] text-ebony-muted">
                Exibindo as 50 mais recentes.{' '}
                <span className="text-ebony-primary">Busque por um nome para ver o histórico completo de uma aluna.</span>
              </p>
            </div>
          )}
        </div>
      )}

      {/* botão flutuante de comparar */}
      {selectedRows.size >= 2 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center gap-3 bg-ebony-surface border border-ebony-primary/50 shadow-2xl rounded-2xl px-5 py-3">
            <span className="text-white font-bold text-sm">{selectedRows.size} avaliações selecionadas</span>
            <button
              onClick={() => {
                if (!firstSelected) return;
                // verifica se todas são da mesma aluna
                const alunoIds = new Set(filtered.filter(av => selectedRows.has(av.name)).map(av => av.aluno));
                if (alunoIds.size > 1) {
                  alert('Selecione avaliações da mesma aluna para comparar.');
                  return;
                }
                openCompare(firstSelected, new Set(selectedRows));
              }}
              className="flex items-center gap-2 bg-ebony-primary hover:bg-red-900 text-white px-4 py-2 rounded-xl font-bold text-sm transition-colors"
            >
              <GitCompare size={15}/> Comparar ({selectedRows.size})
            </button>
            <button onClick={() => setSelectedRows(new Set())} className="text-ebony-muted hover:text-white transition-colors">
              <XIcon size={16}/>
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  //  COMPARE VIEW
  // ══════════════════════════════════════════════════════════════════════════
  const renderCompare = () => {
    if (loading) return (
      <div className="flex items-center justify-center py-20 text-ebony-muted">
        <RefreshCw size={20} className="animate-spin mr-2"/> Carregando histórico...
      </div>
    );
    if (!alunoAvs.length) return (
      <div className="text-center py-20 text-ebony-muted">Nenhuma avaliação encontrada.</div>
    );

    const totalCount = alunoAvs.length;
    const hasAnyDobras = visibleAvs.some(hasDobras);

    const COMPARE_ROWS = [
      { label:'Peso (kg)',              key:'weight',               invert:false },
      { label:`%Gordura (${curFormula?.short})`, key:formulaKey,   invert:false },
      { label:'Massa Gorda (kg)',       key:'fat_mass',             invert:false },
      { label:'Massa Magra (kg)',       key:'lean_mass',            invert:true  },
      { label:'Cintura (cm)',           key:'waist_circumference',  invert:false },
      { label:'Abdômen (cm)',           key:'abdomen_circumference',invert:false },
      { label:'Quadril (cm)',           key:'hip_circumference',    invert:false },
      { label:'WHR',                   key:'whr',                  invert:false },
    ];

    const CIRC_ROWS = [
      {label:'Pescoço',         key:'neck_circumference'     },
      {label:'Ombros',          key:'shoulder_circumference' },
      {label:'Peito/Tórax',     key:'chest_circumference'    },
      {label:'Cintura',         key:'waist_circumference'    },
      {label:'Abdômen',         key:'abdomen_circumference'  },
      {label:'Quadril',         key:'hip_circumference'      },
      {label:'Braço Esq. Rel.', key:'left_arm_relaxed'       },
      {label:'Braço Esq. Cont.',key:'left_arm_flexed'        },
      {label:'Braço Dir. Rel.', key:'right_arm_relaxed'      },
      {label:'Braço Dir. Cont.',key:'right_arm_flexed'       },
      {label:'Antebraço Esq.',  key:'left_forearm'           },
      {label:'Antebraço Dir.',  key:'right_forearm'          },
      {label:'Coxa Esq.',       key:'left_thigh'             },
      {label:'Coxa Dir.',       key:'right_thigh'            },
      {label:'Panturrilha Esq.',key:'left_calf'              },
      {label:'Panturrilha Dir.',key:'right_calf'             },
    ];

    const SKINFOLD_ROWS = [
      {label:'Tríceps',      key:'skinfold_triceps'     },
      {label:'Subescapular', key:'skinfold_subscapular' },
      {label:'Suprailíaca',  key:'skinfold_suprailiac'  },
      {label:'Abdominal',    key:'skinfold_abdominal'   },
      {label:'Peitoral',     key:'skinfold_chest'       },
      {label:'Axilar Média', key:'skinfold_midaxillary' },
      {label:'Coxa',         key:'skinfold_thigh'       },
    ];

    // cabeçalho de coluna com checkbox
    const ColHeader = ({ av }) => {
      const isVisible = !visibleAvNames || visibleAvNames.has(av.name);
      const isLast    = av.name === alunoAvs[alunoAvs.length-1]?.name;
      return (
        <th
          key={av.name}
          className={`text-center text-[10px] font-bold uppercase px-4 py-3 min-w-[120px] cursor-pointer select-none transition-colors ${
            isVisible ? 'text-ebony-muted' : 'text-ebony-muted/30'
          }`}
          onClick={() => toggleAvColumn(av.name)}
          title={isVisible ? 'Clique para ocultar' : 'Clique para mostrar'}
        >
          <div className="flex flex-col items-center gap-1">
            <span className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
              isVisible ? 'border-ebony-primary bg-ebony-primary/20' : 'border-ebony-border'
            }`}>
              {isVisible && <Check size={10} className="text-ebony-primary"/>}
            </span>
            {fmtDate(av.date)}
            {isLast && <span className="text-[8px] text-ebony-primary font-normal tracking-wider">ÚLTIMO</span>}
          </div>
        </th>
      );
    };

    const TableBase = ({ title, rows }) => {
      // usa alunoAvs para decidir quais linhas mostrar (não some com desmarcar)
      const visibleRows = rows.filter(r => alunoAvs.some(av => (av[r.key]||0) > 0));
      if (!visibleRows.length) return null;
      return (
        <div className="bg-ebony-surface border border-ebony-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-ebony-border bg-ebony-deep/60">
            <h3 className="font-bold text-white text-sm">{title}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ebony-border/60">
                  <th className="text-left text-[10px] font-bold text-ebony-muted uppercase px-4 py-3 min-w-[160px]">Indicador</th>
                  {alunoAvs.map(av => <ColHeader key={av.name} av={av}/>)}
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row, ri) => (
                  <tr key={row.key} className={`border-b border-ebony-border/30 ${ri%2?'bg-ebony-deep/25':''}`}>
                    <td className="px-4 py-2.5 text-ebony-muted text-xs font-medium">{row.label}</td>
                    {alunoAvs.map((av) => {
                      const isVis   = !visibleAvNames || visibleAvNames.has(av.name);
                      const val     = av[row.key];
                      const visIdx  = visibleAvs.findIndex(a => a.name === av.name);
                      const prevVis = visIdx > 0 ? visibleAvs[visIdx-1] : null;
                      const d       = prevVis && val > 0 && prevVis[row.key] > 0 ? val - prevVis[row.key] : null;
                      const isGood  = row.invert ? d > 0 : d < 0;
                      const isLast  = av.name === latest?.name;
                      return (
                        <td
                          key={av.name}
                          className={`px-4 py-2.5 text-center whitespace-nowrap transition-opacity ${
                            !isVis ? 'opacity-20' : isLast ? 'font-bold text-white' : 'text-gray-400'
                          }`}
                        >
                          {val ? fmtNum(val,2) : '—'}
                          {isVis && d != null && d !== 0 && (
                            <span className={`text-[9px] ml-1 ${isGood?'text-green-400':'text-red-400'}`}>
                              {d>0?'↑':'↓'}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    };
    

    // pré-visualização PDF
    const PdfPreview = () => (
      <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
          {/* header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Pré-visualização do PDF</h2>
              <p className="text-xs text-gray-500">{selectedAluno?.nome_completo}</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={gerarPDF}
                disabled={pdfGenerating}
                className="flex items-center gap-2 bg-[#850000] hover:bg-red-800 text-white px-5 py-2 rounded-lg font-bold text-sm transition-colors disabled:opacity-50"
              >
                {pdfGenerating
                  ? <><RefreshCw size={14} className="animate-spin"/> Gerando...</>
                  : <><FileDown size={14}/> Baixar PDF</>}
              </button>
              <button onClick={() => setShowPdfPreview(false)} className="text-gray-400 hover:text-gray-700 transition-colors">
                <XIcon size={20}/>
              </button>
            </div>
          </div>

          {/* conteúdo de preview */}
          <div className="p-6 bg-gray-50 space-y-5" ref={chartRef}>
            {/* hero cards */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Peso Atual', key: 'weight', unit: 'kg', dec: 1, invert: false },
                { label: `%Gordura (${curFormula?.short})`, key: formulaKey, unit: '%', dec: 1, invert: false },                
                { label: 'Massa Gorda', key: 'fat_mass', unit: 'kg', dec: 2, invert: false },
              ].map(card => {
                const dv    = getDelta(card.key);
                const isPos = dv > 0;
                const isGood = card.invert ? isPos : !isPos;
                return (
                  <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{card.label}</div>
                    <div className="text-2xl font-bold text-gray-900">
                      {fmtNum(latest?.[card.key], card.dec)}
                      <span className="text-sm font-normal text-gray-400 ml-1">{latest?.[card.key] ? card.unit : ''}</span>
                    </div>
                    {dv != null && dv !== 0 && visibleAvs.length > 1 && (
                      <div className={`text-xs font-bold mt-1 ${isGood ? 'text-green-600' : 'text-red-600'}`}>
                        {isPos ? '+' : ''}{dv.toFixed(2)} {card.unit}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* gráfico de peso e gordura */}
            {visibleAvs.length > 1 && (
              <div className="grid grid-cols-2 gap-4">
                {[
                  { title: 'Peso Corporal (kg)', dataKey: 'Peso', color: '#850000' },
                  { title: `%Gordura (${curFormula?.short})`, dataKey: 'Gordura', color: '#1d4ed8' },
                ].map(chart => (
                  <div key={chart.title} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase mb-3 tracking-wider">{chart.title}</h4>
                    <ResponsiveContainer width="100%" height={150}>
                      <LineChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb"/>
                        <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#9ca3af' }}/>
                        <YAxis tick={{ fontSize: 9, fill: '#9ca3af' }} domain={['auto', 'auto']}/>
                        <Tooltip content={<ChartTip/>}/>
                        <Line type="monotone" dataKey={chart.dataKey} stroke={chart.color} strokeWidth={2} dot={{ fill: chart.color, r: 3 }} connectNulls/>
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ))}
              </div>
            )}

            {/* tabela resumo */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="px-4 py-3 bg-[#850000]">
                <h3 className="font-bold text-white text-sm">Histórico Comparativo</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left text-[10px] font-bold text-gray-500 uppercase px-4 py-2">Indicador</th>
                      {visibleAvs.slice(-6).map(av => (
                        <th key={av.name} className="text-center text-[10px] font-bold text-gray-500 uppercase px-3 py-2 min-w-[80px]">
                          {fmtDate(av.date)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: 'Peso (kg)', key: 'weight' },
                      { label: `%Gordura (${curFormula?.short})`, key: formulaKey },
                      { label: 'Massa Gorda (kg)', key: 'fat_mass' },                      
                      { label: 'Cintura (cm)', key: 'waist_circumference' },
                      { label: 'Abdômen (cm)', key: 'abdomen_circumference' },
                      { label: 'Quadril (cm)', key: 'hip_circumference' },
                    ].filter(r => visibleAvs.some(a => (a[r.key]||0) > 0)).map((row, ri) => (
                      <tr key={row.key} className={ri % 2 ? 'bg-gray-50' : 'bg-white'}>
                        <td className="px-4 py-2 text-gray-600 text-xs font-medium">{row.label}</td>
                        {visibleAvs.slice(-6).map((av, ci) => {
                          const val = av[row.key];
                          const isLast = ci === visibleAvs.slice(-6).length - 1;
                          return (
                            <td key={av.name} className={`px-3 py-2 text-center text-xs ${isLast ? 'font-bold text-gray-900' : 'text-gray-500'}`}>
                              {val ? fmtNum(val, 2) : '—'}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <p className="text-[10px] text-gray-400 text-center">
              O PDF exportado inclui também circunferências e dobras cutâneas completas.
            </p>
          </div>
        </div>
      </div>
    );

    return (
      <div className="animate-in fade-in duration-300 space-y-5 pb-12">
        {showPdfPreview && <PdfPreview/>}  

        {/* header */}
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={() => setView('list')} className="p-2 hover:bg-ebony-surface rounded-lg transition-colors text-ebony-muted hover:text-white">
            <ArrowLeft size={20}/>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-white truncate">{selectedAluno?.nome_completo}</h1>
            <p className="text-xs text-ebony-muted">
              {totalCount} avaliações no total
              {visibleAvNames && ` · ${visibleAvs.length} selecionadas para comparar`}
              {' · Última: '}{fmtDate(alunoAvs[alunoAvs.length-1]?.date)}
            </p>
          </div>

          {/* seletor de fórmula principal (cards hero) */}
          <div className="flex flex-col gap-0.5 flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs text-ebony-muted hidden sm:inline">Fórmula:</span>
              <select
                value={formulaKey}
                onChange={e => setFormulaKey(e.target.value)}
                className="px-3 py-1.5 bg-ebony-surface border border-ebony-border text-white rounded-lg text-xs outline-none cursor-pointer"
              >
                {FORMULAS.map(f => (
                  <option key={f.key} value={f.key}>{f.short} — {f.label}</option>
                ))}
              </select>
            </div>
            <p className="text-[10px] text-ebony-primary text-right pr-1">{curFormula?.desc}</p>
          </div>

          {/* seletor múltiplo de fórmulas para dobras */}
          <div className="relative flex-shrink-0" ref={formulasDropRef}>
            <button
              onClick={() => setShowFormulasDrop(v => !v)}
              className="flex items-center gap-2 px-3 py-1.5 bg-ebony-surface border border-ebony-border text-white rounded-lg text-xs font-bold transition-colors hover:bg-ebony-deep"
            >
              <BarChart2 size={13}/>
              Dobras ({selectedFormulas.size})
              <span className="text-ebony-muted text-[10px]">▾</span>
            </button>
            {showFormulasDrop && (
              <div className="absolute right-0 top-full mt-1 z-50 bg-ebony-surface border border-ebony-border rounded-xl shadow-2xl w-72 p-3 animate-in fade-in duration-150">
                <p className="text-[10px] font-bold text-ebony-muted uppercase mb-2 tracking-wider">
                  Selecione as fórmulas para exibir e exportar
                </p>
                <div className="space-y-1">
                  {FORMULAS.map(f => {
                    const isSelected = selectedFormulas.has(f.key);
                    return (
                      <button
                        key={f.key}
                        type="button"
                        onClick={() => {
                          setSelectedFormulas(prev => {
                            const next = new Set(prev);
                            next.has(f.key) ? next.delete(f.key) : next.add(f.key);
                            if (next.size === 0) next.add(f.key); // mínimo 1
                            return next;
                          });
                        }}
                        className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                          isSelected ? 'bg-ebony-primary/15 border border-ebony-primary/30' : 'hover:bg-ebony-deep border border-transparent'
                        }`}
                      >
                        <span className={`mt-0.5 w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                          isSelected ? 'bg-ebony-primary border-ebony-primary' : 'border-ebony-border'
                        }`}>
                          {isSelected && <Check size={10} className="text-white"/>}
                        </span>
                        <div>
                          <div className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-ebony-muted'}`}>
                            {f.short} — {f.label}
                          </div>
                          <div className="text-[10px] text-ebony-muted/70 mt-0.5">{f.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-2 mt-3 pt-3 border-t border-ebony-border">
                  <button
                    onClick={() => setSelectedFormulas(new Set(FORMULAS.map(f => f.key)))}
                    className="flex-1 text-[10px] py-1.5 border border-ebony-border text-ebony-muted hover:text-white rounded-lg transition-colors"
                  >
                    Marcar todas
                  </button>
                  <button
                    onClick={() => setSelectedFormulas(new Set(['jp7_body_fat']))}
                    className="flex-1 text-[10px] py-1.5 border border-ebony-border text-ebony-muted hover:text-white rounded-lg transition-colors"
                  >
                    Só JP7
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setVisibleAvNames(null)}
              className="text-[11px] text-ebony-muted hover:text-white border border-ebony-border px-3 py-1.5 rounded-lg transition-colors"
            >
              Todas
            </button>
            <button
              onClick={() => {
                const comDobras = new Set(alunoAvs.filter(hasDobras).map(a => a.name));
                setVisibleAvNames(comDobras.size > 0 ? comDobras : null);
              }}
              className="text-[11px] text-green-400 hover:text-green-300 border border-green-500/30 px-3 py-1.5 rounded-lg transition-colors"
            >
              Só Dobras
            </button>
            <button
              onClick={() => {             
                if (visibleAvNames && visibleAvNames.size === 0) {
                  setVisibleAvNames(null);
                } else {
                  setVisibleAvNames(new Set());
                }
              }}
              className="text-[11px] text-ebony-muted/50 hover:text-white border border-ebony-border px-3 py-1.5 rounded-lg transition-colors"
            >
              {visibleAvNames && visibleAvNames.size === 0 ? 'Restaurar' : 'Desmarcar'}
            </button>
          </div>

          <button
            onClick={() => setShowPdfPreview(true)}
            className="flex items-center gap-2 bg-ebony-surface hover:bg-ebony-deep border border-ebony-border text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors"
          >
            <FileDown size={14}/> Exportar PDF
          </button>
          <button
            onClick={() => openForm(selectedAluno)}
            className="flex items-center gap-2 bg-ebony-primary hover:bg-red-900 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors"
          >
            <Plus size={14}/> Nova Avaliação
          </button>
        </div>

        {/* instrução de seleção */}
        <p className="text-[11px] text-ebony-muted border border-ebony-border/50 bg-ebony-deep/30 rounded-lg px-4 py-2">
          💡 Clique no <strong className="text-white">checkbox das colunas</strong> para incluir ou excluir avaliações da comparação.
        </p>

        {/* hero cards */}
        {latest && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              {label:'Peso Atual',                  key:'weight',    unit:'kg', dec:1, invert:false},
              {label:`%Gordura (${curFormula?.short})`, key:formulaKey, unit:'%',  dec:1, invert:false},
              {label:'Massa Magra',                 key:'lean_mass', unit:'kg', dec:2, invert:true },
              {label:'Massa Gorda',                 key:'fat_mass',  unit:'kg', dec:2, invert:false},
            ].map(card => {
              const d     = getDelta(card.key);
              const isPos = d > 0;
              const isGood = card.invert ? isPos : !isPos;
              return (
                <div key={card.label} className="bg-ebony-surface border border-ebony-border rounded-xl p-4">
                  <div className="text-[10px] text-ebony-muted uppercase tracking-wider mb-1.5">{card.label}</div>
                  <div className="text-2xl font-bold text-white leading-none">
                    {fmtNum(latest[card.key],card.dec)}
                    <span className="text-sm font-normal text-ebony-muted ml-1">{latest[card.key]?card.unit:''}</span>
                  </div>
                  {d != null && d !== 0 && visibleAvs.length > 1 && (
                    <div className={`text-[11px] font-bold mt-1.5 ${isGood?'text-green-400':'text-red-400'}`}>
                      {isPos?'+':''}{d.toFixed(2)} {card.unit} período
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* tabela comparativa */}
        <TableBase title="Histórico Comparativo" rows={COMPARE_ROWS}/>

        {/* gráficos */}
        {visibleAvs.length > 1 && (
          <div className="grid md:grid-cols-2 gap-4">
            {[
              {title:'Peso Corporal (kg)',         dataKey:'Peso',    color:'#e74c3c'},
              {title:`%Gordura (${curFormula?.short})`, dataKey:'Gordura', color:'#3b82f6'},
            ].map(chart => (
              <div key={chart.title} className="bg-ebony-surface border border-ebony-border rounded-xl p-4">
                <h4 className="text-[10px] font-bold text-ebony-muted uppercase mb-3 tracking-wider">{chart.title}</h4>
                <ResponsiveContainer width="100%" height={170}>
                  <LineChart data={chartData} margin={{top:5,right:5,left:-25,bottom:5}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2d2d35"/>
                    <XAxis dataKey="date" tick={{fontSize:10,fill:'#555'}}/>
                    <YAxis tick={{fontSize:10,fill:'#555'}} domain={['auto','auto']}/>
                    <Tooltip content={<ChartTip/>}/>
                    <Line type="monotone" dataKey={chart.dataKey} stroke={chart.color} strokeWidth={2} dot={{fill:chart.color,r:3}} connectNulls/>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ))}
          </div>
        )}

        {/* circunferências e dobras */}
        <TableBase title="Circunferências (cm)" rows={CIRC_ROWS}/>

        {hasAnyDobras && (
          <div className="bg-ebony-surface border border-ebony-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-ebony-border bg-ebony-deep/60">
              <h3 className="font-bold text-white text-sm">Dobras Cutâneas (mm) e %Gordura por Fórmula</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ebony-border/60">
                    <th className="text-left text-[10px] font-bold text-ebony-muted uppercase px-4 py-3 min-w-[160px]">Dobra</th>
                    {alunoAvs.map(av => <ColHeader key={av.name} av={av}/>)}
                  </tr>
                </thead>
                <tbody>
                  {SKINFOLD_ROWS.map((row, ri) => {
                    const hasAny = alunoAvs.some(av => av[row.key] > 0);
                    if (!hasAny) return null;
                    return (
                      <tr key={row.key} className={`border-b border-ebony-border/30 ${ri%2?'bg-ebony-deep/25':''}`}>
                        <td className="px-4 py-2.5 text-ebony-muted text-xs font-medium">{row.label}</td>
                        {alunoAvs.map(av => {
                          const isVis  = !visibleAvNames || visibleAvNames.has(av.name);
                          const val    = av[row.key];
                          const visIdx = visibleAvs.findIndex(a => a.name===av.name);
                          const prevVis = visIdx > 0 ? visibleAvs[visIdx-1] : null;
                          const d = prevVis && val > 0 && prevVis[row.key] > 0 ? val - prevVis[row.key] : null;
                          const isLast = av.name === latest?.name;
                          return (
                            <td key={av.name} className={`px-4 py-2.5 text-center whitespace-nowrap ${!isVis?'opacity-20':isLast?'font-bold text-white':'text-gray-400'}`}>
                              {val > 0 ? fmtNum(val,1) : '—'}
                              {isVis && d != null && d !== 0 && (
                                <span className={`text-[9px] ml-1 ${d<0?'text-green-400':'text-red-400'}`}>{d>0?'↑':'↓'}</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                  {/* linhas de resultados — uma por fórmula selecionada */}
                  {FORMULAS.filter(f => selectedFormulas.has(f.key)).map((f, fi) => (
                    <tr key={f.key} className={`border-b border-ebony-border/30 ${fi % 2 ? 'bg-ebony-primary/5' : 'bg-ebony-primary/10'}`}>
                      <td className="px-4 py-2.5">
                        <div className={`text-xs font-bold ${f.key === formulaKey ? 'text-ebony-primary' : 'text-ebony-muted'}`}>
                          {f.short} — {f.label}
                          {f.key === formulaKey && <span className="ml-1 text-[9px]">◀ principal</span>}
                        </div>
                        <div className="text-[9px] text-ebony-muted/60 mt-0.5">{f.desc}</div>
                      </td>
                      {alunoAvs.map(av => {
                        const isVis = !visibleAvNames || visibleAvNames.has(av.name);
                        const isLast = av.name === latest?.name;
                        return (
                          <td key={av.name} className={`px-4 py-2.5 text-center whitespace-nowrap transition-opacity ${!isVis ? 'opacity-20' : isLast ? 'font-bold text-white' : 'text-gray-400'}`}>
                            {hasDobras(av) && av[f.key] ? `${fmtNum(av[f.key], 1)}%` : '—'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ══════════════════════════════════════════════════════════════════════════
  //  FORMULÁRIO
  // ══════════════════════════════════════════════════════════════════════════
  const renderForm = () => {    

    return (
      <div className="animate-in fade-in duration-300">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setView(selectedAluno?'compare':'list')} className="p-2 hover:bg-ebony-surface rounded-lg transition-colors text-ebony-muted hover:text-white">
            <ArrowLeft size={20}/>
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">Nova Avaliação</h1>
            {selectedAluno && <p className="text-xs text-ebony-muted">{selectedAluno.nome_completo}</p>}
          </div>
        </div>

        <div className="space-y-5 max-w-4xl">
          <Section icon={User} title="Dados do Aluno">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* ── seletor de aluno com dropdown filtrado ── */}
              <div className="md:col-span-2" ref={studentDropRef}>
                <label className="block text-[10px] font-bold text-ebony-muted uppercase mb-1">
                  Aluno<span className="text-red-400 ml-0.5">*</span>
                  {formData.aluno && <span className="ml-2 text-ebony-primary font-mono text-[9px]">{formData.aluno}</span>}
                </label>
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ebony-muted pointer-events-none"/>
                  <input
                    type="text"
                    placeholder="Buscar aluno pelo nome..."
                    value={studentSearch}
                    onChange={e => { setStudentSearch(e.target.value); setShowStudentDrop(true); }}
                    onFocus={() => setShowStudentDrop(true)}
                    className="w-full pl-9 pr-4 py-2 bg-ebony-deep border border-ebony-border text-white rounded-lg text-sm outline-none focus:border-ebony-primary transition-colors placeholder-gray-600"
                  />
                  {showStudentDrop && (
                    <div className="absolute z-50 mt-1 w-full bg-ebony-surface border border-ebony-border rounded-xl shadow-2xl max-h-56 overflow-y-auto">
                      {students
                        .filter(s => {
                          const nome = (s.nome_completo || s.name || '').toLowerCase();
                          return !studentSearch || nome.includes(studentSearch.toLowerCase());
                        })
                        .slice(0, 30)
                        .map(s => (
                          <button
                            key={s.name}
                            type="button"
                            onClick={() => handleSelectStudent(s)}
                            className="w-full text-left px-4 py-2.5 hover:bg-ebony-deep transition-colors border-b border-ebony-border/40 last:border-0"
                          >
                            <div className="text-sm text-white font-medium">{s.nome_completo || s.name}</div>
                            <div className="text-[10px] text-ebony-muted font-mono">{s.alunoFrappeId || s.name}</div>
                          </button>
                        ))}
                      {students.filter(s =>
                        !studentSearch ||
                        s.nome_completo?.toLowerCase().includes(studentSearch.toLowerCase()) ||
                        s.name?.toLowerCase().includes(studentSearch.toLowerCase())
                      ).length === 0 && (
                        <div className="px-4 py-3 text-sm text-ebony-muted text-center">Nenhuma aluna encontrada</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <FormField label="Nome Completo" field="nome_completo" type="text" required colSpan="md:col-span-2" value={formData.nome_completo} onChange={handleFieldChange} />
              <FormField label="Data da Avaliação" field="date" type="date" required value={formData.date} onChange={handleFieldChange} />
              <div>
                <label className="block text-[10px] font-bold text-ebony-muted uppercase mb-1">Sexo</label>
                <select value={formData.sex} onChange={e => handleFieldChange('sex', e.target.value)}
                  className="w-full px-3 py-2 bg-ebony-deep border border-ebony-border text-white rounded-lg text-sm outline-none">
                  <option>Feminino</option><option>Masculino</option>
                </select>
              </div>
              <FormField label="Altura (m)" field="height" step="0.01" required value={formData.height} onChange={handleFieldChange} />
              <FormField label="Idade" field="age" step="1" value={formData.age} onChange={handleFieldChange} />
              <FormField label="Peso (kg)" field="weight" step="0.1" required value={formData.weight} onChange={handleFieldChange} />
            </div>
          </Section>

          <Section icon={Ruler} title="Circunferências (cm)">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <FormField label="Pescoço"       field="neck_circumference"     value={formData.neck_circumference}     onChange={handleFieldChange} />
              <FormField label="Ombros"        field="shoulder_circumference" value={formData.shoulder_circumference} onChange={handleFieldChange} />
              <FormField label="Peito"         field="chest_circumference"    value={formData.chest_circumference}    onChange={handleFieldChange} />
              <FormField label="Cintura"       field="waist_circumference"    value={formData.waist_circumference}    onChange={handleFieldChange} />
              <FormField label="Abdômen"       field="abdomen_circumference"  value={formData.abdomen_circumference}  onChange={handleFieldChange} />
              <FormField label="Quadril"       field="hip_circumference"      value={formData.hip_circumference}      onChange={handleFieldChange} />
              <FormField label="Braço E. Rel." field="left_arm_relaxed"       value={formData.left_arm_relaxed}       onChange={handleFieldChange} />
              <FormField label="Braço E. Cont" field="left_arm_flexed"        value={formData.left_arm_flexed}        onChange={handleFieldChange} />
              <FormField label="Braço D. Rel." field="right_arm_relaxed"      value={formData.right_arm_relaxed}      onChange={handleFieldChange} />
              <FormField label="Braço D. Cont" field="right_arm_flexed"       value={formData.right_arm_flexed}       onChange={handleFieldChange} />
              <FormField label="Antebr. Esq."  field="left_forearm"           value={formData.left_forearm}           onChange={handleFieldChange} />
              <FormField label="Antebr. Dir."  field="right_forearm"          value={formData.right_forearm}          onChange={handleFieldChange} />
              <FormField label="Coxa Esq."     field="left_thigh"             value={formData.left_thigh}             onChange={handleFieldChange} />
              <FormField label="Coxa Dir."     field="right_thigh"            value={formData.right_thigh}            onChange={handleFieldChange} />
              <FormField label="Panturr. Esq." field="left_calf"              value={formData.left_calf}              onChange={handleFieldChange} />
              <FormField label="Panturr. Dir." field="right_calf"             value={formData.right_calf}             onChange={handleFieldChange} />
              <FormField label="Punho"         field="wrist_circumference"    value={formData.wrist_circumference}    onChange={handleFieldChange} />
              <FormField label="Tornozelo"     field="ankle_circumference"    value={formData.ankle_circumference}    onChange={handleFieldChange} />
            </div>
          </Section>

          <Section icon={Dumbbell} title="Dobras Cutâneas (mm)">
            <p className="text-xs text-ebony-muted mb-4">Deixe 0 se não coletado. O Frappe calcula os percentuais automaticamente.</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <FormField label="Tríceps"      field="skinfold_triceps"     value={formData.skinfold_triceps}     onChange={handleFieldChange} />
              <FormField label="Subescapular" field="skinfold_subscapular" value={formData.skinfold_subscapular} onChange={handleFieldChange} />
              <FormField label="Suprailíaca"  field="skinfold_suprailiac"  value={formData.skinfold_suprailiac}  onChange={handleFieldChange} />
              <FormField label="Abdominal"    field="skinfold_abdominal"   value={formData.skinfold_abdominal}   onChange={handleFieldChange} />
              <FormField label="Peitoral"     field="skinfold_chest"       value={formData.skinfold_chest}       onChange={handleFieldChange} />
              <FormField label="Axilar Média" field="skinfold_midaxillary" value={formData.skinfold_midaxillary} onChange={handleFieldChange} />
              <FormField label="Coxa"         field="skinfold_thigh"       value={formData.skinfold_thigh}       onChange={handleFieldChange} />
            </div>
          </Section>

          <div className="flex justify-end gap-3 pb-6">
            <button onClick={() => setView(selectedAluno?'compare':'list')}
              className="px-6 py-2.5 border border-ebony-border text-ebony-muted hover:text-white rounded-lg text-sm font-bold transition-colors">
              Cancelar
            </button>
            <button onClick={handleSave} disabled={loading}
              className="flex items-center gap-2 bg-ebony-primary hover:bg-red-900 text-white px-6 py-2.5 rounded-lg font-bold text-sm transition-colors disabled:opacity-50">
              {loading ? <RefreshCw size={14} className="animate-spin"/> : <Check size={14}/>}
              Salvar Avaliação
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      {view === 'list'    && renderList()}
      {view === 'compare' && renderCompare()}
      {view === 'form'    && renderForm()}
    </div>
  );
}