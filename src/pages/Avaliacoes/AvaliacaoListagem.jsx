import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Plus, RefreshCw, Trash2, FileDown, Check,
  Filter, GitCompare, X as XIcon, BarChart2, CheckSquare, Square,
} from 'lucide-react'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import html2canvas from 'html2canvas'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import { listarAvaliacoes, listarAvaliacoesPorAluno, excluirAvaliacao } from '../../api/avaliacoes'
import { Button, Badge, Spinner, EmptyState, DataTable } from '../../components/ui'
import ListPage from '../../components/templates/ListPage'
import ImagemInterativa from '../Feedbacks/ImagemInterativa'

const FRAPPE_URL = import.meta.env.VITE_FRAPPE_URL || ''

const FORMULAS = [
  { key: 'jp7_body_fat',      label: 'Jackson & Pollock 7', short: 'JP7', desc: 'Pop. geral e atletas (mais preciso)'   },
  { key: 'jp3_body_fat',      label: 'Jackson & Pollock 3', short: 'JP3', desc: 'Acompanhamento rápido (menos dobras)'  },
  { key: 'jp4_body_fat',      label: 'Jackson & Pollock 4', short: 'JP4', desc: 'Intermediário entre JP3 e JP7'         },
  { key: 'faulkner_body_fat', label: 'Faulkner',            short: 'FLK', desc: 'Atletas (4 dobras específicas)'        },
  { key: 'guedes_body_fat',   label: 'Guedes',              short: 'GDS', desc: 'Validada para brasileiros'             },
]

const FORMULA_OPTS = [
  { value: '', label: 'Fórmula: Todos' },
  ...FORMULAS.map(f => ({ value: f.key, label: `${f.short} — ${f.label}` })),
]

const PHOTOS = [
  { key: 'front_photo',             label: 'Frente'               },
  { key: 'back_photo',              label: 'Costas'               },
  { key: 'relaxed_left_side_photo', label: 'Lateral Esq. Relaxado'},
  { key: 'flexed_left_side_photo',  label: 'Lateral Esq. Contraído'},
  { key: 'relaxed_right_side_photo',label: 'Lateral Dir. Relaxado' },
  { key: 'flexed_right_side_photo', label: 'Lateral Dir. Contraído'},
  { key: 'others_1',                label: 'Outros 1'              },
  { key: 'others_2',                label: 'Outros 2'              },
]

const fmtDate = (d) => {
  if (!d) return '—'
  const [y, m, day] = String(d).split(' ')[0].split('-')
  return `${day}/${m}/${y}`
}

const fmtNum = (v, dec = 1) =>
  v == null || v === 0 ? '—' : Number(v).toFixed(dec)

const hasDobras = (av) =>
  (av.skinfold_triceps || 0) + (av.skinfold_subscapular || 0) +
  (av.skinfold_suprailiac || 0) + (av.skinfold_abdominal || 0) > 0

// ─── ChartTooltip ─────────────────────────────────────────────────────────────
function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1a1a1f] border border-[#323238] rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-gray-400 mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }} className="font-bold">{p.name}: {p.value}</p>
      ))}
    </div>
  )
}

export default function AvaliacaoListagem() {
  const navigate = useNavigate()
  const [view, setView] = useState('list')

  // ─── List state ─────────────────────────────────────────────────────────────
  const [avaliacoes, setAvaliacoes] = useState([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [queryBusca, setQueryBusca] = useState('')
  const [formulaKey, setFormulaKey] = useState('jp7_body_fat')
  const [onlyDobras, setOnlyDobras] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [selectedRows, setSelectedRows] = useState(new Set())
  const debounceRef = useRef(null)

  // ─── Compare state ───────────────────────────────────────────────────────────
  const [alunoAtivo, setAlunoAtivo] = useState(null)
  const [historico, setHistorico] = useState([])
  const [loadingHistorico, setLoadingHistorico] = useState(false)
  const [visibleAvNames, setVisibleAvNames] = useState(null)
  const [selectedFormulas, setSelectedFormulas] = useState(new Set(['jp7_body_fat']))
  const [showFormulasDrop, setShowFormulasDrop] = useState(false)
  const formulasDropRef = useRef(null)

  // ─── PDF state ───────────────────────────────────────────────────────────────
  const [showPdfPreview, setShowPdfPreview] = useState(false)
  const [pdfGenerating, setPdfGenerating] = useState(false)
  const chartRef = useRef(null)

  // ─── Debounce busca ──────────────────────────────────────────────────────────
  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => { setQueryBusca(busca); setPage(1) }, 400)
    return () => clearTimeout(debounceRef.current)
  }, [busca])

  // ─── Fecha dropdown fórmulas ao clicar fora ──────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (formulasDropRef.current && !formulasDropRef.current.contains(e.target))
        setShowFormulasDrop(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ─── Carregar lista ──────────────────────────────────────────────────────────
  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const res = await listarAvaliacoes({ busca: queryBusca, page, limit: 50 })
      setAvaliacoes(res.list)
      setHasMore(res.hasMore)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [queryBusca, page])

  useEffect(() => { if (view === 'list') { carregar(); setSelectedRows(new Set()) } }, [carregar, view])

  // ─── Carregar histórico de um aluno ─────────────────────────────────────────
  const abrirCompare = useCallback(async (av, preSelected = null) => {
    setAlunoAtivo({ aluno: av.aluno, nome_completo: av.nome_completo })
    setHistorico([])
    setVisibleAvNames(preSelected)
    setView('compare')
    setLoadingHistorico(true)
    try {
      const data = await listarAvaliacoesPorAluno(av.aluno)
      setHistorico(data)
    } catch (e) { console.error(e) }
    finally { setLoadingHistorico(false) }
  }, [])

  // ─── Excluir avaliação ───────────────────────────────────────────────────────
  const handleExcluir = useCallback(async (e, av) => {
    e.stopPropagation()
    if (!window.confirm(`Excluir avaliação de ${av.nome_completo} em ${fmtDate(av.date)}?\n\nEsta ação não pode ser desfeita.`)) return
    try {
      await excluirAvaliacao(av.name)
      setAvaliacoes(prev => prev.filter(a => a.name !== av.name))
    } catch (err) { console.error(err); alert('Erro ao excluir avaliação.') }
  }, [])

  // ─── Filtered list (client-side dobras toggle) ───────────────────────────────
  const filtered = useMemo(() =>
    onlyDobras ? avaliacoes.filter(hasDobras) : avaliacoes,
  [avaliacoes, onlyDobras])

  // ─── Compare: avaliações visíveis ────────────────────────────────────────────
  const visibleAvs = useMemo(() => {
    if (!visibleAvNames) return historico
    return historico.filter(av => visibleAvNames.has(av.name))
  }, [historico, visibleAvNames])

  const latest = visibleAvs[visibleAvs.length - 1]
  const first  = visibleAvs[0]
  const getDelta = (key) => {
    if (!latest || !first || latest === first) return null
    return (latest[key] || 0) - (first[key] || 0)
  }

  const chartData = useMemo(() =>
    visibleAvs.map(av => ({
      date:    fmtDate(av.date),
      Peso:    av.weight || null,
      Gordura: av[formulaKey] || null,
    })),
  [visibleAvs, formulaKey])

  const curFormula = FORMULAS.find(f => f.key === formulaKey)

  const toggleAvColumn = (name) => {
    setVisibleAvNames(prev => {
      const base = prev ? new Set(prev) : new Set(historico.map(a => a.name))
      base.has(name) ? base.delete(name) : base.add(name)
      return new Set(base)
    })
  }

  // ─── PDF ─────────────────────────────────────────────────────────────────────
  const gerarPDF = useCallback(async () => {
    if (!historico.length || !alunoAtivo) return
    const avs = visibleAvNames ? historico.filter(a => visibleAvNames.has(a.name)) : historico
    if (!avs.length) return
    setPdfGenerating(true)
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      const W = doc.internal.pageSize.getWidth()
      const H = doc.internal.pageSize.getHeight()
      const RED = [133, 0, 0], BG = [255, 255, 255], SURFACE = [248, 248, 250]
      const BORDER = [226, 226, 232], TEXT = [20, 20, 26], MUTED = [110, 110, 120]
      const GREEN = [22, 163, 74], REDTXT = [185, 28, 28], LTRED = [254, 242, 242]
      const tableAvs = avs.slice(-10)
      const lat = avs[avs.length - 1]
      const fLabel = curFormula?.short || ''
      const formulasSel = FORMULAS.filter(f => selectedFormulas.has(f.key))

      const addPageBg = () => {
        doc.setFillColor(...BG); doc.rect(0, 0, W, H, 'F')
        doc.setFillColor(...RED); doc.rect(0, 0, W, 12, 'F')
        doc.setFillColor(245, 245, 248); doc.rect(0, 12, 6, H - 12, 'F')
      }
      const addHeader = (title) => {
        doc.setTextColor(255, 255, 255); doc.setFontSize(9); doc.setFont('helvetica', 'bold')
        doc.text('SHAPEFY  •  AVALIAÇÃO DE COMPOSIÇÃO CORPORAL', 10, 8)
        doc.setFontSize(8); doc.setFont('helvetica', 'normal')
        doc.text(title, W - 10, 8, { align: 'right' })
      }
      const addFooter = (pg, total) => {
        doc.setDrawColor(...BORDER); doc.setLineWidth(0.2); doc.line(10, H - 8, W - 10, H - 8)
        doc.setFontSize(7); doc.setTextColor(...MUTED)
        doc.text(`${alunoAtivo.nome_completo}  •  Gerado em ${new Date().toLocaleDateString('pt-BR')}`, 10, H - 4)
        doc.text(`${pg} / ${total}`, W - 10, H - 4, { align: 'right' })
      }

      // Página 1
      addPageBg(); addHeader(alunoAtivo.nome_completo || '')
      doc.setTextColor(...TEXT); doc.setFontSize(20); doc.setFont('helvetica', 'bold')
      doc.text(alunoAtivo.nome_completo || '', 10, 24)
      doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(...MUTED)
      doc.text(`${avs.length} avaliações  •  Última: ${fmtDate(lat?.date)}  •  Fórmula: ${fLabel}`, 10, 30)
      doc.setDrawColor(...RED); doc.setLineWidth(0.5); doc.line(10, 33, W - 10, 33)

      const cards = [
        { label: 'PESO ATUAL', key: 'weight', unit: 'kg', dec: 1 },
        { label: `%GORDURA (${fLabel})`, key: formulaKey, unit: '%', dec: 1 },
        { label: 'MASSA GORDA', key: 'fat_mass', unit: 'kg', dec: 2 },
      ]
      let cx = 10
      cards.forEach(card => {
        const val = lat?.[card.key]
        const delta = avs.length > 1 ? (val || 0) - (avs[0]?.[card.key] || 0) : null
        const isGood = delta < 0
        doc.setFillColor(...SURFACE); doc.setDrawColor(...BORDER); doc.setLineWidth(0.3)
        doc.roundedRect(cx, 36, 62, 26, 2, 2, 'FD')
        doc.setFontSize(6.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...MUTED)
        doc.text(card.label, cx + 4, 43)
        doc.setFontSize(17); doc.setFont('helvetica', 'bold'); doc.setTextColor(...TEXT)
        doc.text(val ? `${fmtNum(val, card.dec)} ${card.unit}` : '—', cx + 4, 53)
        if (delta != null && delta !== 0) {
          doc.setFontSize(8); doc.setFont('helvetica', 'bold')
          doc.setTextColor(...(isGood ? GREEN : REDTXT))
          doc.text(`${delta > 0 ? '+' : ''}${delta.toFixed(2)} ${card.unit}`, cx + 4, 59)
        }
        cx += 65
      })

      let chartImgData = null
      if (chartRef.current) {
        try {
          const canvas = await html2canvas(chartRef.current, { backgroundColor: '#ffffff', scale: 2, useCORS: true })
          chartImgData = canvas.toDataURL('image/png')
        } catch (e) { console.warn('Gráfico não capturado:', e) }
      }

      const mainRows = [
        { label: 'Peso (kg)', key: 'weight' },
        { label: `%Gordura (${fLabel})`, key: formulaKey },
        { label: 'Massa Gorda (kg)', key: 'fat_mass' },
        { label: 'Cintura (cm)', key: 'waist_circumference' },
        { label: 'Abdômen (cm)', key: 'abdomen_circumference' },
        { label: 'Quadril (cm)', key: 'hip_circumference' },
        { label: 'WHR', key: 'whr' },
      ].filter(r => tableAvs.some(a => (a[r.key] || 0) > 0))

      const tableLeft = chartImgData ? 148 : 10

      autoTable(doc, {
        startY: 66,
        head: [['Indicador', ...tableAvs.map(a => fmtDate(a.date))]],
        body: mainRows.map(r => [
          r.label,
          ...tableAvs.map((a, ci) => {
            const val = a[r.key]
            const prev = ci > 0 ? tableAvs[ci - 1][r.key] : null
            const d = prev && val ? val - prev : null
            return val ? `${fmtNum(val, 2)}${d && d !== 0 ? (d < 0 ? ' ↓' : ' ↑') : ''}` : '—'
          }),
        ]),
        theme: 'grid',
        styles: { fontSize: 7.5, textColor: TEXT, fillColor: BG, cellPadding: { top: 3, bottom: 3, left: 3, right: 2 }, lineColor: BORDER, lineWidth: 0.2 },
        headStyles: { fillColor: RED, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7, cellPadding: 3 },
        alternateRowStyles: { fillColor: SURFACE },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 36, textColor: TEXT } },
        margin: { left: tableLeft, right: 10 },
        didParseCell: (data) => {
          if (data.column.index === tableAvs.length && data.section !== 'head') {
            data.cell.styles.fontStyle = 'bold'
            data.cell.styles.fillColor = LTRED
            data.cell.styles.textColor = RED
          }
        },
      })

      if (chartImgData) {
        const imgH = (150 / W) * 90
        doc.addImage(chartImgData, 'PNG', 10, 66, 132, imgH)
      }

      // Página 2 — circunferências
      const circRows = [
        { label: 'Pescoço', key: 'neck_circumference' },
        { label: 'Ombros', key: 'shoulder_circumference' },
        { label: 'Peito/Tórax', key: 'chest_circumference' },
        { label: 'Cintura', key: 'waist_circumference' },
        { label: 'Abdômen', key: 'abdomen_circumference' },
        { label: 'Quadril', key: 'hip_circumference' },
        { label: 'Braço Esq. Rel.', key: 'left_arm_relaxed' },
        { label: 'Braço Esq. Cont.', key: 'left_arm_flexed' },
        { label: 'Braço Dir. Rel.', key: 'right_arm_relaxed' },
        { label: 'Braço Dir. Cont.', key: 'right_arm_flexed' },
        { label: 'Antebraço Esq.', key: 'left_forearm' },
        { label: 'Antebraço Dir.', key: 'right_forearm' },
        { label: 'Coxa Esq.', key: 'left_thigh' },
        { label: 'Coxa Dir.', key: 'right_thigh' },
        { label: 'Panturrilha Esq.', key: 'left_calf' },
        { label: 'Panturrilha Dir.', key: 'right_calf' },
      ].filter(r => tableAvs.some(a => (a[r.key] || 0) > 0))

      if (circRows.length) {
        doc.addPage(); addPageBg(); addHeader('Circunferências')
        doc.setTextColor(...TEXT); doc.setFontSize(15); doc.setFont('helvetica', 'bold')
        doc.text('CIRCUNFERÊNCIAS (cm)', 10, 22)
        doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(...MUTED)
        doc.text(alunoAtivo.nome_completo || '', 10, 28)
        doc.setDrawColor(...RED); doc.setLineWidth(0.4); doc.line(10, 31, W - 10, 31)
        autoTable(doc, {
          startY: 35,
          head: [['Medida', ...tableAvs.map(a => fmtDate(a.date))]],
          body: circRows.map(r => [
            r.label,
            ...tableAvs.map((a, ci) => {
              const val = a[r.key]
              const d = ci > 0 ? val - (tableAvs[ci - 1][r.key] || 0) : null
              const arrow = d != null && d !== 0 ? (d < 0 ? ' ↓' : ' ↑') : ''
              return val ? `${fmtNum(val, 2)}${arrow}` : '—'
            }),
          ]),
          theme: 'grid',
          styles: { fontSize: 7.5, textColor: TEXT, fillColor: BG, cellPadding: 2.5, lineColor: BORDER, lineWidth: 0.2 },
          headStyles: { fillColor: RED, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
          alternateRowStyles: { fillColor: SURFACE },
          columnStyles: { 0: { fontStyle: 'bold', cellWidth: 42, textColor: TEXT } },
          margin: { left: 10, right: 10 },
        })
      }

      // Página 3 — dobras
      const hasAnyDobras = tableAvs.some(hasDobras)
      if (hasAnyDobras) {
        doc.addPage(); addPageBg(); addHeader('Dobras Cutâneas')
        doc.setTextColor(...TEXT); doc.setFontSize(15); doc.setFont('helvetica', 'bold')
        doc.text('DOBRAS CUTÂNEAS (mm)', 10, 22)
        doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(...MUTED)
        doc.text(alunoAtivo.nome_completo || '', 10, 28)
        doc.setDrawColor(...RED); doc.setLineWidth(0.4); doc.line(10, 31, W - 10, 31)
        const skinfoldRows = [
          { label: 'Subescapular', key: 'skinfold_subscapular' },
          { label: 'Tríceps', key: 'skinfold_triceps' },
          { label: 'Axilar Média', key: 'skinfold_midaxillary' },
          { label: 'Suprailíaca', key: 'skinfold_suprailiac' },
          { label: 'Abdominal', key: 'skinfold_abdominal' },
          { label: 'Coxa', key: 'skinfold_thigh' },
          { label: 'Peitoral', key: 'skinfold_chest' },
        ].filter(r => tableAvs.some(a => (a[r.key] || 0) > 0))
        const separatorRow = [{ content: '% GORDURA POR FÓRMULA', colSpan: tableAvs.length + 1, styles: { fillColor: [240, 240, 245], fontStyle: 'bold', fontSize: 7, textColor: MUTED, cellPadding: { top: 4, bottom: 4, left: 3, right: 3 } } }]
        const formulaRowsPDF = formulasSel.map(f => [
          { content: `${f.short} — ${f.label}\n${f.desc}`, styles: { fontStyle: 'bold', fontSize: 7 } },
          ...tableAvs.map(a => a[f.key] ? fmtNum(a[f.key], 1) : '—'),
        ])
        autoTable(doc, {
          startY: 35,
          head: [['Dobra / Fórmula', ...tableAvs.map(a => fmtDate(a.date))]],
          body: [
            ...skinfoldRows.map(r => [r.label, ...tableAvs.map(a => a[r.key] > 0 ? fmtNum(a[r.key], 1) : '—')]),
            separatorRow,
            ...formulaRowsPDF,
          ],
          theme: 'grid',
          styles: { fontSize: 7.5, textColor: TEXT, fillColor: BG, cellPadding: 2.5, lineColor: BORDER, lineWidth: 0.2 },
          headStyles: { fillColor: RED, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
          alternateRowStyles: { fillColor: SURFACE },
          columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50, textColor: TEXT } },
          margin: { left: 10, right: 10 },
        })
      }

      const pageCount = doc.internal.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) { doc.setPage(i); addFooter(i, pageCount) }

      const nome = `avaliacao_${(alunoAtivo.nome_completo || 'aluno').replace(/\s+/g, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.pdf`
      doc.save(nome)
    } finally { setPdfGenerating(false); setShowPdfPreview(false) }
  }, [historico, visibleAvNames, alunoAtivo, formulaKey, selectedFormulas, curFormula])

  // ─── Seleção multi-linha ─────────────────────────────────────────────────────
  const toggleRow = (e, name) => {
    e.stopPropagation()
    setSelectedRows(prev => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })
  }

  const selectedArray = [...selectedRows]
  const firstSelected = filtered.find(av => av.name === selectedArray[0])

  // ════════════════════════════════════════════════════════════════════════════
  //  VIEW: LIST
  // ════════════════════════════════════════════════════════════════════════════
  if (view === 'list') {
    const columns = [
      {
        label: '',
        headerClass: 'w-10',
        cellClass: 'w-10',
        render: (row) => (
          <div onClick={e => toggleRow(e, row.name)} className="flex items-center justify-center">
            {selectedRows.has(row.name)
              ? <CheckSquare size={15} className="text-[#2563eb]" />
              : <Square size={15} className="text-gray-600 hover:text-gray-400" />}
          </div>
        ),
      },
      {
        label: 'Aluno',
        render: (row) => (
          <div className="min-w-0">
            <p className="text-white text-sm font-medium truncate">{row.nome_completo}</p>
            <p className="text-gray-600 text-[10px]">{fmtDate(row.date)}</p>
          </div>
        ),
      },
      {
        label: 'Peso',
        headerClass: 'hidden sm:table-cell w-24 text-center',
        cellClass: 'hidden sm:table-cell text-center',
        render: (row) => <span className="text-white text-xs font-medium">{fmtNum(row.weight, 1)} kg</span>,
      },
      {
        label: '%Gordura',
        headerClass: 'hidden sm:table-cell w-28 text-center',
        cellClass: 'hidden sm:table-cell text-center',
        render: (row) => (
          <span className="text-white text-xs">
            {row[formulaKey] ? `${fmtNum(row[formulaKey], 1)}%` : '—'}
          </span>
        ),
      },
      {
        label: 'Dobras',
        headerClass: 'hidden md:table-cell w-24 text-center',
        cellClass: 'hidden md:table-cell text-center',
        render: (row) => hasDobras(row)
          ? <Badge variant="success" size="sm">✓ Dobras</Badge>
          : <span className="text-gray-700 text-xs">—</span>,
      },
      {
        label: '',
        headerClass: 'w-10',
        cellClass: 'text-right',
        render: (row) => (
          <div onClick={e => e.stopPropagation()}>
            <button
              onClick={(e) => handleExcluir(e, row)}
              title="Excluir"
              className="h-7 w-7 flex items-center justify-center text-[#2563eb] hover:text-white border border-[#2563eb]/30 hover:bg-[#2563eb] rounded-lg transition-colors"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ),
      },
    ]

    return (
      <>
        <ListPage
          title="Avaliações Corporais"
          subtitle="Histórico de composição corporal dos alunos"
          actions={
            <>
              <button
                onClick={() => setOnlyDobras(v => !v)}
                title="Filtrar com dobras"
                className={`h-9 px-3 flex items-center gap-1.5 rounded-lg border text-xs font-bold transition-colors ${
                  onlyDobras
                    ? 'bg-[#2563eb] border-[#2563eb] text-white'
                    : 'bg-transparent border-[#323238] text-gray-400 hover:text-white'
                }`}
              >
                <Filter size={13} /> Dobras
              </button>
              <Button variant="secondary" size="sm" icon={RefreshCw} onClick={carregar} loading={loading} />
              <Button variant="primary" size="sm" icon={Plus} onClick={() => navigate('/avaliacoes/nova')}>
                Nova Avaliação
              </Button>
            </>
          }
          filters={[
            { type: 'search', value: busca, onChange: setBusca, placeholder: 'Buscar por aluno...' },
            { type: 'select', value: formulaKey, onChange: setFormulaKey, options: FORMULA_OPTS.slice(1) },
          ]}
          loading={loading}
          empty={filtered.length === 0 && !loading ? {
            title: 'Nenhuma avaliação encontrada',
            description: busca ? `Sem resultados para "${busca}"` : 'Clique em "Nova Avaliação" para cadastrar',
          } : null}
        >
          {!loading && filtered.length > 0 && (
            <DataTable
              columns={columns}
              rows={filtered}
              rowKey="name"
              onRowClick={(row) => abrirCompare(row)}
              page={page}
              pageSize={50}
              onPage={setPage}
              hasMore={hasMore}
            />
          )}
        </ListPage>

        {selectedRows.size >= 2 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
            <div className="flex items-center gap-3 bg-[#222226] border border-[#2563eb]/50 shadow-2xl rounded-lg px-5 py-3">
              <span className="text-white font-bold text-sm">{selectedRows.size} avaliações selecionadas</span>
              <button
                onClick={() => {
                  if (!firstSelected) return
                  const alunoIds = new Set(filtered.filter(av => selectedRows.has(av.name)).map(av => av.aluno))
                  if (alunoIds.size > 1) { alert('Selecione avaliações do mesmo aluno para comparar.'); return }
                  abrirCompare(firstSelected, new Set(selectedRows))
                }}
                className="flex items-center gap-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors"
              >
                <GitCompare size={15} /> Comparar ({selectedRows.size})
              </button>
              <button onClick={() => setSelectedRows(new Set())} className="text-gray-400 hover:text-white">
                <XIcon size={16} />
              </button>
            </div>
          </div>
        )}
      </>
    )
  }

  // ════════════════════════════════════════════════════════════════════════════
  //  VIEW: COMPARE
  // ════════════════════════════════════════════════════════════════════════════
  if (loadingHistorico) return (
    <div className="flex items-center justify-center py-20"><Spinner /></div>
  )

  const COMPARE_ROWS = [
    { label: 'Peso (kg)', key: 'weight', invert: false },
    { label: `%Gordura (${curFormula?.short})`, key: formulaKey, invert: false },
    { label: 'Massa Gorda (kg)', key: 'fat_mass', invert: false },
    { label: 'Massa Magra (kg)', key: 'lean_mass', invert: true },
    { label: 'IMC', key: 'bmi', invert: false },
    { label: 'Cintura (cm)', key: 'waist_circumference', invert: false },
    { label: 'Abdômen (cm)', key: 'abdomen_circumference', invert: false },
    { label: 'Quadril (cm)', key: 'hip_circumference', invert: false },
    { label: 'WHR', key: 'whr', invert: false },
  ]
  const CIRC_ROWS = [
    { label: 'Pescoço', key: 'neck_circumference' },
    { label: 'Ombros', key: 'shoulder_circumference' },
    { label: 'Peito/Tórax', key: 'chest_circumference' },
    { label: 'Cintura', key: 'waist_circumference' },
    { label: 'Abdômen', key: 'abdomen_circumference' },
    { label: 'Quadril', key: 'hip_circumference' },
    { label: 'Braço Esq. Rel.', key: 'left_arm_relaxed' },
    { label: 'Braço Esq. Cont.', key: 'left_arm_flexed' },
    { label: 'Braço Dir. Rel.', key: 'right_arm_relaxed' },
    { label: 'Braço Dir. Cont.', key: 'right_arm_flexed' },
    { label: 'Antebraço Esq.', key: 'left_forearm' },
    { label: 'Antebraço Dir.', key: 'right_forearm' },
    { label: 'Coxa Esq.', key: 'left_thigh' },
    { label: 'Coxa Dir.', key: 'right_thigh' },
    { label: 'Panturrilha Esq.', key: 'left_calf' },
    { label: 'Panturrilha Dir.', key: 'right_calf' },
    { label: 'Punho', key: 'wrist_circumference' },
    { label: 'Tornozelo', key: 'ankle_circumference' },
  ]
  const SKINFOLD_ROWS = [
    { label: 'Subescapular', key: 'skinfold_subscapular' },
    { label: 'Tríceps', key: 'skinfold_triceps' },
    { label: 'Axilar Média', key: 'skinfold_midaxillary' },
    { label: 'Suprailíaca', key: 'skinfold_suprailiac' },
    { label: 'Abdominal', key: 'skinfold_abdominal' },
    { label: 'Coxa', key: 'skinfold_thigh' },
    { label: 'Peitoral', key: 'skinfold_chest' },
  ]

  const ColHeader = ({ av }) => {
    const isVisible = !visibleAvNames || visibleAvNames.has(av.name)
    const isLast = av.name === historico[historico.length - 1]?.name
    return (
      <th
        className={`text-center text-[10px] font-bold uppercase px-4 py-3 min-w-[110px] cursor-pointer select-none transition-colors ${isVisible ? 'text-gray-400' : 'text-gray-700'}`}
        onClick={() => toggleAvColumn(av.name)}
        title={isVisible ? 'Clique para ocultar' : 'Clique para mostrar'}
      >
        <div className="flex flex-col items-center gap-1">
          <span className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isVisible ? 'border-[#2563eb] bg-[#2563eb]/20' : 'border-[#323238]'}`}>
            {isVisible && <Check size={10} className="text-[#2563eb]" />}
          </span>
          {fmtDate(av.date)}
          {isLast && <span className="text-[8px] text-[#2563eb] font-normal">ÚLTIMO</span>}
        </div>
      </th>
    )
  }

  const TableBase = ({ title, rows }) => {
    const visibleRows = rows.filter(r => historico.some(av => (av[r.key] || 0) > 0))
    if (!visibleRows.length) return null
    return (
      <div className="bg-[#222226] border border-[#323238] rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-[#323238] bg-[#1a1a1a]/40">
          <h3 className="font-bold text-white text-sm">{title}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#323238]/60">
                <th className="text-left text-[10px] font-bold text-gray-500 uppercase px-4 py-3 min-w-[160px]">Indicador</th>
                {historico.map(av => <ColHeader key={av.name} av={av} />)}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row, ri) => (
                <tr key={row.key} className={`border-b border-[#323238]/30 ${ri % 2 ? 'bg-[#1a1a1a]/20' : ''}`}>
                  <td className="px-4 py-2.5 text-gray-400 text-xs font-medium">{row.label}</td>
                  {historico.map((av) => {
                    const isVis = !visibleAvNames || visibleAvNames.has(av.name)
                    const val = av[row.key]
                    const visIdx = visibleAvs.findIndex(a => a.name === av.name)
                    const prevVis = visIdx > 0 ? visibleAvs[visIdx - 1] : null
                    const d = prevVis && val > 0 && prevVis[row.key] > 0 ? val - prevVis[row.key] : null
                    const isGood = row.invert ? d > 0 : d < 0
                    const isLast = av.name === latest?.name
                    return (
                      <td key={av.name} className={`px-4 py-2.5 text-center whitespace-nowrap transition-opacity ${!isVis ? 'opacity-20' : isLast ? 'font-bold text-white' : 'text-gray-400'}`}>
                        {val ? fmtNum(val, 2) : '—'}
                        {isVis && d != null && d !== 0 && (
                          <span className={`text-[9px] ml-1 ${isGood ? 'text-green-400' : 'text-red-400'}`}>
                            {d > 0 ? '↑' : '↓'}
                          </span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  const hasAnyDobras = historico.some(hasDobras)
  const hasAnyPhotos = historico.some(av => PHOTOS.some(p => av[p.key]))

  return (
    <div className="p-6 space-y-5 pb-12">
      {/* PDF Preview Modal — inline para não perder o ref entre renders */}
      {showPdfPreview && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Pré-visualização do PDF</h2>
                <p className="text-xs text-gray-500">{alunoAtivo?.nome_completo}</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={gerarPDF}
                  disabled={pdfGenerating}
                  className="flex items-center gap-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-5 py-2 rounded-lg font-bold text-sm transition-colors disabled:opacity-50"
                >
                  {pdfGenerating ? <><RefreshCw size={14} className="animate-spin" /> Gerando...</> : <><FileDown size={14} /> Baixar PDF</>}
                </button>
                <button onClick={() => setShowPdfPreview(false)} className="text-gray-400 hover:text-gray-700">
                  <XIcon size={20} />
                </button>
              </div>
            </div>
            <div className="p-6 bg-gray-50 space-y-5" ref={chartRef}>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Peso Atual', key: 'weight', unit: 'kg', dec: 1 },
                  { label: `%Gordura (${curFormula?.short})`, key: formulaKey, unit: '%', dec: 1 },
                  { label: 'Massa Gorda', key: 'fat_mass', unit: 'kg', dec: 2 },
                ].map(card => {
                  const dv = getDelta(card.key)
                  const isPos = dv > 0
                  return (
                    <div key={card.label} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{card.label}</div>
                      <div className="text-2xl font-bold text-gray-900">
                        {fmtNum(latest?.[card.key], card.dec)}
                        <span className="text-sm font-normal text-gray-400 ml-1">{latest?.[card.key] ? card.unit : ''}</span>
                      </div>
                      {dv != null && dv !== 0 && visibleAvs.length > 1 && (
                        <div className={`text-xs font-bold mt-1 ${!isPos ? 'text-green-600' : 'text-red-600'}`}>
                          {isPos ? '+' : ''}{dv.toFixed(2)} {card.unit}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              {visibleAvs.length > 1 && (
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { title: 'Peso Corporal (kg)', dataKey: 'Peso', color: '#2563eb' },
                    { title: `%Gordura (${curFormula?.short})`, dataKey: 'Gordura', color: '#1d4ed8' },
                  ].map(chart => (
                    <div key={chart.title} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                      <h4 className="text-[10px] font-bold text-gray-400 uppercase mb-3">{chart.title}</h4>
                      {/* largura fixa obrigatória para html2canvas capturar SVG corretamente */}
                      <LineChart width={380} height={150} data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#9ca3af' }} />
                        <YAxis tick={{ fontSize: 9, fill: '#9ca3af' }} domain={['auto', 'auto']} />
                        <Tooltip content={<ChartTip />} />
                        <Line type="monotone" dataKey={chart.dataKey} stroke={chart.color} strokeWidth={2} dot={{ fill: chart.color, r: 3 }} connectNulls />
                      </LineChart>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-[10px] text-gray-400 text-center">O PDF inclui também circunferências e dobras cutâneas completas.</p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-start gap-3">
        <button onClick={() => setView('list')} className="p-2 text-gray-400 hover:text-white hover:bg-[#323238] rounded-lg transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-white truncate">{alunoAtivo?.nome_completo}</h1>
          <p className="text-xs text-gray-500">
            {historico.length} avaliações
            {visibleAvNames && ` · ${visibleAvs.length} selecionadas`}
            {historico.length > 0 && ` · Última: ${fmtDate(historico[historico.length - 1]?.date)}`}
          </p>
        </div>

        {/* Fórmula principal */}
        <div className="flex flex-col gap-0.5 shrink-0">
          <select
            value={formulaKey}
            onChange={e => setFormulaKey(e.target.value)}
            className="px-3 py-1.5 bg-[#222226] border border-[#323238] text-white rounded-lg text-xs outline-none cursor-pointer"
          >
            {FORMULAS.map(f => <option key={f.key} value={f.key}>{f.short} — {f.label}</option>)}
          </select>
          <p className="text-[10px] text-[#2563eb] pr-1 text-right">{curFormula?.desc}</p>
        </div>

        {/* Dropdown fórmulas dobras */}
        <div className="relative shrink-0" ref={formulasDropRef}>
          <button
            onClick={() => setShowFormulasDrop(v => !v)}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#222226] border border-[#323238] text-white rounded-lg text-xs font-bold hover:bg-[#29292e] transition-colors"
          >
            <BarChart2 size={13} /> Dobras ({selectedFormulas.size}) <span className="text-gray-500">▾</span>
          </button>
          {showFormulasDrop && (
            <div className="absolute right-0 top-full mt-1 z-50 bg-[#222226] border border-[#323238] rounded-lg shadow-2xl w-72 p-3">
              <p className="text-[10px] font-bold text-gray-500 uppercase mb-2 tracking-wider">Fórmulas para exibir e exportar</p>
              <div className="space-y-1">
                {FORMULAS.map(f => {
                  const isSel = selectedFormulas.has(f.key)
                  return (
                    <button
                      key={f.key}
                      onClick={() => setSelectedFormulas(prev => {
                        const next = new Set(prev)
                        next.has(f.key) ? next.delete(f.key) : next.add(f.key)
                        if (next.size === 0) next.add(f.key)
                        return next
                      })}
                      className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${isSel ? 'bg-[#2563eb]/15 border border-[#2563eb]/30' : 'hover:bg-[#29292e] border border-transparent'}`}
                    >
                      <span className={`mt-0.5 w-4 h-4 rounded border shrink-0 flex items-center justify-center ${isSel ? 'bg-[#2563eb] border-[#2563eb]' : 'border-[#323238]'}`}>
                        {isSel && <Check size={10} className="text-white" />}
                      </span>
                      <div>
                        <div className={`text-xs font-bold ${isSel ? 'text-white' : 'text-gray-400'}`}>{f.short} — {f.label}</div>
                        <div className="text-[10px] text-gray-600 mt-0.5">{f.desc}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
              <div className="flex gap-2 mt-3 pt-3 border-t border-[#323238]">
                <button onClick={() => setSelectedFormulas(new Set(FORMULAS.map(f => f.key)))} className="flex-1 text-[10px] py-1.5 border border-[#323238] text-gray-500 hover:text-white rounded-lg">Marcar todas</button>
                <button onClick={() => setSelectedFormulas(new Set(['jp7_body_fat']))} className="flex-1 text-[10px] py-1.5 border border-[#323238] text-gray-500 hover:text-white rounded-lg">Só JP7</button>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => setVisibleAvNames(null)} className="text-[11px] text-gray-500 hover:text-white border border-[#323238] px-3 py-1.5 rounded-lg transition-colors">Todas</button>
          <button
            onClick={() => {
              const comDobras = new Set(historico.filter(hasDobras).map(a => a.name))
              setVisibleAvNames(comDobras.size > 0 ? comDobras : null)
            }}
            className="text-[11px] text-green-400 hover:text-green-300 border border-green-500/30 px-3 py-1.5 rounded-lg transition-colors"
          >
            Só Dobras
          </button>
          <button
            onClick={() => setVisibleAvNames(visibleAvNames?.size === 0 ? null : new Set())}
            className="text-[11px] text-gray-500 hover:text-white border border-[#323238] px-3 py-1.5 rounded-lg transition-colors"
          >
            {visibleAvNames?.size === 0 ? 'Restaurar' : 'Desmarcar'}
          </button>
        </div>

        <Button variant="secondary" size="sm" icon={FileDown} onClick={() => setShowPdfPreview(true)}>
          Exportar PDF
        </Button>
        <Button variant="primary" size="sm" icon={Plus} onClick={() => navigate('/avaliacoes/nova', { state: { aluno: alunoAtivo } })}>
          Nova Avaliação
        </Button>
      </div>

      <p className="text-[11px] text-gray-500 border border-[#323238]/50 bg-[#1a1a1a]/30 rounded-lg px-4 py-2">
        Clique no <strong className="text-white">checkbox das colunas</strong> para incluir ou excluir avaliações da comparação.
      </p>

      {/* Hero cards */}
      {latest && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Peso Atual', key: 'weight', unit: 'kg', dec: 1, invert: false },
            { label: `%Gordura (${curFormula?.short})`, key: formulaKey, unit: '%', dec: 1, invert: false },
            { label: 'Massa Magra', key: 'lean_mass', unit: 'kg', dec: 2, invert: true },
            { label: 'Massa Gorda', key: 'fat_mass', unit: 'kg', dec: 2, invert: false },
          ].map(card => {
            const d = getDelta(card.key)
            const isPos = d > 0
            const isGood = card.invert ? isPos : !isPos
            return (
              <div key={card.label} className="bg-[#222226] border border-[#323238] rounded-lg p-4">
                <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">{card.label}</div>
                <div className="text-2xl font-bold text-white leading-none">
                  {fmtNum(latest[card.key], card.dec)}
                  <span className="text-sm font-normal text-gray-500 ml-1">{latest[card.key] ? card.unit : ''}</span>
                </div>
                {d != null && d !== 0 && visibleAvs.length > 1 && (
                  <div className={`text-[11px] font-bold mt-1.5 ${isGood ? 'text-green-400' : 'text-red-400'}`}>
                    {isPos ? '+' : ''}{d.toFixed(2)} {card.unit} período
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Tabela histórico */}
      <TableBase title="Histórico Comparativo" rows={COMPARE_ROWS} />

      {/* Gráficos */}
      {visibleAvs.length > 1 && (
        <div className="grid md:grid-cols-2 gap-4">
          {[
            { title: 'Peso Corporal (kg)', dataKey: 'Peso', color: '#e74c3c' },
            { title: `%Gordura (${curFormula?.short})`, dataKey: 'Gordura', color: '#3b82f6' },
          ].map(chart => (
            <div key={chart.title} className="bg-[#222226] border border-[#323238] rounded-lg p-4">
              <h4 className="text-[10px] font-bold text-gray-500 uppercase mb-3 tracking-wider">{chart.title}</h4>
              <ResponsiveContainer width="100%" height={170}>
                <LineChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#323238" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#555' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#555' }} domain={['auto', 'auto']} />
                  <Tooltip content={<ChartTip />} />
                  <Line type="monotone" dataKey={chart.dataKey} stroke={chart.color} strokeWidth={2} dot={{ fill: chart.color, r: 3 }} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ))}
        </div>
      )}

      {/* Circunferências */}
      <TableBase title="Circunferências (cm)" rows={CIRC_ROWS} />

      {/* Dobras + fórmulas */}
      {hasAnyDobras && (
        <div className="bg-[#222226] border border-[#323238] rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-[#323238] bg-[#1a1a1a]/40">
            <h3 className="font-bold text-white text-sm">Dobras Cutâneas (mm) e %Gordura por Fórmula</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#323238]/60">
                  <th className="text-left text-[10px] font-bold text-gray-500 uppercase px-4 py-3 min-w-[160px]">Dobra / Fórmula</th>
                  {historico.map(av => <ColHeader key={av.name} av={av} />)}
                </tr>
              </thead>
              <tbody>
                {SKINFOLD_ROWS.map((row, ri) => {
                  if (!historico.some(av => av[row.key] > 0)) return null
                  return (
                    <tr key={row.key} className={`border-b border-[#323238]/30 ${ri % 2 ? 'bg-[#1a1a1a]/20' : ''}`}>
                      <td className="px-4 py-2.5 text-gray-400 text-xs font-medium">{row.label}</td>
                      {historico.map(av => {
                        const isVis = !visibleAvNames || visibleAvNames.has(av.name)
                        const val = av[row.key]
                        const visIdx = visibleAvs.findIndex(a => a.name === av.name)
                        const prevVis = visIdx > 0 ? visibleAvs[visIdx - 1] : null
                        const d = prevVis && val > 0 && prevVis[row.key] > 0 ? val - prevVis[row.key] : null
                        return (
                          <td key={av.name} className={`px-4 py-2.5 text-center whitespace-nowrap ${!isVis ? 'opacity-20' : av.name === latest?.name ? 'font-bold text-white' : 'text-gray-400'}`}>
                            {val > 0 ? fmtNum(val, 1) : '—'}
                            {isVis && d != null && d !== 0 && (
                              <span className={`text-[9px] ml-1 ${d < 0 ? 'text-green-400' : 'text-red-400'}`}>{d > 0 ? '↑' : '↓'}</span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
                {FORMULAS.filter(f => selectedFormulas.has(f.key)).map((f, fi) => (
                  <tr key={f.key} className={`border-b border-[#323238]/30 ${fi % 2 ? 'bg-[#2563eb]/5' : 'bg-[#2563eb]/10'}`}>
                    <td className="px-4 py-2.5">
                      <div className={`text-xs font-bold ${f.key === formulaKey ? 'text-[#2563eb]' : 'text-gray-400'}`}>
                        {f.short} — {f.label}
                        {f.key === formulaKey && <span className="ml-1 text-[9px]">◀ principal</span>}
                      </div>
                      <div className="text-[9px] text-gray-600 mt-0.5">{f.desc}</div>
                    </td>
                    {historico.map(av => {
                      const isVis = !visibleAvNames || visibleAvNames.has(av.name)
                      return (
                        <td key={av.name} className={`px-4 py-2.5 text-center whitespace-nowrap ${!isVis ? 'opacity-20' : av.name === latest?.name ? 'font-bold text-white' : 'text-gray-400'}`}>
                          {hasDobras(av) && av[f.key] ? `${fmtNum(av[f.key], 1)}%` : '—'}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Fotos */}
      {hasAnyPhotos && (
        <div className="bg-[#222226] border border-[#323238] rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-[#323238] bg-[#1a1a1a]/40">
            <h3 className="font-bold text-white text-sm">Fotos ({historico.length} avaliações)</h3>
          </div>
          <div className="p-4 space-y-6">
            {historico.map(av => {
              const fotosAv = PHOTOS.filter(p => av[p.key])
              if (!fotosAv.length) return null
              return (
                <div key={av.name}>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                    {fmtDate(av.date)}
                    {av.name === historico[historico.length - 1]?.name && (
                      <span className="ml-2 text-[#2563eb]">ÚLTIMO</span>
                    )}
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {fotosAv.map(p => (
                      <div key={p.key}>
                        <p className="text-[10px] text-gray-600 mb-1">{p.label}</p>
                        <ImagemInterativa
                          src={`${FRAPPE_URL}${av[p.key]}`}
                          feedbackId={av.name}
                          idx={p.key}
                          onRotate={() => {}}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
