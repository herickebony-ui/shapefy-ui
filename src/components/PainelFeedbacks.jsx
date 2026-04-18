import React, { useState, useEffect, useMemo, useRef } from 'react';
import { httpsCallable } from 'firebase/functions';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { functions, db, auth } from "../firebase";
import StudentNameWithBadge from "./StudentNameWithBadge";
import { listarDietas } from "./dietaService"; // <- ADICIONE ESTA LINHA
import {
  ChevronLeft, ChevronRight, Activity, Dumbbell, Salad, // <-- Adicionados aqui!
  Calendar, ArrowLeft, Search, User,
  CheckCircle, MessageSquare, FileText, ListChecks,
  Star, Eye, EyeOff, Filter, RefreshCw, File,
  StickyNote, Columns, X, Clock, Plus, Camera, Upload, Trash2
} from 'lucide-react';

const FRAPPE_URL = "https://shapefy.online";

// === CONSTANTES: FORMULÁRIO AVALIAÇÃO INICIAL ===
const FORM_AVALIACAO_ID = '0iqb3of5ud';
const PERGUNTAS_PRINCIPAIS_AVALIACAO = [
  { name: '0iqqf7anir', label: 'Foto de frente', reqd: true },
  { name: '0iq7e6oet2', label: 'Foto lado direito braço flexionado', reqd: true },
  { name: '0iqhvcecv9', label: 'Foto lado direito braço relaxado', reqd: false },
  { name: '0iqcpcpf7u', label: 'Costas', reqd: true },
  { name: '0iqcfi6bc1', label: 'Foto lado esquerdo braço flexionado', reqd: true },
  { name: '0iqok1sdpo', label: 'Foto lado esquerdo braço relaxado', reqd: false },
  { name: '0iq9g1rfi9', label: 'Outras fotos (opcional)', reqd: false },
  { name: '0iqoevub5h', label: 'Outras fotos 2 (opcional)', reqd: false },
];
const PERGUNTAS_POSTURAIS_AVALIACAO = [
  { name: '0iqrcot17a', label: 'Vista Posterior 7' },
  { name: '0iqs3ee3n5', label: 'Vista Posterior 8' },
  { name: '0iqivo1c8d', label: 'Vista Posterior 9' },
  { name: '0iqqlhftoh', label: 'Vista Posterior 10' },
  { name: '0iqhr2sklq', label: 'Vista posterior apoiado em uma perna 11' },
  { name: '0iq4qorioi', label: 'Vista posterior apoiado em uma perna 12' },
  { name: '0iq15vo40t', label: 'Tronco em flexão leve 13' },
  { name: '0iqjfp02j9', label: 'Tronco em flexão moderada 14' },
  { name: '0iqo9b8a4c', label: 'Tronco em flexão total 15' },
  { name: '0iq5ci4u0b', label: 'Agachado vista posterior 16' },
  { name: '0iq2gn8nle', label: 'Agachado vista lateral direita 17' },
  { name: '0iq6ti407h', label: 'Agachado vista lateral esquerda 18' },
  { name: '0iqcb7lj30', label: 'Ajoelhado vista lateral direita 19' },
  { name: '0iq8kaseu2', label: 'Ajoelhado vista lateral direita 20' },
  { name: '0iqc2h17i4', label: 'Ajoelhado vista lateral esquerda 21' },
  { name: '0iq8dva8n4', label: 'Sentar e alcançar 22' },
  { name: '0iq4qbj4ur', label: 'Sentada com máxima abdução de quadril 23' },
  { name: '0iq6sqbi6m', label: 'Vista lateral direita com máxima flexão de quadril 24' },
  { name: '0iqvqioh3d', label: 'Vista lateral esquerda com máxima flexão de quadril 25' },
  { name: '0iq2m9lqds', label: 'Vista lateral esquerda com quadril flexionado 26' },
  { name: '0iqctst17p', label: 'Vista lateral direita com quadril flexionado 27' },
  { name: '0iq7gjfp05', label: 'Vista lateral em decúbito ventral e joelhos flexionados 28' },
  { name: '0iq1l1vskl', label: 'Deitado em decúbito dorsal e joelhos flexionados 29' },
  { name: '0iql91f1qi', label: 'Deitado em decúbito dorsal e joelhos flexionados 30' },
];
const ITEMS_PER_PAGE = 20;

// === SUBCOMPONENTE: IMAGEM INTERATIVA (ESTILO CANVA) ===
const ImagemInterativa = ({ id, index, src, rotation90, onRotate90 }) => {
  // Chave única para salvar os ajustes dessa foto específica no navegador
  const storageKey = `shapefy_img_${id}_${index}`;

  // Tenta carregar os ajustes salvos na memória do navegador
  const savedSettings = useMemo(() => {
    try { return JSON.parse(localStorage.getItem(storageKey)); } catch { return null; }
  }, [storageKey]);

  const [scale, setScale] = useState(savedSettings?.scale || 1);
  const [pos, setPos] = useState(savedSettings?.pos || { x: 0, y: 0 });
  const [align, setAlign] = useState(savedSettings?.align || 0); // Rotação fina

  const [isDragging, setIsDragging] = useState(false);
  const [startDrag, setStartDrag] = useState({ x: 0, y: 0 });

  // Salva automaticamente no navegador sempre que você ajusta algo (com delay de 500ms para performance)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (scale !== 1 || pos.x !== 0 || pos.y !== 0 || align !== 0) {
        localStorage.setItem(storageKey, JSON.stringify({ scale, pos, align }));
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [scale, pos, align, storageKey]);

  // Controles do Mouse
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setStartDrag({ x: e.clientX - pos.x, y: e.clientY - pos.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPos({ x: e.clientX - startDrag.x, y: e.clientY - startDrag.y });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Limpar ajustes
  const resetarAjustes = () => {
    setScale(1);
    setPos({ x: 0, y: 0 });
    setAlign(0);
    localStorage.removeItem(storageKey);
  };

  return (
    <div className="flex flex-col items-center gap-0 w-full">
      {/* Controles */}
      <div className="flex flex-col w-full gap-3 px-1 bg-ebony-deep/40 p-3 rounded-lg border border-ebony-border/50">

        {/* Linha 1: Botão 90º e Reset */}
        <div className="flex items-center justify-between w-full">
          <button
            onClick={onRotate90}
            className="text-[10px] flex items-center gap-1 bg-ebony-surface px-3 py-1.5 rounded border border-ebony-border hover:border-ebony-primary text-white transition-all shrink-0 font-bold"
          >
            <RefreshCw size={10} /> Virar 90° ({rotation90}°)
          </button>

          {(scale !== 1 || pos.x !== 0 || pos.y !== 0 || align !== 0) && (
            <button
              onClick={resetarAjustes}
              className="text-[10px] text-red-400 hover:text-red-300 transition-colors bg-red-400/10 px-2 py-1.5 rounded font-bold"
            >
              Resetar
            </button>
          )}
        </div>

        {/* Linha 2: Sliders de Zoom e Alinhamento */}
        <div className="flex items-center gap-4 w-full">
          {/* Zoom Suave */}
          <div className="flex flex-col gap-1.5 flex-1">
            <span className="text-[9px] text-ebony-muted uppercase font-bold flex justify-between">
              Zoom <span>{scale.toFixed(2)}x</span>
            </span>
            <input
              type="range"
              min="0.5" max="3" step="0.01" // Step 0.01 garante a suavidade
              value={scale}
              onChange={(e) => setScale(parseFloat(e.target.value))}
              className="w-full accent-ebony-primary h-1 bg-ebony-border rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Alinhamento Fino */}
          <div className="flex flex-col gap-1.5 flex-1">
            <span className="text-[9px] text-ebony-muted uppercase font-bold flex justify-between">
              Alinhar <span>{align}°</span>
            </span>
            <input
              type="range"
              min="-45" max="45" step="0.5" // Permite girar milimetricamente
              value={align}
              onChange={(e) => setAlign(parseFloat(e.target.value))}
              className="w-full accent-blue-500 h-1 bg-ebony-border rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Container da Imagem */}
      <div
        className="overflow-hidden flex justify-center items-center bg-black/20 rounded-none p-0 h-[90vw] md:h-[400px] w-full relative group"
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <img
          src={src}
          alt="Feedback"
          draggable={false}
          className="max-h-full max-w-full rounded-lg object-contain"
          style={{
            // Aplica a rotação de 90 graus MAIS a rotação de alinhamento fino
            transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale}) rotate(${rotation90 + align}deg)`,
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
          }}
        />
        <div className="absolute inset-0 border-2 border-transparent group-hover:border-white/10 rounded-lg pointer-events-none transition-colors" />
      </div>
      <span className="text-[9px] text-ebony-muted text-center w-full">Clique e arraste para reposicionar a foto</span>
    </div>
  );
};


// === SUBCOMPONENTE: MODAL RAIO-X DO ALUNO ===
const ModalRaioX = ({ alunoNome, onClose }) => {
  const [dietas, setDietas] = useState([]);
  const [treinos, setTreinos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const carregarDados = async () => {
      setLoading(true);
      try {
        const fnBuscarFichas = httpsCallable(functions, "buscarFichas");

        // 🔥 O SEGREDO DA VELOCIDADE: Dispara as duas buscas SIMULTANEAMENTE
        const [resDietas, resTreinos] = await Promise.all([
          listarDietas({ aluno: alunoNome, limit: 10 }),
          fnBuscarFichas({ aluno: alunoNome, limit: 5 })
        ]);

        // --- Processa Dietas ---
        let ultimasDietas = [];
        if (resDietas && resDietas.list && resDietas.list.length > 0) {
          const dietasOrdenadas = resDietas.list.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
          const dataMaisRecente = dietasOrdenadas[0].date;
          ultimasDietas = dietasOrdenadas.filter(d => d.date === dataMaisRecente);
        }
        setDietas(ultimasDietas);

        // --- Processa Treinos ---
        let ultimosTreinos = [];
        if (resTreinos.data && resTreinos.data.list && resTreinos.data.list.length > 0) {
          const treinosOrdenados = resTreinos.data.list.sort((a, b) => new Date(b.data_de_inicio || 0) - new Date(a.data_de_inicio || 0));
          ultimosTreinos = [treinosOrdenados[0]];
        }
        setTreinos(ultimosTreinos);

      } catch (e) {
        console.error("Erro ao buscar raio-x", e);
      } finally {
        setLoading(false);
      }
    };
    carregarDados();
  }, [alunoNome]);

  const formatDate = (d) => {
    if (!d) return "—";
    const parts = String(d).split("-");
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return d;
  };

  const getStatusDieta = (d) => {
    const hoje = new Date().toISOString().split("T")[0];
    if (!d.date && !d.final_date) return { label: "RASCUNHO", cls: "bg-gray-500/10 text-gray-400 border-gray-500/20" };
    if (d.date && (!d.final_date || d.final_date >= hoje)) return { label: "ATIVA", cls: "bg-green-500/10 text-green-400 border-green-500/20" };
    return { label: "INATIVA", cls: "bg-red-500/10 text-red-400 border-red-500/20" };
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-ebony-surface border border-ebony-border rounded-2xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>

        {/* Header do Modal */}
        <div className="flex items-center justify-between p-5 border-b border-ebony-border shrink-0">
          <div>
            <h3 className="text-white font-black text-lg flex items-center gap-2">
              <Activity className="text-ebony-primary" size={20} /> Raio-X Rápido
            </h3>
            <p className="text-ebony-muted text-xs mt-1 font-medium">{alunoNome}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-ebony-deep rounded-full transition-colors text-ebony-muted hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* Corpo do Modal */}
        <div className="p-6 overflow-y-auto space-y-6">
          {loading ? (
            <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-ebony-primary"></div></div>
          ) : (
            <>
              {/* SESSÃO DIETAS */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-ebony-muted uppercase tracking-widest flex items-center gap-2">
                  <Salad size={14} className="text-orange-400" /> Últimas Dietas
                </h4>
                {dietas.length === 0 ? (
                  <div className="bg-ebony-deep border border-ebony-border rounded-xl p-5 text-center text-ebony-muted text-xs italic">Nenhuma dieta recente.</div>
                ) : (
                  dietas.map(d => {
                    const status = getStatusDieta(d);
                    return (
                      <div key={d.name} className="bg-ebony-deep border border-ebony-border rounded-xl p-4 flex flex-col gap-1 hover:border-ebony-border/80 transition-colors">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-white font-bold text-sm leading-tight">{d.strategy || "Dieta"}</p>
                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border tracking-wider shrink-0 ${status.cls}`}>{status.label}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-ebony-muted text-xs font-medium">{formatDate(d.date)} &rarr; {d.final_date ? formatDate(d.final_date) : "em aberto"}</span>
                          {d.total_calories && <span className="text-orange-400 text-xs font-bold">{d.total_calories} kcal</span>}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* SESSÃO TREINOS */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-ebony-muted uppercase tracking-widest flex items-center gap-2">
                  <Dumbbell size={14} className="text-blue-400" /> Último Treino
                </h4>
                {treinos.length === 0 ? (
                  <div className="bg-ebony-deep border border-ebony-border rounded-xl p-5 text-center text-ebony-muted text-xs italic">Nenhum treino recente.</div>
                ) : (
                  treinos.map(f => (
                    <div key={f.name} className="bg-ebony-deep border border-ebony-border rounded-xl p-4 flex flex-col gap-1 hover:border-ebony-border/80 transition-colors">
                      <p className="text-white font-bold text-sm leading-tight">{f.nome_completo || f.name}</p>
                      <div className="flex items-center gap-2 flex-wrap mt-1">
                        {f.objetivo && <span className="text-ebony-muted text-xs">{f.objetivo}</span>}
                        {f.nivel && <span className="text-ebony-muted text-xs">· {f.nivel}</span>}
                        {f.estrutura_calculada && <span className="text-blue-400 text-xs font-mono font-bold ml-1">{f.estrutura_calculada}</span>}
                      </div>
                      <span className="text-ebony-muted text-xs font-medium mt-1">{formatDate(f.data_de_inicio)} &rarr; {f.data_de_fim ? formatDate(f.data_de_fim) : "em aberto"}</span>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
export default function PainelFeedbacks() {
  // === ESTADOS ===
  const [view, setView] = useState('list'); // 'list' | 'detail' | 'compare'
  const [listaFeedbacks, setListaFeedbacks] = useState([]);
  const [feedbackSelecionado, setFeedbackSelecionado] = useState(null);
  const [detalhesCarregados, setDetalhesCarregados] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingDetalhe, setLoadingDetalhe] = useState(false);
  // NOVO: Estado para guardar as rotações vindas do backend
  const [rotations, setRotations] = useState({});
  const [datasResposta, setDatasResposta] = useState({});
  // === ESTADOS: DRAWER DE CICLOS + NOTAS ===
  const [drawerCiclosAberto, setDrawerCiclosAberto] = useState(false);
  const [notasAlunos, setNotasAlunos] = useState({}); // { [email]: { texto, feedbackId } }
  const [modalHistoricoData, setModalHistoricoData] = useState(null); // { nome, email, feedbackId, dataFormatada }
  const [salvandoNota, setSalvandoNota] = useState(false);
  const [abaDrawer, setAbaDrawer] = useState('atrasados');
  const [modalNotaSimples, setModalNotaSimples] = useState(null); // { nome, email, textoAtual }
  const [textoNotaSimples, setTextoNotaSimples] = useState('');
  const [notasPorCiclo, setNotasPorCiclo] = useState({}); // { [feedbackId]: texto }
  const [alunosComNota, setAlunosComNota] = useState({}); // { [nome_completo]: true }
  const [timelineMesclada, setTimelineMesclada] = useState([]); // itens mesclados do histórico
  const [notasDoHistorico, setNotasDoHistorico] = useState({}); // { [item.date]: texto }
  const [drawerDados, setDrawerDados] = useState({ atrasados: [], proximos: [], semCronograma: [] });
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [modalSemCronograma, setModalSemCronograma] = useState(false);
  const [buscaSemCronograma, setBuscaSemCronograma] = useState('');
  const [dadosFinanceiros, setDadosFinanceiros] = useState({}); // { [studentName]: { finPlanName, finDueDate, finStatus } }

  // Filtros
  const [filtroNome, setFiltroNome] = useState('');
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');

  // Filtro de formulário salvo (persiste no localStorage)
  const [formulariosSalvos, setFormulariosSalvos] = useState(() => {
    try { return JSON.parse(localStorage.getItem('feedbackFormulariosSalvos') || '[]'); } catch { return []; }
  });
  const [inputFormulario, setInputFormulario] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');

  // Paginação
  const [paginaAtual, setPaginaAtual] = useState(1);

  // Comparação
  const [modoComparar, setModoComparar] = useState(false);
  const [selecionadosComparar, setSelecionadosComparar] = useState([]);
  const [dadosComparacao, setDadosComparacao] = useState([]);
  const [loadingComparacao, setLoadingComparacao] = useState(false);

  // Status update no detalhe
  const [statusLocal, setStatusLocal] = useState('');
  const [salvandoStatus, setSalvandoStatus] = useState(false);
  const [modoTrocarFoto, setModoTrocarFoto] = useState(false);
  const [fotosSelecionadasTroca, setFotosSelecionadasTroca] = useState([]);
  const [salvandoTroca, setSalvandoTroca] = useState(false);
  const [modalRaioX, setModalRaioX] = useState(null);
  const [modalEnvio, setModalEnvio] = useState(false);
  const [listaEnvio, setListaEnvio] = useState([]);
  const [indexEnvio, setIndexEnvio] = useState(0);
  const [templateEnvio, setTemplateEnvio] = useState(null);
  const [loadingEnvio, setLoadingEnvio] = useState(false);
  const [phoneCache, setPhoneCache] = useState({}); // { studentId: phone }

  const scrollRef = useRef(null);
  const scrollPosRef = useRef(0);
  // === MODAL AVALIAÇÃO INICIAL ===
  const [modalAvaliacao, setModalAvaliacao] = useState(false);
  const [buscaAlunoModal, setBuscaAlunoModal] = useState('');
  const [resultadosAlunoModal, setResultadosAlunoModal] = useState([]);
  const [buscandoAlunoModal, setBuscandoAlunoModal] = useState(false);
  const [alunoSelecionadoModal, setAlunoSelecionadoModal] = useState(null);
  const [pesoModal, setPesoModal] = useState('');
  const [fotosModal, setFotosModal] = useState({});        // { [pergName]: {id, file, preview} }
  const [poolFotos, setPoolFotos] = useState([]);          // [{ id, file, preview }]
  const [slotPickerAberto, setSlotPickerAberto] = useState(null); // { name, label } do slot que abriu o picker
  const [salvandoAvaliacao, setSalvandoAvaliacao] = useState(false);
  const [progressoAvaliacao, setProgressoAvaliacao] = useState(0);
  const [expandirPostural, setExpandirPostural] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const handleArquivos = (files) => {
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    const novas = imageFiles.map(f => ({
      id: `${Date.now()}_${Math.random()}`,
      file: f,
      preview: URL.createObjectURL(f)
    }));
    setPoolFotos(prev => [...prev, ...novas]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDraggingOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleArquivos(Array.from(e.dataTransfer.files));
    }
  };

  // === FUNÇÃO DE VIRAR FOTO (CORRIGIDA PARA ID) ===
  const toggleRotation = async (id, idx) => {
    const key = `${id}_${idx}`; // Chave única: ID do Feedback + Índice da Pergunta
    const currentRotation = rotations[key] || 0;
    const newRotation = currentRotation + 90;

    // 1. Atualização Otimista
    setRotations(prev => ({ ...prev, [key]: newRotation }));

    // 2. Salva no Backend
    try {
      const salvar = httpsCallable(functions, 'salvarRotacao');
      await salvar({ id: id, index: idx, rotation: newRotation });
    } catch (error) {
      console.error("Erro ao salvar rotação", error);
    }
  };
  // === FUNÇÕES: NOTAS POR ALUNO ===
  const carregarNota = async (email) => {
    if (!email || notasAlunos[email] !== undefined) return;
    try {
      const ref = doc(db, "notas_alunos", email.toLowerCase());
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setNotasAlunos(prev => ({ ...prev, [email]: snap.data().texto || '' }));
      } else {
        setNotasAlunos(prev => ({ ...prev, [email]: '' }));
      }
    } catch (e) {
      console.error("Erro ao carregar nota:", e);
    }
  };

  const salvarNota = async (email, texto) => {
    if (!email) return;
    setSalvandoNota(true);
    try {
      const ref = doc(db, "notas_alunos", email.toLowerCase());
      await setDoc(ref, { texto, atualizadoEm: new Date().toISOString() }, { merge: true });
      setNotasAlunos(prev => ({ ...prev, [email]: texto }));
    } catch (e) {
      console.error("Erro ao salvar nota:", e);
      alert("Erro ao salvar nota.");
    } finally {
      setSalvandoNota(false);
    }
  };
  const todayISO = () => new Date().toISOString().slice(0, 10);

  const isFinancialActive = (s) => {
    if (!s) return false;
    if (!s.finStatus && !s.finDueDate) return true;
    const st = String(s?.finStatus || "").trim().toLowerCase();
    const due = String(s?.finDueDate || "").slice(0, 10);
    if (st !== "ativo") return false;
    if (!due) return false;
    return due >= todayISO();
  };

  const carregarDrawerCiclos = async () => {
    setDrawerLoading(true);
    try {
      const snapStudents = await getDocs(collection(db, "students"));

      const nomesAtivos = new Set(
        snapStudents.docs
          .filter(d => isFinancialActive(d.data()))
          .map(d => (d.data().name || "").trim().toLowerCase())
      );

      const now = new Date(); now.setHours(0, 0, 0, 0);
      const snap = await getDocs(collection(db, "feedback_schedules"));
      const nomesComSchedule = new Set(); // rastreia quem tem doc no feedback_schedules

      const atrasados = [];
      const proximos = [];
      const planejamento = [];
      const semCronograma = [];

      // Nomes de quem já tem feedback respondido/finalizado na lista
      const nomesComFeedback = new Set(listaFeedbacks.map(f => f.nome_completo));

      // DEPOIS:
      snap.forEach(docSnap => {
        const data = docSnap.data();
        const studentName = data.studentName || '';
        nomesComSchedule.add(studentName.trim().toLowerCase()); // registra quem tem doc
        const todasDatas = (data.dates || []).filter(d => d.type !== 'start');
        const pendentes = todasDatas.filter(d => d.status !== 'done');

        // Sem cronograma: tem feedback respondido mas não tem datas pendentes
        // Sem cronograma: tem feedback respondido mas não tem datas FUTURAS pendentes
        const datasFuturas = pendentes.filter(d => {
          const dDate = new Date(d.date + 'T00:00:00');
          dDate.setHours(0, 0, 0, 0);
          return dDate >= now;
        });

        if (datasFuturas.length === 0) {
          // ✅ Só entra se financeiramente ativo
          if (nomesAtivos.has(studentName.trim().toLowerCase())) {
            semCronograma.push({ studentName, studentId: docSnap.id });
          }
          return;
        }

        if (pendentes.length === 0) return;

       pendentes.forEach(d => {
        const dDate = new Date(d.date + 'T00:00:00');
        dDate.setHours(0, 0, 0, 0);
        const diffDays = (now - dDate) / (1000 * 60 * 60 * 24);

        if (diffDays > 0 && diffDays <= 14) {
          // Só adiciona se ainda não tem esse aluno com essa data
          const jaExiste = atrasados.some(a => a.studentName === studentName && a.date === d.date);
          if (!jaExiste) {
            atrasados.push({
              studentName,
              studentId: docSnap.id,
              date: d.date,
              type: d.type,
              diffDays: Math.round(diffDays)
            });
          }
        } else if (diffDays <= 0 && diffDays >= -7) {
          const jaExiste = proximos.some(p => p.studentName === studentName && p.date === d.date);
          if (!jaExiste) {
            proximos.push({
              studentName,
              studentId: docSnap.id,
              date: d.date,
              type: d.type,
              diffDays: Math.round(Math.abs(diffDays))
            });
          }
        }
      });

        // Planejamento: tem troca de treino pendente
        pendentes.forEach(d => {
          if (d.type === 'training') {
            const dTroca = new Date(d.date + 'T00:00:00');
            dTroca.setHours(0, 0, 0, 0);
            const diffTroca = (now - dTroca) / (1000 * 60 * 60 * 24);
            if (diffTroca >= -7) { // atrasada ou nos próximos 7 dias
              planejamento.push({
                studentName,
                studentId: docSnap.id,
                date: d.date,
                type: 'training',
                diffDays: Math.round(Math.abs(diffTroca))
              });
            }
          }
        });
      });

      // Remove duplicatas apenas
      snapStudents.docs.forEach(d => {
        const data = d.data();
        const nome = (data.name || "").trim();
        if (isFinancialActive(data) && !nomesComSchedule.has(nome.toLowerCase())) {
          semCronograma.push({ studentName: nome, studentId: d.id });
        }
      });

      const semCronogramaUnicos = [...new Map(semCronograma.map(s => [s.studentName, s])).values()];

      atrasados.sort((a, b) => b.diffDays - a.diffDays);
      proximos.sort((a, b) => a.diffDays - b.diffDays);
      // Remove duplicatas por aluno (mantém só a troca mais próxima de cada um)
      const planejamentoUnico = [...new Map(
        planejamento
          .sort((a, b) => a.date.localeCompare(b.date))
          .map(p => [p.studentName, p])
      ).values()].sort((a, b) => a.date.localeCompare(b.date));

      setDrawerDados({ atrasados, proximos, semCronograma: semCronogramaUnicos, planejamento: planejamentoUnico });
    } catch (e) {
      console.error("Erro ao carregar ciclos:", e);
    } finally {
      setDrawerLoading(false);
    }
  };
  // Gera chave de nota baseada em email + data prevista
  const gerarChaveNota = (email, date) => {
    const emailLimpo = (email || '').toLowerCase().replace(/[^a-z0-9]/g, '_');
    const dataLimpa = (date || '').slice(0, 10);
    return `${emailLimpo}__${dataLimpa}`;
  };

  // Busca nota dentro da janela de -4 a +7 dias da data do feedback
  const buscarNotaProxima = (email, dataFeedback) => {
    if (!email || !dataFeedback) return null;
    const dataRef = new Date(dataFeedback.slice(0, 10) + 'T00:00:00');
    const emailLimpo = (email || '').toLowerCase().replace(/[^a-z0-9]/g, '_');

    let melhorMatch = null;
    let menorDiff = Infinity;

    for (const [chave, texto] of Object.entries(notasPorCiclo)) {
      if (!chave.includes('__')) continue;
      if (!texto || !texto.trim()) continue;

      const partes = chave.split('__');
      if (partes[0] !== emailLimpo) continue;

      const dataNotaRef = new Date(partes[1] + 'T00:00:00');
      const diffDias = (dataRef - dataNotaRef) / (1000 * 60 * 60 * 24);

      // Janela: feedback enviado até 4 dias antes ou 7 dias depois da data prevista
      if (diffDias >= -7 && diffDias <= 4) {
        const distancia = Math.abs(diffDias);
        if (distancia < menorDiff) {
          menorDiff = distancia;
          melhorMatch = { chave, texto };
        }
      }
    }
    return melhorMatch;
  };
  const abrirHistorico = async (fb) => {
    setModalHistoricoData({
      nome: fb.nome_completo,
      email: fb.email || fb.nome_completo,
      feedbackId: fb.name,
      dataFormatada: fb.date ? new Date(fb.date + 'T00:00:00').toLocaleDateString('pt-BR') : '—',
      loading: true,
      scheduleItems: []
    });

    await carregarNota(fb.email || fb.nome_completo);

    // Busca datas do cronograma no Firebase
    try {
      const q = query(
        collection(db, "feedback_schedules"),
        where("studentName", "==", fb.nome_completo)
      );
      const snap = await getDocs(q);
      let scheduleItems = [];
      if (!snap.empty) {
        const data = snap.docs[0].data();
        scheduleItems = (data.dates || [])
          .filter(d => d.type !== 'start')
          .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
      }
      setTimelineMesclada(scheduleItems);
    } catch (e) {
      console.error("Erro ao buscar cronograma:", e);
    }

    setModalHistoricoData(prev => ({
      ...prev,
      loading: false
    }));
  };
  // === MODO ENVIO WHATSAPP ===
  const abrirModoEnvio = async (lista) => {
    if (!lista || lista.length === 0) return;
    setLoadingEnvio(true);
    try {
      // Carrega template
      const refT = doc(db, "settings", "feedback_reminder_template");
      const snapT = await getDoc(refT);
      const tmpl = snapT.exists() ? snapT.data() : {};
      setTemplateEnvio(tmpl);

      // Carrega phones em batch
      const ids = [...new Set(lista.map(i => i.studentId).filter(Boolean))];
      const novoCache = { ...phoneCache };
      await Promise.all(ids.map(async (id) => {
        if (novoCache[id]) return;
        try {
          const snapS = await getDoc(doc(db, "students", id));
          if (snapS.exists()) novoCache[id] = snapS.data().phone || '';
        } catch (_) {}
      }));
      setPhoneCache(novoCache);
      setListaEnvio(lista);
      setIndexEnvio(0);
      setModalEnvio(true);
    } catch (e) {
      console.error("Erro ao abrir modo envio:", e);
      alert("Erro ao carregar dados.");
    } finally {
      setLoadingEnvio(false);
    }
  };

  const gerarMensagemEnvio = (item) => {
    if (!templateEnvio) return '';
    const isTraining = item.type === 'training';
    const v1 = isTraining ? templateEnvio.smsTemplateTraining1 : templateEnvio.smsTemplateFeedback1;
    const v2 = isTraining ? templateEnvio.smsTemplateTraining2 : templateEnvio.smsTemplateFeedback2;
    const variacao = (v2 && v2.trim()) ? (Math.random() > 0.5 ? v1 : v2) : v1;
    const template = variacao || '';
    const data = item.date ? new Date(item.date + 'T12:00:00').toLocaleDateString('pt-BR') : '';
    const diaSemana = item.date ? new Date(item.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long' }) : '';
    const nome = item.studentName ? item.studentName.split(' ')[0] : '';
    return template
      .replace(/\{\{NOME\}\}/g, nome)
      .replace(/\{\{DATA\}\}/g, data)
      .replace(/\{\{DIA_SEMANA\}\}/g, diaSemana)
      .replace(/\{\{LINK\}\}/g, templateEnvio.link || 'https://shapefy.online');
  };

  const abrirWhatsApp = (item) => {
    const phone = phoneCache[item.studentId] || '';
    let clean = phone.replace(/\D/g, '');
    if (clean.length >= 10 && clean.length <= 11) clean = '55' + clean;
    const msg = gerarMensagemEnvio(item);
    const url = `https://wa.me/${clean}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const exportarListaTexto = (lista) => {
    const linhas = lista.map((item, i) => {
      const data = item.date ? new Date(item.date + 'T12:00:00').toLocaleDateString('pt-BR') : '';
      const tipo = item.type === 'training' ? '💪 Troca' : '📋 Feedback';
      return `${i + 1}. ${item.studentName} — ${data} ${tipo}`;
    });
    const texto = `📅 Lista de Lembretes — ${new Date().toLocaleDateString('pt-BR')}\n\n` + linhas.join('\n');
    navigator.clipboard.writeText(texto).then(() => alert('Lista copiada!')).catch(() => alert(texto));
  };

  // === HELPERS ===
  const normalizeText = (text) => {
    if (!text) return '';
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  };

  const fileToBase64 = (file) => new Promise((res, rej) => {
    // Comprime a imagem antes de converter para base64
    const canvas = document.createElement('canvas');
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 1200;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        if (width > height) { height = Math.round(height * MAX / width); width = MAX; }
        else { width = Math.round(width * MAX / height); height = MAX; }
      }
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      const base64 = canvas.toDataURL('image/jpeg', 0.82).split(',')[1];
      res(base64);
    };
    img.onerror = rej;
    img.src = url;
  });

  const salvarAvaliacaoInicial = async () => {
    if (!alunoSelecionadoModal) { alert('Selecione um aluno.'); return; }
    if (!pesoModal.trim()) { alert('Informe o peso.'); return; }
    const obrigatorias = ['0iqqf7anir', '0iq7e6oet2', '0iqcpcpf7u', '0iqcfi6bc1'];
    if (obrigatorias.some(n => !fotosModal[n])) { alert('Adicione todas as fotos obrigatórias (*).'); return; }

    setSalvandoAvaliacao(true);
    setProgressoAvaliacao(0);

    try {
      const uploadFn = httpsCallable(functions, 'uploadArquivoFrappe');
      const criarFn = httpsCallable(functions, 'criarAvaliacaoInicial');

      const fotoEntries = Object.entries(fotosModal);
      const fotoPaths = {};

      let concluidos = 0;
      await Promise.all(fotoEntries.map(async ([pergName, item]) => {
        const file = item.file;
        const base64 = await fileToBase64(file);
        const ext = file.name.split('.').pop() || 'jpg';
        const result = await uploadFn({
          base64,
          filename: `av_ini_${alunoSelecionadoModal.name}_${pergName}.${ext}`,
          mimeType: file.type
        });
        fotoPaths[pergName] = result.data.filePath;
        concluidos++;
        setProgressoAvaliacao(Math.round((concluidos / fotoEntries.length) * 85));
      }));

      await criarFn({
        alunoId: alunoSelecionadoModal.name,
        nomeCompleto: alunoSelecionadoModal.nome_completo,
        email: alunoSelecionadoModal.email || '',
        peso: pesoModal,
        fotoPaths
      });

      setProgressoAvaliacao(100);
      setTimeout(() => {
        setModalAvaliacao(false);
        setAlunoSelecionadoModal(null);
        setBuscaAlunoModal('');
        setPesoModal('');
        setFotosModal({});
        setPoolFotos([]);
        setProgressoAvaliacao(0);
        setExpandirPostural(false);
        carregarLista();
      }, 600);

    } catch (err) {
      console.error('Erro ao criar avaliação:', err);
      alert('Erro: ' + err.message);
      setSalvandoAvaliacao(false);
      setProgressoAvaliacao(0);
    }
  };

  const formatDateTime = (dt) => {
    if (!dt) return '—';
    try {
      const d = new Date(dt.replace(' ', 'T'));
      return d.toLocaleDateString('pt-BR') + ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch { return dt; }
  };

  const toggleComparar = (fb, e) => {
    e.stopPropagation();
    setSelecionadosComparar(prev => {
      const jaSelecionado = prev.find(f => f.name === fb.name);
      const novoArray = jaSelecionado
        ? prev.filter(f => f.name !== fb.name)
        : [...prev, fb];

      // UX: Se tiver itens selecionados, ativa o modo comparar automaticamente
      if (novoArray.length > 0) setModoComparar(true);

      return novoArray;
    });
  };

  const compararUltimos3 = async (fb, e) => {
    e.stopPropagation();
    const doMesmoAluno = listaFeedbacks
      .filter(f => f.nome_completo === fb.nome_completo)
      .sort((a, b) => (b.modified || b.date || '').localeCompare(a.modified || a.date || ''))
      .slice(0, 3);

    if (doMesmoAluno.length < 2) {
      alert('Este aluno tem menos de 2 feedbacks para comparar.');
      return;
    }

    setSelecionadosComparar(doMesmoAluno);
    setLoadingComparacao(true);
    setView('compare');

    try {
      const buscar = httpsCallable(functions, 'buscarFeedbacks');
      const promises = doMesmoAluno.map(f => buscar({ id: f.name }));
      const results = await Promise.all(promises);
      const dados = results.map(r => r.data.data).filter(Boolean);
      dados.sort((a, b) => {
        const isAvalA = a.formulario === FORM_AVALIACAO_ID;
        const isAvalB = b.formulario === FORM_AVALIACAO_ID;
        if (isAvalA && !isAvalB) return -1; // Avaliação Inicial sempre primeiro
        if (!isAvalA && isAvalB) return 1;
        return (a.modified || a.date || '').localeCompare(b.modified || b.date || '');
      });

      const rotsBatch = {};
      dados.forEach(d => {
        const rots = d.rotations || {};
        Object.keys(rots).forEach(k => { rotsBatch[`${d.name}_${k}`] = rots[k]; });
      });
      setRotations(prev => ({ ...prev, ...rotsBatch }));
      setDadosComparacao(dados);
    } catch (error) {
      console.error("Erro na comparação rápida:", error);
      alert("Erro ao carregar feedbacks para comparação.");
      setView('list');
    } finally {
      setLoadingComparacao(false);
    }
  };

  // === FORMULÁRIOS SALVOS ===
  const adicionarFormulario = async () => {
    const val = inputFormulario.trim();
    if (!val || formulariosSalvos.includes(val)) return;

    const updated = [...formulariosSalvos, val];
    setFormulariosSalvos(updated);
    localStorage.setItem('feedbackFormulariosSalvos', JSON.stringify(updated));
    setInputFormulario('');

    try {
      const user = auth.currentUser;
      if (!user) return;
      const ref = doc(db, "users", user.uid, "settings", "painel_feedbacks");
      await setDoc(ref, { formulariosSalvos: updated }, { merge: true });
    } catch (e) {
      console.error("Erro ao salvar formulariosSalvos no Firestore:", e);
    }
  };


  const removerFormulario = async (id) => {
    const updated = formulariosSalvos.filter(f => f !== id);
    setFormulariosSalvos(updated);
    localStorage.setItem('feedbackFormulariosSalvos', JSON.stringify(updated));

    try {
      const user = auth.currentUser;
      if (!user) return;
      const ref = doc(db, "users", user.uid, "settings", "painel_feedbacks");
      await setDoc(ref, { formulariosSalvos: updated }, { merge: true });
    } catch (e) {
      console.error("Erro ao salvar formulariosSalvos no Firestore:", e);
    }
  };


  // === CARREGAR FORMULÁRIOS FIXADOS DO FIRESTORE (PERSISTE MESMO SEM CACHE) ===
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      try {
        if (!user) return;

        const ref = doc(db, "users", user.uid, "settings", "painel_feedbacks");
        const snap = await getDoc(ref);

        if (snap.exists()) {
          const data = snap.data() || {};
          if (Array.isArray(data.formulariosSalvos)) {
            setFormulariosSalvos(data.formulariosSalvos);
          }
        }
      } catch (e) {
        console.error("Erro ao carregar formulariosSalvos do Firestore:", e);
      }
    });

    return () => unsub();
  }, []);

  // === BUSCA DE ALUNO NO MODAL ===
  useEffect(() => {
    if (!modalAvaliacao || buscaAlunoModal.length < 2) {
      setResultadosAlunoModal([]);
      return;
    }
    const timer = setTimeout(async () => {
      setBuscandoAlunoModal(true);
      try {
        const buscar = httpsCallable(functions, 'listarAlunos');
        const resp = await buscar({ search: buscaAlunoModal, limit: 10 });
        setResultadosAlunoModal(resp.data.list || resp.data.alunos || resp.data.data || []);
      } catch (e) {
        console.error('Erro busca aluno modal:', e);
      } finally {
        setBuscandoAlunoModal(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [buscaAlunoModal, modalAvaliacao]);

  // === CARREGAR LISTA ===
  useEffect(() => {
    carregarLista();
    carregarDrawerCiclos();
  }, []);

  // === CARREGAR LISTA (ORDEM PADRÃO: DECRESCENTE) ===
  const carregarLista = async () => {
    setLoading(true);
    try {
      const buscar = httpsCallable(functions, 'buscarFeedbacks');
      const resp = await buscar({});
      if (resp.data.success) {
        const ordenada = resp.data.list.sort((a, b) => {
          const timeA = a.modified || a.creation || a.date || "";
          const timeB = b.modified || b.creation || b.date || "";
          return timeB.localeCompare(timeA);
        });
        setListaFeedbacks(ordenada);

        // Carrega em batch as datas congeladas do Firestore
        const ids = ordenada.map(f => f.name);
        const batchDatas = {};
        await Promise.all(ids.map(async (id) => {
          try {
            const refData = doc(db, "feedbacks_respondidos_em", id);
            const snapData = await getDoc(refData);
            if (snapData.exists()) {
              batchDatas[id] = snapData.data().data;
            }
          } catch (_) { }
        }));
        setDatasResposta(prev => ({ ...prev, ...batchDatas }));
      }
    } catch (error) {
      console.error("Erro ao buscar feedbacks", error);
    } finally {
      setLoading(false);
    }
  };

  // === FILTRO + PAGINAÇÃO ===
  const feedbacksFiltrados = useMemo(() => {
    return listaFeedbacks.filter(f => {
      const nomeOk = normalizeText(f.nome_completo).includes(normalizeText(filtroNome));
      const formularioOk = formulariosSalvos.length === 0 || formulariosSalvos.includes(f.formulario);
      const dataFeedback = f.date || '';
      const dataInicioOk = !filtroDataInicio || dataFeedback >= filtroDataInicio;
      const dataFimOk = !filtroDataFim || dataFeedback <= filtroDataFim;
      const statusOk = filtroNome.trim() !== '' || (filtroStatus ? f.status === filtroStatus : true);
      return nomeOk && formularioOk && dataInicioOk && dataFimOk && statusOk;
    }).sort((a, b) => {
      const isAvalA = a.formulario === FORM_AVALIACAO_ID;
      const isAvalB = b.formulario === FORM_AVALIACAO_ID;
      if (isAvalA && !isAvalB) return 1;
      if (!isAvalA && isAvalB) return -1;
      // Usa data congelada se disponível, senão cai pro modified do Frappe
      const timeA = datasResposta[a.name] || a.modified || a.date || '';
      const timeB = datasResposta[b.name] || b.modified || b.date || '';
      return timeB.localeCompare(timeA);
    });
  }, [listaFeedbacks, filtroNome, formulariosSalvos, filtroDataInicio, filtroDataFim, filtroStatus, datasResposta]);

  const feedbacksPaginados = useMemo(() => {
    return feedbacksFiltrados.slice(0, paginaAtual * ITEMS_PER_PAGE);
  }, [feedbacksFiltrados, paginaAtual]);

  const temMais = feedbacksPaginados.length < feedbacksFiltrados.length;
  // Pré-computa qual fb.name recebe qual nota (1:1 — cada nota vai pro feedback mais próximo)
  const notasVinculadas = useMemo(() => {
    const vinculo = {};

    // Para cada nota salva (chave = email__dataPrevista)
    for (const [chave, texto] of Object.entries(notasPorCiclo)) {
      if (!chave.includes('__') || !texto || !texto.trim()) continue;
      const [emailChave, dataPrevista] = chave.split('__');
      const dataPrevistaMs = new Date(dataPrevista + 'T00:00:00').getTime();

      // Busca o feedback cujo datasResposta cai dentro de ±7 dias da data prevista
      let melhorFb = null;
      let menorDiff = Infinity;

      for (const fb of feedbacksFiltrados) {
        const emailFb = (fb.email || fb.nome_completo || '').toLowerCase().replace(/[^a-z0-9]/g, '_');
        if (emailFb !== emailChave) continue;

        const dataRespostaRaw = datasResposta[fb.name] || fb.date || '';
        if (!dataRespostaRaw) continue;

        const dataRespostaMs = new Date(dataRespostaRaw.slice(0, 10) + 'T00:00:00').getTime();
        const diffDias = Math.abs((dataRespostaMs - dataPrevistaMs) / (1000 * 60 * 60 * 24));

        if (diffDias <= 7 && diffDias < menorDiff) {
          menorDiff = diffDias;
          melhorFb = fb;
        }
      }

      if (melhorFb && (!vinculo[melhorFb.name] || menorDiff < vinculo[melhorFb.name].distancia)) {
        vinculo[melhorFb.name] = { chave, texto, distancia: menorDiff };
      }
    }

    return vinculo;
  }, [notasPorCiclo, feedbacksFiltrados, datasResposta]);
  // Reset página ao mudar filtro
  useEffect(() => { setPaginaAtual(1); }, [filtroNome, formulariosSalvos, filtroDataInicio, filtroDataFim]);

  // === CARREGAR NOTAS DOS CICLOS VISÍVEIS (notas_ciclos + feedback_schedules) ===
  useEffect(() => {
    if (feedbacksPaginados.length === 0) return;
    const carregar = async () => {
      const novasNotas = {};

      // 1. Carrega de notas_ciclos (novo sistema)
      await Promise.all(feedbacksPaginados.map(async (fb) => {
        const email = fb.email || fb.nome_completo;
        const chave = gerarChaveNota(email, fb.date);
        if (notasPorCiclo[chave] !== undefined) return;
        try {
          const ref = doc(db, "notas_ciclos", chave);
          const snap = await getDoc(ref);
          novasNotas[chave] = snap.exists() ? snap.data().texto || '' : '';
        } catch (e) { }
      }));

      // 2. Carrega de feedback_schedules (sistema antigo)
      // Agrupa feedbacks por studentName para evitar queries duplicadas
      const nomesPendentes = [...new Set(
        feedbacksPaginados
          .filter(fb => {
            const email = fb.email || fb.nome_completo;
            const chave = gerarChaveNota(email, fb.date);
            return !notasPorCiclo[chave] && !novasNotas[chave];
          })
          .map(fb => fb.nome_completo)
      )];

      await Promise.all(nomesPendentes.map(async (nome) => {
        try {
          const q = query(collection(db, "feedback_schedules"), where("studentName", "==", nome));
          const snap = await getDocs(q);
          if (snap.empty) return;

          const data = snap.docs[0].data();
          const dates = data.dates || [];

          dates.forEach(d => {
            if (!d.note || !d.note.trim()) return;
            // Busca o email do aluno nos feedbacks
            const fbDoAluno = feedbacksPaginados.find(f => f.nome_completo === nome);
            const email = fbDoAluno?.email || nome;
            const chave = gerarChaveNota(email, d.date);
            // Só sobrescreve se ainda não tem nota no novo sistema
            if (!novasNotas[chave] || !novasNotas[chave].trim()) {
              novasNotas[chave] = d.note;
            }
          });
        } catch (e) { }
      }));

      if (Object.keys(novasNotas).length > 0) {
        setNotasPorCiclo(prev => ({ ...prev, ...novasNotas }));
      }
    };
    carregar();
  }, [feedbacksPaginados]);

  // === ABRIR FEEDBACK (CARREGAR ROTAÇÃO COM ID) ===
  const abrirFeedback = async (feedbackBase, manterScroll = false) => {
    setFeedbackSelecionado(feedbackBase);
    setView('detail');
    setStatusLocal(feedbackBase.status || 'Respondido');

    if (!manterScroll) {
      setLoadingDetalhe(true);
      setDetalhesCarregados(null);
      scrollPosRef.current = 0;
    }

    try {
      const buscar = httpsCallable(functions, 'buscarFeedbacks');
      const resp = await buscar({ id: feedbackBase.name });
      if (resp.data.success) {
        setDetalhesCarregados(resp.data.data);
        setStatusLocal(resp.data.data.status || 'Respondido');

        // NOVO: Mapeia rotações para o formato "ID_Index"
        const rotsVindas = resp.data.data.rotations || {};
        const rotsFormatadas = {};
        Object.keys(rotsVindas).forEach(k => {
          rotsFormatadas[`${resp.data.data.name}_${k}`] = rotsVindas[k];
        });
        setRotations(prev => ({ ...prev, ...rotsFormatadas }));
        // Congela a data de resposta no Firestore se ainda não foi salva
        try {
          const refData = doc(db, "feedbacks_respondidos_em", resp.data.data.name);
          const snapData = await getDoc(refData);
          if (!snapData.exists()) {
            await setDoc(refData, { data: resp.data.data.modified });
          }
          const dataCongelada = snapData.exists() ? snapData.data().data : resp.data.data.modified;
          setDatasResposta(prev => ({ ...prev, [resp.data.data.name]: dataCongelada }));
        } catch (e) {
          console.error("Erro ao congelar data de resposta:", e);
        }
      }
    } catch (error) {
      console.error("Erro ao detalhar", error);
    } finally {
      setLoadingDetalhe(false);
      if (manterScroll) {
        setTimeout(() => {
          if (scrollRef.current) scrollRef.current.scrollTop = scrollPosRef.current;
        }, 150);
      }
    }
  };

  // === NAVEGAR ENTRE FEEDBACKS ===
  const navegar = (direcao) => {
    if (!feedbackSelecionado) return;
    const indexAtual = feedbacksFiltrados.findIndex(f => f.name === feedbackSelecionado.name);
    if (indexAtual === -1) return;
    const novoIndex = indexAtual + direcao;
    if (novoIndex >= 0 && novoIndex < feedbacksFiltrados.length) {
      if (scrollRef.current) scrollPosRef.current = scrollRef.current.scrollTop;
      abrirFeedback(feedbacksFiltrados[novoIndex], true);
    }
  };

  const selecionarFotoParaTroca = (feedbackId, idx) => {
    const key = `${feedbackId}_${idx}`;
    setFotosSelecionadasTroca(prev => {
      const jaExiste = prev.find(f => f.key === key);
      if (jaExiste) return prev.filter(f => f.key !== key);
      if (prev.length >= 2) return prev;
      return [...prev, { key, feedbackId, idx }];
    });
  };

  const confirmarTrocaFotos = async () => {
    const [f1, f2] = fotosSelecionadasTroca;
    if (!f1 || !f2) return;
    if (f1.feedbackId !== f2.feedbackId) {
      alert('Só é possível trocar fotos dentro do mesmo feedback.');
      return;
    }

    setSalvandoTroca(true);

    // Atualização otimista — detalhe
    if (detalhesCarregados) {
      const novas = [...detalhesCarregados.perguntas_e_respostas];
      const url1 = novas[f1.idx]?.resposta;
      const url2 = novas[f2.idx]?.resposta;
      novas[f1.idx] = { ...novas[f1.idx], resposta: url2 };
      novas[f2.idx] = { ...novas[f2.idx], resposta: url1 };
      setDetalhesCarregados({ ...detalhesCarregados, perguntas_e_respostas: novas });
    }

    // Atualização otimista — comparação
    setDadosComparacao(prev => prev.map(fb => {
      if (fb.name !== f1.feedbackId) return fb;
      const novas = [...fb.perguntas_e_respostas];
      const url1 = novas[f1.idx]?.resposta;
      const url2 = novas[f2.idx]?.resposta;
      novas[f1.idx] = { ...novas[f1.idx], resposta: url2 };
      novas[f2.idx] = { ...novas[f2.idx], resposta: url1 };
      return { ...fb, perguntas_e_respostas: novas };
    }));

    setFotosSelecionadasTroca([]);
    setModoTrocarFoto(false);

    try {
      const trocar = httpsCallable(functions, 'trocarFotosFeedback');
      await trocar({ id: f1.feedbackId, index1: f1.idx, index2: f2.idx });
    } catch (err) {
      console.error('Erro ao trocar fotos:', err);
      alert('Erro ao salvar a troca no servidor.');
    } finally {
      setSalvandoTroca(false);
    }
  };
  // === SALVAR STATUS NO FRAPPE ===
  const salvarStatus = async (novoStatus) => {
    if (!feedbackSelecionado) return;
    setSalvandoStatus(true);
    try {
      const atualizar = httpsCallable(functions, 'atualizarStatusFeedback');
      await atualizar({ id: feedbackSelecionado.name, status: novoStatus });
      setStatusLocal(novoStatus);
      setListaFeedbacks(prev => prev.map(f =>
        f.name === feedbackSelecionado.name ? { ...f, status: novoStatus } : f
      ));

      // Congela a data ANTES do Frappe sujar o modified
      try {
        const refData = doc(db, "feedbacks_respondidos_em", feedbackSelecionado.name);
        const snapData = await getDoc(refData);
        if (!snapData.exists()) {
          const dataAtual = detalhesCarregados?.modified || feedbackSelecionado.modified;
          await setDoc(refData, { data: dataAtual });
          setDatasResposta(prev => ({ ...prev, [feedbackSelecionado.name]: dataAtual }));
        }
      } catch (e) {
        console.error("Erro ao congelar data:", e);
      }

    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      alert("Erro ao salvar status no Frappe.");
    } finally {
      setSalvandoStatus(false);
    }
  };

  // === COMPARAR (CARREGAR ROTAÇÕES DE TODOS) ===
  const iniciarComparacao = async () => {
    if (selecionadosComparar.length < 2) return; // Botão já controla isso, mas por segurança
    setLoadingComparacao(true);
    setView('compare');
    try {
      const buscar = httpsCallable(functions, 'buscarFeedbacks');
      const promises = selecionadosComparar.map(fb => buscar({ id: fb.name }));
      const results = await Promise.all(promises);

      const dados = results.map(r => r.data.data).filter(Boolean);
      dados.sort((a, b) => {
        const isAvalA = a.formulario === FORM_AVALIACAO_ID;
        const isAvalB = b.formulario === FORM_AVALIACAO_ID;
        if (isAvalA && !isAvalB) return -1; // Avaliação Inicial sempre primeiro
        if (!isAvalA && isAvalB) return 1;
        return (a.modified || a.date || '').localeCompare(b.modified || b.date || '');
      });

      // Carrega rotações de TODOS os feedbacks da comparação
      const rotsBatch = {};
      dados.forEach(d => {
        const rots = d.rotations || {};
        Object.keys(rots).forEach(k => {
          rotsBatch[`${d.name}_${k}`] = rots[k];
        });
      });
      setRotations(prev => ({ ...prev, ...rotsBatch })); // Funde com o estado atual

      setDadosComparacao(dados);
    } catch (error) {
      console.error("Erro na comparação:", error);
      alert("Erro ao carregar feedbacks para comparação.");
      setView('list');
    } finally {
      setLoadingComparacao(false);
    }
  };

  // ================================================================
  // VIEW: COMPARAÇÃO
  // ================================================================
  if (view === 'compare') {
    const base = dadosComparacao[0]?.perguntas_e_respostas || [];

    return (
      <div className="w-full h-full flex flex-col bg-ebony-bg text-ebony-text animate-in fade-in duration-300">
        <div className="shrink-0 bg-ebony-bg/95 backdrop-blur-md z-20 border-b border-ebony-border px-6 py-3 flex items-center justify-between">
          <button onClick={() => { setView('list'); setModoComparar(false); setSelecionadosComparar([]); }} className="flex items-center gap-2 text-ebony-muted hover:text-white transition-colors text-xs font-bold uppercase tracking-wide">
            <ArrowLeft size={16} /> Voltar
          </button>
          <div className="flex items-center gap-3">
            <span className="text-xs text-ebony-muted font-bold uppercase tracking-wider">
              Comparando {dadosComparacao.length} feedbacks
            </span>
            {!modoTrocarFoto ? (
              <button
                onClick={() => { setModoTrocarFoto(true); setFotosSelecionadasTroca([]); }}
                className="px-3 py-1.5 bg-ebony-surface border border-ebony-border hover:border-orange-500/50 text-orange-300 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
              >
                🔄 Trocar Fotos
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-orange-300 font-bold">{fotosSelecionadasTroca.length}/2 selecionadas</span>
                <button
                  onClick={confirmarTrocaFotos}
                  disabled={fotosSelecionadasTroca.length !== 2 || salvandoTroca}
                  className="px-3 py-1.5 bg-orange-500/20 border border-orange-500/40 text-orange-300 rounded-lg text-xs font-bold transition-all disabled:opacity-30"
                >
                  {salvandoTroca ? 'Salvando...' : 'Confirmar Troca'}
                </button>
                <button
                  onClick={() => { setModoTrocarFoto(false); setFotosSelecionadasTroca([]); }}
                  className="px-2 py-1.5 bg-ebony-surface border border-ebony-border hover:border-red-500/50 text-red-400 rounded-lg text-xs font-bold transition-all"
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>
        </div>

        {loadingComparacao ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-ebony-primary"></div>
          </div>
        ) : (
          <div className="flex-1 overflow-auto p-4 md:p-6">
            <div className="max-w-7xl mx-auto">
              {/* Header */}
              <div className="bg-ebony-surface px-4 py-3 rounded-xl border border-ebony-border mb-4">
                <h1 className="text-sm font-black text-white">
                  {dadosComparacao[0]?.nome_completo} — {dadosComparacao[0]?.titulo}
                </h1>
                <p className="text-[10px] text-ebony-muted mt-1">Avaliações: {dadosComparacao.length}</p>
              </div>

              {/* Tabela */}
              <div className="bg-ebony-surface rounded-xl border border-ebony-border overflow-x-auto">
                <table className="w-full text-left border-collapse table-fixed border-spacing-0">                  <thead>
                  <tr className="bg-ebony-deep border-b border-ebony-border">
                    <th className="p-3 text-[10px] font-bold text-ebony-muted uppercase tracking-wider sticky left-0 bg-ebony-deep z-10 min-w-[200px] w-48">Pergunta</th>
                    {dadosComparacao.map((fb, i) => (
                      <th key={i} className="p-3 text-[10px] font-bold text-white uppercase tracking-wider text-center min-w-[200px]">
                        {(fb.modified || fb.date)
                          ? new Date((fb.modified || fb.date).split(' ')[0] + 'T00:00:00').toLocaleDateString('pt-BR')
                          : '—'}
                      </th>
                    ))}
                  </tr>
                </thead>
                  <tbody className="divide-y divide-ebony-border/40">
                    {base.map((item, idx) => {
                      if (item.tipo === 'Quebra de Seção') {
                        return (
                          <tr key={idx} className="bg-ebony-deep/50">
                            <td colSpan={dadosComparacao.length + 1} className="p-3">
                              <h3 className="text-xs font-bold text-white uppercase tracking-wider bg-ebony-primary/10 border-l-4 border-ebony-primary px-4 py-3 rounded-r-lg flex items-center gap-2">
                                <Activity size={12} className="text-ebony-primary" />
                                {item.pergunta}
                              </h3>
                            </td>
                          </tr>
                        );
                      }

                      return (
                        <tr key={idx} className="hover:bg-white/5">
                          <td className="p-3 text-xs text-white font-bold sticky left-0 bg-ebony-surface z-10 border-r border-ebony-border/30">
                            {item.pergunta}
                          </td>
                          {dadosComparacao.map((fb, fi) => {
                            const resposta = fb.perguntas_e_respostas?.[idx];
                            if (!resposta || !resposta.resposta) return <td key={fi} className="p-3 text-center text-ebony-muted text-xs">—</td>;

                            if (resposta.tipo === 'Anexar Imagem') {
                              const rotationKey = `${fb.name}_${idx}`;
                              const rotation = rotations[rotationKey] || 0;

                              return (
                                <td key={fi} className="p-0 text-center align-top">
                                  <div className="relative">
                                    <ImagemInterativa
                                      id={fb.name}
                                      index={idx}
                                      src={`${FRAPPE_URL}${resposta.resposta}`}
                                      rotation90={rotation}
                                      onRotate90={() => toggleRotation(fb.name, idx)}
                                    />
                                    {modoTrocarFoto && (() => {
                                      const key = `${fb.name}_${idx}`;
                                      const ordemSel = fotosSelecionadasTroca.findIndex(f => f.key === key);
                                      const selecionada = ordemSel !== -1;
                                      return (
                                        <div
                                          onClick={() => selecionarFotoParaTroca(fb.name, idx)}
                                          className={`absolute inset-0 rounded-lg cursor-pointer flex items-start justify-end p-2 transition-all z-10 ${selecionada ? 'bg-orange-500/20 border-2 border-orange-400' : 'bg-black/30 border-2 border-dashed border-orange-400/40 hover:bg-orange-500/10'}`}
                                        >
                                          {selecionada && (
                                            <span className="bg-orange-500 text-white text-xs font-black w-6 h-6 rounded-full flex items-center justify-center shadow-lg">
                                              {ordemSel + 1}
                                            </span>
                                          )}
                                        </div>
                                      );
                                    })()}
                                  </div>
                                </td>
                              );
                            }

                            if (resposta.tipo === 'Avaliação') {
                              const val = parseInt(resposta.resposta) || 0;
                              const max = parseInt(resposta.opcoes) || 5;
                              return (
                                <td key={fi} className="p-3 text-center">
                                  <div className="flex items-center justify-center gap-0.5">
                                    {Array.from({ length: max }, (_, i) => (
                                      <Star key={i} size={14} className={i < val ? 'text-yellow-400 fill-yellow-400' : 'text-ebony-border'} />
                                    ))}
                                    <span className="text-ebony-muted text-[10px] ml-1">{val}/{max}</span>
                                  </div>
                                </td>
                              );
                            }

                            return (
                              <td key={fi} className="p-3 text-xs text-white text-center whitespace-pre-wrap">
                                {resposta.resposta}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ================================================================
  // MODAL: AVALIAÇÃO INICIAL
  // ================================================================
  const modalAvaliacaoJSX = modalAvaliacao && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-ebony-surface border border-ebony-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="shrink-0 px-6 py-4 border-b border-ebony-border flex items-center justify-between">
          <h2 className="text-base font-black text-white uppercase tracking-wide flex items-center gap-2">
            <Camera size={18} className="text-ebony-primary" /> Nova Avaliação Inicial
          </h2>
          <button onClick={() => !salvandoAvaliacao && setModalAvaliacao(false)} className="text-ebony-muted hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Aluno */}
          <div>
            <label className="text-xs font-bold text-white uppercase tracking-wide mb-2 block">Aluno *</label>
            {alunoSelecionadoModal ? (
              <div className="flex items-center justify-between px-4 py-3 bg-ebony-primary/10 border border-ebony-primary/30 rounded-lg">
                <div>
                  <p className="text-white text-sm font-bold">{alunoSelecionadoModal.nome_completo}</p>
                  <p className="text-ebony-muted text-[10px]">{alunoSelecionadoModal.email}</p>
                </div>
                <button onClick={() => { setAlunoSelecionadoModal(null); setBuscaAlunoModal(''); }} className="text-ebony-muted hover:text-red-400 text-xs font-bold transition-colors">
                  Trocar
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  placeholder="Digite o nome do aluno..."
                  value={buscaAlunoModal}
                  onChange={(e) => setBuscaAlunoModal(e.target.value)}
                  className="w-full px-4 py-2.5 bg-ebony-deep border border-ebony-border text-white rounded-lg outline-none focus:border-ebony-primary text-sm placeholder-gray-600"
                />
                {buscandoAlunoModal && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-ebony-primary"></div>
                  </div>
                )}
                {resultadosAlunoModal.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-ebony-deep border border-ebony-border rounded-lg shadow-xl z-10 overflow-hidden">
                    {resultadosAlunoModal.slice(0, 8).map(a => (
                      <button key={a.name} onClick={() => { setAlunoSelecionadoModal(a); setBuscaAlunoModal(''); setResultadosAlunoModal([]); }}
                        className="w-full text-left px-4 py-2.5 hover:bg-ebony-primary/20 transition-colors border-b border-ebony-border/40 last:border-0">
                        <p className="text-white text-sm font-bold">{a.nome_completo}</p>
                        <p className="text-ebony-muted text-[10px]">{a.email}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Peso */}
          <div>
            <label className="text-xs font-bold text-white uppercase tracking-wide mb-2 block">Peso Atual * (kg)</label>
            <input
              type="text"
              placeholder="Ex: 75,5"
              value={pesoModal}
              onChange={(e) => setPesoModal(e.target.value)}
              className="w-full md:w-48 px-4 py-2.5 bg-ebony-deep border border-ebony-border text-white rounded-lg outline-none focus:border-ebony-primary text-sm placeholder-gray-600"
            />
          </div>

          {/* POOL DE FOTOS */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`p-2 rounded-xl transition-all border-2 ${isDraggingOver ? 'border-dashed border-ebony-primary bg-ebony-primary/5' : 'border-transparent'}`}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-ebony-muted uppercase tracking-wider">
                📁 Suas Fotos {poolFotos.length > 0 && <span className="text-white">({poolFotos.length} carregadas)</span>}
              </h3>
              <label className="flex items-center gap-2 cursor-pointer px-3 py-1.5 bg-ebony-primary/10 border border-ebony-primary/30 hover:border-ebony-primary text-white rounded-lg text-xs font-bold transition-all">
                <Upload size={12} /> Selecionar fotos
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    handleArquivos(Array.from(e.target.files));
                    e.target.value = '';
                  }}
                />
              </label>
            </div>

            {poolFotos.length > 0 && (
              <div className="flex flex-wrap gap-2 p-3 bg-ebony-deep rounded-lg border border-ebony-border min-h-[80px]">
                {poolFotos.map(foto => (
                  <div key={foto.id} className="relative w-16 h-16 rounded-lg overflow-hidden border-2 border-ebony-border shrink-0 group">
                    <img src={foto.preview} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => setPoolFotos(prev => prev.filter(f => f.id !== foto.id))}
                      className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-600/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={10} className="text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {poolFotos.length === 0 && (
              <div className={`p-8 rounded-lg border border-dashed text-center text-xs transition-colors ${isDraggingOver
                ? 'border-ebony-primary bg-ebony-primary/10 text-ebony-primary font-bold'
                : 'bg-ebony-deep border-ebony-border text-ebony-muted'
                }`}>
                {isDraggingOver ? 'Solte as fotos aqui!' : 'Arraste várias fotos para cá ou clique em "Selecionar fotos"'}
              </div>
            )}

            {poolFotos.length > 0 && (
              <p className="text-[10px] text-ebony-muted mt-2">
                ☝️ Clique em qualquer slot abaixo para atribuir uma foto (ou continue arrastando mais fotos para cá)
              </p>
            )}
          </div>

          {/* SLOTS PRINCIPAIS */}
          <div>
            <h3 className="text-xs font-bold text-ebony-muted uppercase tracking-wider mb-3">📸 Fotos Principais</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* PICKER MODAL */}
              {slotPickerAberto && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
                  onClick={() => setSlotPickerAberto(null)}>
                  <div className="bg-ebony-surface border border-ebony-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col"
                    onClick={e => e.stopPropagation()}>
                    <div className="px-4 py-3 border-b border-ebony-border flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-2">
                        {/* Seta anterior — largura fixa */}
                        <button
                          onClick={() => {
                            const todosSlots = [...PERGUNTAS_PRINCIPAIS_AVALIACAO, ...PERGUNTAS_POSTURAIS_AVALIACAO];
                            const idxAtual = todosSlots.findIndex(p => p.name === slotPickerAberto.name);
                            const anterior = todosSlots[idxAtual - 1];
                            if (anterior) setSlotPickerAberto({ name: anterior.name, label: anterior.label });
                          }}
                          disabled={(() => {
                            const todosSlots = [...PERGUNTAS_PRINCIPAIS_AVALIACAO, ...PERGUNTAS_POSTURAIS_AVALIACAO];
                            return todosSlots.findIndex(p => p.name === slotPickerAberto.name) === 0;
                          })()}
                          className="w-8 h-8 shrink-0 flex items-center justify-center rounded-lg border border-ebony-border text-ebony-muted hover:text-white hover:border-white/30 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                        >
                          <ChevronLeft size={16} />
                        </button>

                        {/* Título centralizado com largura flexível */}
                        <div className="flex-1 px-3 text-center">
                          <p className="text-xs font-bold text-ebony-muted uppercase tracking-wider">Atribuir foto ao slot</p>
                          <p className="text-sm font-black text-white whitespace-normal break-words">{slotPickerAberto.label}</p>
                        </div>

                        {/* Seta próximo — largura fixa */}
                        <button
                          onClick={() => {
                            const todosSlots = [...PERGUNTAS_PRINCIPAIS_AVALIACAO, ...PERGUNTAS_POSTURAIS_AVALIACAO];
                            const idxAtual = todosSlots.findIndex(p => p.name === slotPickerAberto.name);
                            const proximo = todosSlots[idxAtual + 1];
                            if (proximo) setSlotPickerAberto({ name: proximo.name, label: proximo.label });
                          }}
                          disabled={(() => {
                            const todosSlots = [...PERGUNTAS_PRINCIPAIS_AVALIACAO, ...PERGUNTAS_POSTURAIS_AVALIACAO];
                            const idxAtual = todosSlots.findIndex(p => p.name === slotPickerAberto.name);
                            return idxAtual === todosSlots.length - 1;
                          })()}
                          className="w-8 h-8 shrink-0 flex items-center justify-center rounded-lg border border-ebony-border text-ebony-muted hover:text-white hover:border-white/30 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        {fotosModal[slotPickerAberto.name] && (
                          <button
                            onClick={() => {
                              const atribuida = fotosModal[slotPickerAberto.name];
                              setPoolFotos(prev => [...prev, atribuida]);
                              setFotosModal(prev => { const n = { ...prev }; delete n[slotPickerAberto.name]; return n; });
                            }}
                            className="px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-xs font-bold transition-all hover:bg-red-500/20"
                          >
                            Remover
                          </button>
                        )}
                        <button onClick={() => setSlotPickerAberto(null)} className="text-ebony-muted hover:text-white">
                          <X size={18} />
                        </button>
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4">
                      {poolFotos.length === 0 ? (
                        <div className="text-center text-ebony-muted text-sm py-10">
                          Nenhuma foto no pool. Carregue fotos primeiro.
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-3">
                          {poolFotos.map(foto => (
                            <div
                              key={foto.id}
                              onClick={() => {
                                const atribuida = fotosModal[slotPickerAberto.name];
                                setFotosModal(prev => ({ ...prev, [slotPickerAberto.name]: foto }));
                                setPoolFotos(prev => {
                                  const semEssa = prev.filter(f => f.id !== foto.id);
                                  return atribuida ? [...semEssa, atribuida] : semEssa;
                                });

                                // Avança automaticamente pro próximo slot vazio
                                const todosSlots = [
                                  ...PERGUNTAS_PRINCIPAIS_AVALIACAO,
                                  ...(expandirPostural ? PERGUNTAS_POSTURAIS_AVALIACAO : [])
                                ];
                                const idxAtual = todosSlots.findIndex(p => p.name === slotPickerAberto.name);
                                const proximoVazio = todosSlots.slice(idxAtual + 1).find(p => !fotosModal[p.name] && p.name !== slotPickerAberto.name);

                                if (proximoVazio && poolFotos.filter(f => f.id !== foto.id).length > 0) {
                                  setSlotPickerAberto({ name: proximoVazio.name, label: proximoVazio.label });
                                } else {
                                  setSlotPickerAberto(null);
                                }
                              }}
                              className="relative rounded-xl overflow-hidden cursor-pointer border-2 border-ebony-border hover:border-ebony-primary hover:scale-[1.03] transition-all"
                              style={{ aspectRatio: '3/4' }}
                            >
                              <img src={foto.preview} alt="" className="w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {PERGUNTAS_PRINCIPAIS_AVALIACAO.map(p => {
                const atribuida = fotosModal[p.name];
                return (
                  <div
                    key={p.name}
                    onClick={() => setSlotPickerAberto({ name: p.name, label: p.label })}
                    className={`relative rounded-lg border-2 transition-all overflow-hidden cursor-pointer
                      ${atribuida ? 'border-green-500/60 hover:border-green-400' : 'border-ebony-border/40 hover:border-ebony-primary/60'}
                    `}
                    style={{ aspectRatio: '3/4' }}
                  >
                    {atribuida ? (
                      <>
                        <img src={atribuida.preview} alt="" className="w-full h-full object-cover" />
                        <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-2 py-1">
                          <p className="text-[8px] text-white font-bold uppercase truncate">{p.label}</p>
                          {p.reqd && <span className="text-[7px] text-green-400">✓ OK</span>}
                        </div>
                        <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                          <span className="text-white text-[9px] font-bold bg-ebony-surface/90 px-2 py-1 rounded">Trocar</span>
                        </div>
                        {/* LIXINHO */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPoolFotos(prev => [...prev, atribuida]);
                            setFotosModal(prev => { const n = { ...prev }; delete n[p.name]; return n; });
                          }}
                          className="absolute top-1 right-1 w-5 h-5 bg-red-600/90 rounded-full flex items-center justify-center z-10 hover:bg-red-500 transition-colors"
                        >
                          <Trash2 size={10} className="text-white" />
                        </button>
                      </>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-ebony-deep p-2">
                        <Camera size={16} className="text-ebony-border" />
                        <p className="text-[8px] text-center font-bold uppercase text-ebony-muted leading-tight">{p.label}</p>
                        {p.reqd && <span className="text-[7px] text-ebony-primary font-bold">* obrigatória</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* SLOTS POSTURAIS (colapsível) */}
          <div>
            <button
              onClick={() => setExpandirPostural(v => !v)}
              className="flex items-center gap-2 text-xs font-bold text-ebony-muted uppercase tracking-wider mb-3 hover:text-white transition-colors"
            >
              {expandirPostural ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
              📐 Avaliação Postural ({PERGUNTAS_POSTURAIS_AVALIACAO.length} slots opcionais)
            </button>
            {expandirPostural && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {PERGUNTAS_POSTURAIS_AVALIACAO.map(p => {
                  const atribuida = fotosModal[p.name];
                  return (
                    <div
                      key={p.name}
                      onClick={() => setSlotPickerAberto({ name: p.name, label: p.label })}
                      className={`relative rounded-lg border-2 transition-all overflow-hidden cursor-pointer
                        ${atribuida ? 'border-green-500/60 hover:border-green-400' : 'border-ebony-border/40 hover:border-ebony-primary/60'}
                      `}
                      style={{ aspectRatio: '3/4' }}
                    >
                      {atribuida ? (
                        <>
                          <img src={atribuida.preview} alt="" className="w-full h-full object-cover" />
                          <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-2 py-1">
                            <p className="text-[8px] text-white font-bold uppercase truncate">{p.label}</p>
                          </div>
                          <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                            <span className="text-white text-[9px] font-bold bg-ebony-surface/90 px-2 py-1 rounded">Trocar</span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPoolFotos(prev => [...prev, atribuida]);
                              setFotosModal(prev => { const n = { ...prev }; delete n[p.name]; return n; });
                            }}
                            className="absolute top-1 right-1 w-5 h-5 bg-red-600/90 rounded-full flex items-center justify-center z-10 hover:bg-red-500 transition-colors"
                          >
                            <Trash2 size={10} className="text-white" />
                          </button>
                        </>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-ebony-deep p-2">
                          <Camera size={14} className="text-ebony-border" />
                          <p className="text-[7px] text-center font-bold uppercase text-ebony-muted leading-tight">{p.label}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="shrink-0 px-6 py-4 border-t border-ebony-border flex items-center justify-between gap-3">
          {salvandoAvaliacao ? (
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-ebony-muted font-bold">Enviando fotos...</span>
                <span className="text-xs text-white font-bold">{progressoAvaliacao}%</span>
              </div>
              <div className="w-full bg-ebony-deep rounded-full h-2">
                <div className="bg-ebony-primary h-2 rounded-full transition-all duration-300" style={{ width: `${progressoAvaliacao}%` }}></div>
              </div>
            </div>
          ) : (
            <>
              <button onClick={() => setModalAvaliacao(false)} className="px-4 py-2 text-ebony-muted hover:text-white text-xs font-bold uppercase transition-colors">
                Cancelar
              </button>
              <button onClick={salvarAvaliacaoInicial}
                className="px-6 py-2.5 bg-ebony-primary hover:bg-ebony-primary/80 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg">
                <Upload size={14} /> Salvar Avaliação Inicial
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  // ================================================================
  // VIEW: LISTA
  // ================================================================
  if (view === 'list') {
    return (
      <div className="w-full h-full p-6 animate-in fade-in duration-500 bg-ebony-bg text-ebony-text">
        {modalAvaliacaoJSX}
        {modalRaioX && <ModalRaioX alunoNome={modalRaioX} onClose={() => setModalRaioX(null)} />}

        {/* === MODAL: MODO ENVIO WHATSAPP === */}
        {modalEnvio && listaEnvio.length > 0 && (() => {
          const item = listaEnvio[indexEnvio];
          const phone = phoneCache[item?.studentId] || '';
          const isLast = indexEnvio >= listaEnvio.length - 1;
          const isTraining = item?.type === 'training';
          return (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="bg-ebony-surface border border-ebony-border rounded-2xl w-full max-w-md shadow-2xl flex flex-col">
                {/* Header */}
                <div className="px-5 py-4 border-b border-ebony-border flex items-center justify-between shrink-0">
                  <div>
                    <p className="text-[10px] text-ebony-muted font-bold uppercase tracking-widest">Modo Envio</p>
                    <h3 className="text-white font-black text-lg">{indexEnvio + 1} / {listaEnvio.length}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => exportarListaTexto(listaEnvio)}
                      className="px-3 py-1.5 bg-ebony-deep border border-ebony-border text-ebony-muted hover:text-white rounded-lg text-xs font-bold transition-all"
                      title="Copiar lista completa"
                    >
                      📋 Exportar Lista
                    </button>
                    <button onClick={() => setModalEnvio(false)} className="text-ebony-muted hover:text-white"><X size={18} /></button>
                  </div>
                </div>

                {/* Barra de progresso */}
                <div className="w-full h-1 bg-ebony-deep">
                  <div
                    className="h-1 bg-green-500 transition-all duration-300"
                    style={{ width: `${((indexEnvio + 1) / listaEnvio.length) * 100}%` }}
                  />
                </div>

                {/* Corpo */}
                <div className="p-6 space-y-4">
                  {/* Aluno */}
                  <div className="bg-ebony-deep border border-ebony-border rounded-xl p-4">
                    <p className="text-white font-black text-base">{item?.studentName}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-ebony-muted text-xs">
                        {item?.date ? new Date(item.date + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}
                      </span>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${
                        isTraining
                          ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                          : 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                      }`}>
                        {isTraining ? '💪 Troca' : '📋 Feedback'}
                      </span>
                      {phone ? (
                        <span className="text-green-400 text-xs font-mono">{phone}</span>
                      ) : (
                        <span className="text-red-400 text-xs">⚠ Sem telefone</span>
                      )}
                    </div>
                  </div>

                  {/* Preview da mensagem */}
                  <div className="bg-ebony-deep/50 border border-ebony-border/50 rounded-xl p-4 max-h-40 overflow-y-auto">
                    <p className="text-[10px] text-ebony-muted font-bold uppercase mb-2">
                      Preview da mensagem ({isTraining ? 'Troca' : 'Feedback'})
                    </p>
                    <p className="text-white text-xs whitespace-pre-wrap leading-relaxed">
                      {gerarMensagemEnvio(item)}
                    </p>
                  </div>

                  {/* Botões */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => abrirWhatsApp(item)}
                      disabled={!phone}
                      className="flex-1 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-30 text-white font-black rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg"
                    >
                      📱 Abrir WhatsApp
                    </button>
                    <button
                      onClick={() => {
                        if (isLast) { setModalEnvio(false); }
                        else setIndexEnvio(i => i + 1);
                      }}
                      className="flex-1 py-3 bg-ebony-surface border border-ebony-border hover:border-white/30 text-white font-black rounded-xl text-sm transition-all"
                    >
                      {isLast ? '✅ Concluir' : 'Próximo →'}
                    </button>
                  </div>

                  {/* Navegação manual */}
                  {indexEnvio > 0 && (
                    <button
                      onClick={() => setIndexEnvio(i => i - 1)}
                      className="w-full text-ebony-muted text-xs hover:text-white transition-colors text-center"
                    >
                      ← Voltar ao anterior
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
        {/* === DRAWER: VISÃO DE CICLOS === */}
        {drawerCiclosAberto && (
          <div className="fixed inset-0 z-[9999] flex" onClick={() => setDrawerCiclosAberto(false)}>
            <div className="flex-1 bg-black/40" />
            <div
              className="w-[560px] bg-ebony-surface border-l border-ebony-border flex flex-col h-full shadow-2xl animate-in slide-in-from-right duration-300"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-5 py-4 border-b border-ebony-border flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2 font-bold text-white text-sm">
                  📊 Visão de Ciclos
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const listaAtual = abaDrawer === 'atrasados' ? drawerDados.atrasados : drawerDados.proximos;
                      if (!listaAtual.length) return alert('Nenhum aluno nessa aba.');
                      abrirModoEnvio(listaAtual);
                    }}
                    disabled={loadingEnvio}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600/20 border border-green-500/30 hover:border-green-500/60 text-green-400 rounded-lg text-xs font-bold transition-all"
                    title="Enviar lembretes via WhatsApp"
                  >
                    {loadingEnvio ? '...' : '📤 Enviar'}
                  </button>
                  <button onClick={() => setDrawerCiclosAberto(false)} className="text-ebony-muted hover:text-white transition-colors">
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Abas */}
              {(() => {
                const abaAtiva = abaDrawer;
                const setAbaAtiva = setAbaDrawer;
                const { atrasados, proximos, semCronograma } = drawerDados;

                const { planejamento = [] } = drawerDados;
                const abas = [
                  { id: 'atrasados', label: 'Atrasados', count: atrasados.length },
                  { id: 'proximos', label: 'Próximos dias', count: proximos.length },
                  { id: 'planejamento', label: 'Planejamento', count: planejamento.length },
                  { id: 'semcronograma', label: 'Sem crono', count: semCronograma.length },
                ];

                const listaAtiva = abaAtiva === 'atrasados' ? atrasados
                  : abaAtiva === 'proximos' ? proximos
                    : abaAtiva === 'planejamento' ? planejamento
                      : [];
                return (
                  <>
                    <div className="flex border-b border-ebony-border shrink-0">
                      {abas.map(aba => (
                        <button
                          key={aba.id}
                          onClick={() => setAbaAtiva(aba.id)}
                          className={`flex-1 py-2.5 text-[10px] font-bold uppercase tracking-wide transition-all border-b-2 ${abaAtiva === aba.id ? 'text-white border-ebony-primary' : 'text-ebony-muted border-transparent hover:text-white'}`}
                        >
                          {aba.label}
                          <span className="ml-1.5 text-[9px] bg-ebony-deep border border-ebony-border px-1.5 py-0.5 rounded-full">
                            {aba.count}
                          </span>
                        </button>
                      ))}
                    </div>

                    {/* Modal Sem Cronograma */}
                    {modalSemCronograma && (
                      <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 p-4" onClick={() => setModalSemCronograma(false)}>
                        <div className="bg-ebony-surface border border-ebony-border rounded-2xl w-full max-w-xl shadow-2xl flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
                          <div className="p-5 border-b border-ebony-border flex items-center justify-between shrink-0">
                            <h3 className="font-bold text-white text-sm">Sem Cronograma ({semCronograma.length})</h3>
                            <button onClick={() => setModalSemCronograma(false)} className="text-ebony-muted hover:text-white"><X size={18} /></button>
                          </div>
                          <div className="p-4">
                            <div className="relative mb-3">
                              <Search className="absolute left-3 top-2.5 w-4 h-4 text-ebony-muted" />
                              <input
                                value={buscaSemCronograma}
                                onChange={e => setBuscaSemCronograma(e.target.value)}
                                placeholder="Buscar aluno..."
                                className="w-full pl-9 p-2 bg-ebony-deep border border-ebony-border text-white rounded-lg text-sm outline-none focus:border-ebony-primary"
                                autoFocus
                              />
                            </div>
                            <div className="overflow-y-auto space-y-2 max-h-[50vh]">
                              {semCronograma
                                .filter(s => s.studentName.toLowerCase().includes(buscaSemCronograma.toLowerCase()))
                                .map((s, i) => {
                                  const fbDoAluno = listaFeedbacks.find(f => f.nome_completo === s.studentName);
                                  return (
                                    <div key={i} className="p-3 border border-ebony-border rounded-xl flex items-center justify-between gap-3 bg-ebony-deep hover:border-ebony-primary/30 transition-all">
                                      <div className="min-w-0">
                                        <StudentNameWithBadge
                                          student={dadosFinanceiros[s.studentName] || {}}
                                          nameFallback={s.studentName}
                                          className="font-bold text-white text-sm"
                                          showText={false}
                                        />
                                        {(() => {
                                          const fin = dadosFinanceiros[s.studentName];
                                          const due = fin?.finDueDate ? String(fin.finDueDate).slice(0, 10) : null;
                                          const dueBR = due ? new Date(due + 'T12:00:00').toLocaleDateString('pt-BR') : null;

                                          // ✅ Recomputa status em tempo real (igual ao StudentBadge)
                                          const today = new Date().toISOString().slice(0, 10);
                                          let liveStatus = fin?.finStatus || null;
                                          if (liveStatus !== 'Pausado' && liveStatus !== 'Pago e não iniciado' && due) {
                                            if (due < today) {
                                              const [y, m, d] = due.split('-').map(Number);
                                              const limit = new Date(y, m - 1, d);
                                              limit.setDate(limit.getDate() + 30);
                                              const limitISO = limit.toISOString().slice(0, 10);
                                              liveStatus = today > limitISO ? 'Não renovou' : 'Vencido';
                                            } else {
                                              liveStatus = 'Ativo';
                                            }
                                          }

                                          const isAtivo = liveStatus === 'Ativo';

                                          return (
                                            <>
                                              {fin?.finPlanName && (
                                                <div className="text-[11px] text-ebony-muted truncate">{fin.finPlanName}</div>
                                              )}
                                              {dueBR && (
                                                <div className="text-[10px] text-ebony-muted mt-0.5">
                                                  Vence: <span className="font-bold text-white">{dueBR}</span>
                                                  {liveStatus && (
                                                    <span className={`ml-2 font-bold ${isAtivo ? 'text-green-400' : 'text-red-400'}`}>
                                                      • {liveStatus}
                                                    </span>
                                                  )}
                                                </div>
                                              )}
                                            </>
                                          );
                                        })()}
                                      </div>
                                      <button
                                        onClick={() => {
                                          setModalSemCronograma(false);
                                          setDrawerCiclosAberto(false);
                                          localStorage.setItem('irParaCronogramaAluno', s.studentName);
                                          window.dispatchEvent(new CustomEvent('irParaCronograma', { detail: { nome: s.studentName } }));
                                        }}
                                        className="px-3 py-2 bg-ebony-primary hover:bg-red-900 text-white font-bold rounded-lg text-xs shrink-0 shadow-lg transition-all"
                                      >
                                        Criar cronograma
                                      </button>
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                      {drawerLoading ? (
                        <div className="flex justify-center py-10">
                          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-ebony-primary"></div>
                        </div>
                      ) : abaAtiva === 'semcronograma' ? (
                        <div className="bg-ebony-deep border border-ebony-border rounded-xl p-5 flex flex-col gap-3">
                          <div className="text-xs text-ebony-muted leading-relaxed">
                            Alunos com feedbacks no sistema mas sem datas futuras definidas no cronograma.
                          </div>
                          <div className="text-2xl font-black text-white">{semCronograma.length} alunos</div>
                          <button
                            onClick={async () => {
                              setBuscaSemCronograma('');
                              setModalSemCronograma(true);
                              try {
                                const snap2 = await getDocs(collection(db, 'students'));
                                const mapa = {};
                                snap2.forEach(d => {
                                  const data = d.data();
                                  const nome = (data.name || data.nome_completo || '').trim();
                                  if (nome) mapa[nome] = { ...data, id: d.id };
                                });

                                // Fallback: busca payments pra quem não tem dados financeiros no students doc
                                const snapPay = await getDocs(collection(db, 'payments'));
                                const paymentsPorStudentId = {};
                                snapPay.forEach(d => {
                                  const p = d.data();
                                  const sid = p.studentId;
                                  if (!sid) return;
                                  if (!paymentsPorStudentId[sid]) paymentsPorStudentId[sid] = [];
                                  paymentsPorStudentId[sid].push(p);
                                });

                                // Mescla payments no mapa para quem está sem finDueDate
                                Object.keys(mapa).forEach(nome => {
                                  const entry = mapa[nome];
                                  if (!entry.finDueDate && entry.id && paymentsPorStudentId[entry.id]) {
                                    const pagamentos = paymentsPorStudentId[entry.id].sort((a, b) =>
                                      String(b.dueDate || '').localeCompare(String(a.dueDate || ''))
                                    );
                                    const best = pagamentos[0];
                                    if (best) {
                                      mapa[nome] = {
                                        ...entry,
                                        finPlanName: best.planName || best.plan || entry.finPlanName || null,
                                        finDueDate: String(best.dueDate || '').slice(0, 10) || null,
                                        finStatus: entry.finStatus || 'Ativo',
                                      };
                                    }
                                  }
                                });

                                setDadosFinanceiros(mapa);
                              } catch (e) { console.error("Erro ao buscar financeiro:", e); }
                            }}
                            className="w-full px-3 py-2 bg-transparent border border-ebony-border text-ebony-muted font-bold rounded-lg hover:bg-ebony-surface hover:text-white transition-all text-xs uppercase tracking-wider"
                          >
                            Ver lista completa
                          </button>
                        </div>
                      ) : listaAtiva.length === 0 ? (
                        <div className="text-center text-ebony-muted text-xs py-10 italic">Nenhum registro aqui.</div>
                      ) : listaAtiva.map((item, i) => {
                        const d = item.date ? new Date(item.date + 'T00:00:00') : null;
                        return (
                          <div
                            key={i}
                            className="bg-ebony-deep border border-ebony-border rounded-lg p-3 cursor-pointer hover:border-ebony-primary/40 transition-all"
                            onClick={() => {
                              const fb = listaFeedbacks.find(f => f.nome_completo === item.studentName);
                              if (fb) { abrirFeedback(fb); setDrawerCiclosAberto(false); }
                            }}
                          >
                            <div className="font-bold text-white text-xs mb-1">{item.studentName}</div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-ebony-muted">
                                  {d ? d.toLocaleDateString('pt-BR') : '—'}
                                </span>
                                {item.type === 'training' && (
                                  <span className="text-[9px] font-bold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-1.5 py-0.5 rounded-full">
                                    Troca
                                  </span>
                                )}
                              </div>
                              {abaAtiva === 'atrasados' && (
                                <span className="text-[9px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">
                                  {item.diffDays}d atraso
                                </span>
                              )}
                              {abaAtiva === 'proximos' && (
                                <span className="text-[9px] font-bold text-yellow-300 bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded-full">
                                  em {item.diffDays}d
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}
        {/* === MODAL SIMPLES: NOTA DO ALUNO === */}
        {modalNotaSimples && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setModalNotaSimples(null)}>
            <div
              className="bg-ebony-surface border border-ebony-border rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-5 py-4 border-b border-ebony-border flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-white text-sm">
                  <div className="p-1.5 bg-ebony-deep border border-ebony-border rounded-md text-base">📄</div>
                  Notas do Aluno
                </div>
                <button onClick={() => setModalNotaSimples(null)} className="text-ebony-muted hover:text-white">
                  <X size={18} />
                </button>
              </div>
              <div className="p-5">
                <div className="text-[10px] font-bold text-ebony-muted uppercase tracking-wide mb-2">
                  Observações para {modalNotaSimples.nome}:
                </div>
                <textarea
                  className="w-full bg-ebony-deep border border-ebony-border rounded-xl p-4 text-sm text-white placeholder-gray-600 outline-none focus:border-ebony-primary resize-none"
                  rows={5}
                  placeholder="Digite aqui alguma observação importante sobre esse feedback..."
                  value={textoNotaSimples}
                  onChange={(e) => setTextoNotaSimples(e.target.value)}
                  autoFocus
                />
                <div className="flex justify-end gap-3 mt-4">
                  <button
                    onClick={() => setModalNotaSimples(null)}
                    className="px-5 py-2.5 bg-transparent border border-ebony-border text-ebony-muted text-sm font-bold hover:bg-ebony-deep hover:text-white rounded-xl transition"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        const chaveSegura = modalNotaSimples.feedbackName.replace(/[\/\\.#$\[\]]/g, '_');
                        const ref = doc(db, "notas_ciclos", chaveSegura);
                        await setDoc(ref, {
                          texto: textoNotaSimples,
                          alunoNome: modalNotaSimples.nome,
                          atualizadoEm: new Date().toISOString()
                        }, { merge: true });
                        setNotasPorCiclo(prev => ({ ...prev, [chaveSegura]: textoNotaSimples }));
                      } catch (e) { console.error("Erro ao salvar nota:", e); }
                      setModalNotaSimples(null);
                    }}
                    disabled={salvandoNota}
                    className="px-6 py-2.5 bg-ebony-primary hover:bg-red-900 disabled:opacity-50 text-white text-sm font-bold rounded-xl shadow-lg transition"
                  >
                    {salvandoNota ? 'Salvando...' : 'Salvar Nota'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* === MODAL: HISTÓRICO + NOTA === */}
        {modalHistoricoData && (
          <div
            className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 animate-in fade-in"
            onMouseDown={() => setModalHistoricoData(null)}
          >
            <div
              className="bg-ebony-surface rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-ebony-border flex flex-col max-h-[80vh]"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-ebony-border bg-ebony-surface flex justify-between items-center shrink-0">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <div className="p-1.5 bg-ebony-deep rounded-md border border-ebony-border">
                    <ListChecks className="w-4 h-4 text-blue-400" />
                  </div>
                  Histórico: {modalHistoricoData.nome}
                </h3>
                <button
                  onClick={() => setModalHistoricoData(null)}
                  className="text-ebony-muted hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-0 overflow-y-auto custom-scrollbar flex-1 bg-ebony-deep/30">
                {modalHistoricoData.loading ? (
                  <div className="flex flex-col justify-center items-center h-full py-12 opacity-60">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-ebony-primary mb-3"></div>
                    <p className="text-[10px] text-ebony-muted uppercase tracking-widest font-bold animate-pulse">
                      Buscando histórico...
                    </p>
                  </div>
                ) : (
                  <div className="relative pl-8 pt-6 pb-6">
                    {(() => {
                      // DEPOIS:
                      const feedbacksDoAluno = listaFeedbacks
                        .filter(f => f.nome_completo === modalHistoricoData.nome);

                      // Monta todos a partir do cronograma como base
                      const todos = timelineMesclada.map(schedItem => {
                        const isTreino = schedItem.type === 'training';

                        // Tenta cruzar com feedback do Frappe pela data (janela de ±7 dias)
                        const frappeMatch = !isTreino ? feedbacksDoAluno.find(f => {
                          const dataFrappe = (datasResposta[f.name] || f.modified || f.date || '').slice(0, 10);
                          const dataSched = schedItem.date;
                          const diff = Math.abs((new Date(dataFrappe) - new Date(dataSched)) / (1000 * 60 * 60 * 24));
                          return diff <= 7;
                        }) : null;

                        return {
                          ...schedItem,
                          ...(frappeMatch ? { frappeData: frappeMatch } : {}),
                          tipo: isTreino ? 'troca' : 'cronograma',
                          dataVisual: frappeMatch
                            ? (datasResposta[frappeMatch.name] || frappeMatch.modified || schedItem.date).slice(0, 10)
                            : schedItem.date,
                          // Status calculado
                          status: frappeMatch
                            ? frappeMatch.status
                            : schedItem.status === 'done' ? 'Finalizado' : 'Aguardando'
                        };
                      }).sort((a, b) => (b.dataVisual || '').localeCompare(a.dataVisual || ''));

                      return todos.map((item, idx) => {
                        const isTroca = item.tipo === 'troca'; // treino/troca de ficha
                        const isCronograma = item.tipo === 'cronograma';
                        const now = new Date();
                        now.setHours(0, 0, 0, 0);

                        const d = item.dataVisual ? new Date(item.dataVisual + 'T12:00:00') : null;
                        const dPrev = item.date ? new Date(item.date + 'T12:00:00') : null;
                        if (d) d.setHours(0, 0, 0, 0);
                        if (dPrev) dPrev.setHours(0, 0, 0, 0);

                        const diff = dPrev ? (now - dPrev) / (1000 * 60 * 60 * 24) : null;

                        const isRespondido = item.status === 'Respondido';
                        const isConcluido = item.status === 'done' || item.status === 'Finalizado' || item.status === 'Concluido';
                        const isAtrasado = diff !== null && diff > 0 && !isRespondido && !isConcluido;
                        const isAguardando = !isRespondido && !isConcluido && !isAtrasado;

                        const dotColor = isTroca
                          ? 'bg-purple-500'
                          : isConcluido
                            ? 'bg-green-500'
                            : isRespondido
                              ? 'bg-blue-400'
                              : isAtrasado
                                ? 'bg-red-400'
                                : 'bg-ebony-border';

                        const chaveDB = gerarChaveNota(modalHistoricoData.email, item.date);
                        const chaveSegura = chaveDB.replace(/[\/\\.#$\[\]]/g, '_');
                        const chaveNota = chaveSegura;
                        const notaAtual = notasPorCiclo[chaveSegura] || '';
                        const temNota = notaAtual.trim().length > 0;

                        return (
                          <div
                            key={chaveNota}
                            className="relative pl-6 pb-6 last:pb-0 border-l border-ebony-border/50 ml-2"
                          >
                            <div
                              className={`absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full border-2 border-ebony-surface ${dotColor}`}
                            ></div>

                            <div className="bg-ebony-surface border border-ebony-border rounded-lg p-3 shadow-sm mr-4 hover:border-ebony-primary/30 transition-colors">
                              <div className="flex justify-between items-start mb-2">
                                <span className="font-bold text-white text-xs flex items-center gap-2 flex-wrap">
                                  {d ? d.toLocaleDateString('pt-BR') : '—'}

                                  {isConcluido ? (
                                    <span className="text-[9px] bg-green-500/10 text-green-400 px-1.5 rounded border border-green-500/20">
                                      Concluído
                                    </span>
                                  ) : isRespondido ? (
                                    <span className="text-[9px] bg-blue-500/10 text-blue-400 px-1.5 rounded border border-blue-500/20">
                                      Respondido
                                    </span>
                                  ) : isAtrasado ? (
                                    <span className="text-[9px] bg-red-500/10 text-red-400 px-1.5 rounded border border-red-500/20">
                                      Atrasado
                                    </span>
                                  ) : (
                                    <span className="text-[9px] bg-ebony-deep text-ebony-muted px-1.5 rounded border border-ebony-border/50">
                                      Aguardando
                                    </span>
                                  )}
                                </span>

                                {isTroca && (
                                  <span className="text-[9px] font-bold text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">
                                    TROCA
                                  </span>
                                )}
                              </div>

                              <textarea
                                className={`w-full text-white text-[11px] p-2 rounded outline-none resize-none transition-all ${temNota
                                  ? 'bg-yellow-500/5 border border-yellow-500/20 focus:border-yellow-500/50 focus:bg-yellow-500/10'
                                  : 'bg-ebony-deep/50 border border-ebony-border/50 focus:border-yellow-500/50 focus:bg-ebony-deep'
                                  }`}
                                rows={temNota ? Math.max(2, notaAtual.split('\n').length) : 2}
                                placeholder="Adicionar nota..."
                                value={notaAtual}
                                onChange={(e) => {
                                  setNotasPorCiclo(prev => ({ ...prev, [chaveSegura]: e.target.value }));
                                }}
                                onBlur={async (e) => {
                                  const texto = e.target.value;
                                  if (!chaveDB) return;
                                  const chaveSegura = chaveDB.replace(/[\/\\.#$\[\]]/g, '_');

                                  setNotasPorCiclo(prev => ({ ...prev, [chaveSegura]: texto }));

                                  try {
                                    const ref = doc(db, "notas_ciclos", chaveSegura);
                                    await setDoc(ref, {
                                      texto,
                                      alunoNome: modalHistoricoData.nome,
                                      alunoEmail: modalHistoricoData.email,
                                      dataPrevista: item.date,
                                      atualizadoEm: new Date().toISOString()
                                    }, { merge: true });
                                  } catch (err) {
                                    console.error("Erro ao salvar nota:", err);
                                  }
                                }}
                              />
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-black text-white uppercase tracking-tight flex items-center gap-3">
              <span className="p-2 bg-ebony-primary rounded-lg shadow-[0_0_15px_rgba(133,0,0,0.5)]">
                <MessageSquare className="w-6 h-6 text-white" />
              </span>
              Feedbacks Recebidos
            </h1>
            <p className="text-ebony-muted text-sm mt-1 font-medium">
              {feedbacksFiltrados.length} feedback(s) encontrado(s)
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setModalAvaliacao(true)}
              className="p-2 md:px-4 md:py-2.5 bg-ebony-primary/10 border border-ebony-primary/20 hover:border-ebony-primary/50 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-2"
              title="Avaliação Inicial"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden md:inline uppercase tracking-wider">Avaliação Inicial</span>
            </button>

            {!modoComparar ? (
              <button
                onClick={() => setModoComparar(true)}
                className="p-2 md:px-4 md:py-2.5 bg-ebony-surface border border-ebony-border/50 hover:border-blue-500/40 text-blue-300/80 rounded-lg text-xs font-bold transition-all flex items-center gap-2"
                title="Comparar"
              >
                <Columns className="w-4 h-4" />
                <span className="hidden md:inline uppercase tracking-wider">Comparar</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-blue-300 font-bold">{selecionadosComparar.length} selecionado(s)</span>
                <button
                  onClick={iniciarComparacao}
                  disabled={selecionadosComparar.length < 2}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-30 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2"
                >
                  <Columns className="w-4 h-4" /> Comparar ({selecionadosComparar.length})
                </button>
                <button
                  onClick={() => { setModoComparar(false); setSelecionadosComparar([]); }}
                  className="px-3 py-2.5 bg-ebony-surface border border-ebony-border hover:border-red-500/50 text-red-400 rounded-lg text-xs font-bold transition-all"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            <button
              onClick={() => { setDrawerCiclosAberto(true); carregarDrawerCiclos(); }}
              className="p-2 md:px-4 md:py-2.5 bg-ebony-surface border border-ebony-border/50 hover:text-white text-ebony-muted rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
              title="Visão de Ciclos"
            >
              <span>📊</span>
              <span className="hidden md:inline uppercase tracking-wider">Visão de Ciclos</span>
            </button>
            <button
              onClick={carregarLista}
              className="p-2 md:px-4 md:py-2.5 bg-ebony-surface border border-ebony-border/50 hover:border-ebony-primary/40 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-2"
              title="Atualizar"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden md:inline uppercase tracking-wider">Atualizar</span>
            </button>         
          </div>
        </div>

        {/* FILTRO DE FORMULÁRIOS SALVOS */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="relative flex-1 max-w-xs">
              <input
                type="text"
                placeholder="ID do formulário (ex: lh7dq5haei)"
                className="w-full pl-3 pr-3 py-2 bg-ebony-deep border border-ebony-border text-white rounded-lg shadow-sm focus:border-ebony-primary placeholder-gray-600 outline-none transition-colors text-xs font-mono"
                value={inputFormulario}
                onChange={(e) => setInputFormulario(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') adicionarFormulario(); }}
              />
            </div>
            <button
              onClick={adicionarFormulario}
              className="px-3 py-2 bg-ebony-surface border border-ebony-border hover:border-ebony-primary text-white rounded-lg text-xs font-bold transition-all"
            >
              Fixar
            </button>
          </div>
          {formulariosSalvos.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {formulariosSalvos.map(id => (
                <span key={id} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-ebony-deep border border-ebony-border rounded-lg text-xs font-mono text-blue-300">
                  {id}
                  <button onClick={() => removerFormulario(id)} className="text-ebony-muted hover:text-red-400 transition-colors">
                    <X size={12} />
                  </button>
                </span>
              ))}
              <span className="text-[10px] text-ebony-muted self-center">← Mostrando apenas estes formulários</span>
            </div>
          )}
        </div>

        {/* FILTROS */}
        <div className="mb-6 flex flex-col md:flex-row flex-wrap gap-3 w-full">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-ebony-muted" />
            </div>
            <input
              type="text"
              placeholder="Buscar aluno por nome..."
              className="w-full pl-10 pr-4 py-3 bg-ebony-deep border border-ebony-border text-white rounded-lg shadow-sm focus:border-ebony-primary placeholder-gray-600 outline-none transition-colors text-sm font-medium"
              value={filtroNome}
              onChange={(e) => setFiltroNome(e.target.value)}
            />
          </div>
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="px-3 py-3 bg-ebony-deep border border-ebony-border text-white rounded-lg shadow-sm focus:border-ebony-primary outline-none transition-colors text-sm font-medium"
          >
            <option value="">Todos os status</option>
            <option value="Respondido">Respondido</option>
            <option value="Finalizado">Finalizado</option>
          </select>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative">
              <label className="absolute -top-2 left-2 text-[9px] text-ebony-muted font-bold uppercase tracking-wider bg-ebony-bg px-1 z-10">De</label>
              <input type="date" className="w-full md:w-40 px-3 py-3 bg-ebony-deep border border-ebony-border text-white rounded-lg shadow-sm focus:border-ebony-primary outline-none transition-colors text-sm font-medium" value={filtroDataInicio} onChange={(e) => setFiltroDataInicio(e.target.value)} />
            </div>
            <div className="relative">
              <label className="absolute -top-2 left-2 text-[9px] text-ebony-muted font-bold uppercase tracking-wider bg-ebony-bg px-1 z-10">Até</label>
              <input type="date" className="w-full md:w-40 px-3 py-3 bg-ebony-deep border border-ebony-border text-white rounded-lg shadow-sm focus:border-ebony-primary outline-none transition-colors text-sm font-medium" value={filtroDataFim} onChange={(e) => setFiltroDataFim(e.target.value)} />
            </div>
          </div>
        </div>

        {/* TABELA */}
        {loading ? (
          <div className="flex flex-col justify-center items-center h-64 opacity-50">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-ebony-primary mb-4"></div>
            <p className="text-ebony-muted text-xs uppercase tracking-widest animate-pulse">Sincronizando...</p>
          </div>
        ) : (
          <div className="bg-ebony-surface rounded-xl shadow-2xl border border-ebony-border overflow-x-auto">
            <table className="w-full min-w-[580px] text-left border-collapse">
              <thead className="bg-ebony-deep border-b border-ebony-border">
                <tr>
                  <th className="p-4 text-[10px] font-bold text-ebony-muted uppercase tracking-wider w-36 text-center">
                    Ações
                  </th>
                  <th className="p-4 text-[10px] font-bold text-ebony-muted uppercase tracking-wider">Aluno</th>
                  <th className="p-4 text-[10px] font-bold text-ebony-muted uppercase tracking-wider min-w-[250px]">Formulário</th>
                  <th className="p-4 text-[10px] font-bold text-ebony-muted uppercase tracking-wider">Respondido em</th>
                  <th className="p-4 text-[10px] font-bold text-ebony-muted uppercase tracking-wider text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ebony-border/40">
                {feedbacksPaginados.map((fb) => {
                  const isSelecionadoComparar = selecionadosComparar.some(f => f.name === fb.name);
                  const notaVinculada = notasVinculadas[fb.name];
                  const hasNote = !!notaVinculada;

                  return (
                    <tr
                      key={fb.name}
                      onClick={() => abrirFeedback(fb)}
                      className={`hover:bg-white/5 transition-colors cursor-pointer group ${isSelecionadoComparar ? 'bg-blue-500/10 border-l-2 border-l-blue-500' : ''}`}
                    >
                      <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-row items-center justify-center gap-2">

                          {/* 1. Comparar os 3 Últimos */}
                          <button
                            onClick={(e) => compararUltimos3(fb, e)}
                            title="Comparar últimos 3 feedbacks"
                            className="w-8 h-8 rounded-lg border border-ebony-border bg-ebony-surface flex items-center justify-center text-ebony-muted hover:text-white hover:border-ebony-primary/50 transition-all shrink-0 shadow-sm relative group"
                          >
                            <Columns size={14} />
                            <span className="absolute -top-1.5 -right-1.5 bg-ebony-primary text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity scale-75 group-hover:scale-100">
                              3
                            </span>
                          </button>

                          {/* 2. Selecionar para comparar */}
                          <button
                            onClick={(e) => toggleComparar(fb, e)}
                            title="Selecionar para comparar"
                            className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 transition-all shadow-sm ${isSelecionadoComparar
                              ? 'bg-ebony-primary/20 border-ebony-primary/50 text-ebony-primary'
                              : 'border-ebony-border bg-ebony-surface text-ebony-muted hover:text-white hover:border-ebony-primary/50'
                              }`}
                          >
                            <CheckCircle size={14} />
                          </button>

                        </div>
                      </td>
                      <td className="p-3 text-sm">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className="font-bold text-white group-hover:text-ebony-primary transition-colors cursor-pointer"
                            onClick={() => abrirFeedback(fb)}
                          >
                            {fb.nome_completo}
                          </span>
                          <button onClick={(e) => { e.stopPropagation(); abrirHistorico(fb); }}
                            className="p-1 hover:bg-ebony-deep rounded text-ebony-muted hover:text-white transition-colors"
                            title="Histórico">
                            <Eye size={12} />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setModalRaioX(fb.nome_completo); }}
                            className="p-1 hover:bg-ebony-deep rounded text-ebony-muted hover:text-white transition-colors"
                            title="Raio-X">
                            <Activity size={12} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const chaveCorreta = gerarChaveNota(fb.email || fb.nome_completo, fb.date);
                              setTextoNotaSimples(notasPorCiclo[chaveCorreta] || '');
                              setModalNotaSimples({ nome: fb.nome_completo, feedbackName: chaveCorreta });
                            }}
                            className={`flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border transition-all ${hasNote
                              ? "text-white bg-ebony-deep border-ebony-border hover:border-ebony-primary/50"
                              : "text-ebony-muted border-transparent hover:text-white hover:bg-ebony-deep hover:border-ebony-border"
                              }`}
                          >
                            <StickyNote size={10} className={hasNote ? "text-ebony-primary" : ""} />
                            {hasNote ? 'Nota' : '+ Nota'}
                          </button>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-1 bg-ebony-deep rounded border border-ebony-border font-mono text-xs text-blue-300">
                          {fb.titulo || fb.formulario}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-white text-xs font-bold">
                            {datasResposta[fb.name] || fb.modified ? (() => {
                              try {
                                const datePart = (fb.modified.split(' ')[0] || '');
                                return new Date(datePart + 'T00:00:00').toLocaleDateString('pt-BR');
                              } catch { return '—'; }
                            })() : '—'}
                          </span>
                          <span className="text-ebony-muted text-[10px] flex items-center gap-1">
                            <Clock size={9} />
                            {datasResposta[fb.name] || fb.modified ? (() => {
                              try {
                                const timePart = (fb.modified.split(' ')[1] || '');
                                return timePart.slice(0, 5);
                              } catch { return ''; }
                            })() : ''}
                          </span>
                          {(() => {
                            // Cruza com drawerDados.planejamento (type=training do feedback_schedules)
                            const dataFb = (datasResposta[fb.name] || fb.date || '').slice(0, 10);
                            const isTroca = drawerDados.planejamento?.some(p => {
                              if (p.studentName !== fb.nome_completo) return false;
                              const diffDias = Math.abs(
                                (new Date(p.date + 'T00:00:00') - new Date(dataFb + 'T00:00:00')) / (1000 * 60 * 60 * 24)
                              );
                              return diffDias <= 14;
                            });
                            return isTroca ? (
                              <span className="text-[9px] font-bold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-1.5 py-0.5 rounded-full w-fit flex items-center gap-1">
                                <Dumbbell size={9} /> Troca
                              </span>
                            ) : null;
                          })()}
                        </div>
                      </td>

                      <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={fb.status || 'Respondido'}
                          onChange={async (e) => {
                            const novoStatus = e.target.value;
                            // Atualização otimista local
                            setListaFeedbacks(prev => prev.map(item =>
                              item.name === fb.name ? { ...item, status: novoStatus } : item
                            ));
                            try {
                              const atualizar = httpsCallable(functions, 'atualizarStatusFeedback');
                              await atualizar({ id: fb.name, status: novoStatus });
                              const refData = doc(db, "feedbacks_respondidos_em", fb.name);
                              const snapData = await getDoc(refData);
                              if (!snapData.exists()) {
                                const dataAtual = fb.modified;
                                await setDoc(refData, { data: dataAtual });
                                setDatasResposta(prev => ({ ...prev, [fb.name]: dataAtual }));
                              }
                            } catch (err) {
                              console.error("Erro ao atualizar status na lista", err);
                              alert("Erro ao salvar status.");
                            }
                          }}
                className={`px-1 py-1 rounded-md text-[10px] font-bold uppercase tracking-normal border outline-none cursor-pointer appearance-none text-center w-full ${fb.status === 'Finalizado'                            ? 'bg-green-500/10 text-green-400 border-green-500/20'
                            : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                            }`}
                        >
                          <option value="Respondido" className="bg-ebony-deep text-purple-400">Respondido</option>
                          <option value="Finalizado" className="bg-ebony-deep text-green-400">Finalizado</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {feedbacksPaginados.length === 0 && (
              <div className="p-12 text-center">
                <MessageSquare className="w-12 h-12 text-ebony-border mx-auto mb-3 opacity-20" />
                <p className="text-ebony-muted text-sm">Nenhum feedback encontrado.</p>
              </div>
            )}

            {/* BOTÃO CARREGAR MAIS */}
            {temMais && (
              <div className="p-4 border-t border-ebony-border text-center">
                <button
                  onClick={() => setPaginaAtual(prev => prev + 1)}
                  className="px-6 py-2.5 bg-ebony-deep border border-ebony-border hover:border-ebony-primary text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all hover:shadow-lg"
                >
                  Carregar mais feedbacks ({feedbacksFiltrados.length - feedbacksPaginados.length} restantes)
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ================================================================
  // VIEW: DETALHES
  // ================================================================
  return (
    <div className="w-full h-full flex flex-col bg-ebony-bg text-ebony-text animate-in slide-in-from-right-8 duration-300">

      {/* HEADER */}
      <div className="shrink-0 bg-ebony-bg/95 backdrop-blur-md z-20 border-b border-ebony-border px-6 py-3 flex items-center justify-between">
        <button
          onClick={() => setView('list')}
          className="flex items-center gap-2 text-ebony-muted hover:text-white transition-colors text-xs font-bold uppercase tracking-wide"
        >
          <ArrowLeft size={16} /> Voltar
        </button>

        {/* STATUS DROPDOWN */}
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-ebony-muted font-bold uppercase tracking-wider hidden md:block">Status:</span>
          <select
            value={statusLocal}
            onChange={(e) => salvarStatus(e.target.value)}
            disabled={salvandoStatus}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider border outline-none cursor-pointer transition-all ${statusLocal === 'Finalizado'
              ? 'bg-green-500/10 text-green-400 border-green-500/30'
              : 'bg-purple-500/10 text-purple-400 border-purple-500/30'
              } ${salvandoStatus ? 'opacity-50' : ''}`}
          >
            <option value="Respondido">Respondido</option>
            <option value="Finalizado">Finalizado</option>
          </select>
          {salvandoStatus && <RefreshCw size={14} className="text-ebony-muted animate-spin" />}

          {!modoTrocarFoto ? (
            <button
              onClick={() => { setModoTrocarFoto(true); setFotosSelecionadasTroca([]); }}
              className="px-3 py-1.5 bg-ebony-surface border border-ebony-border hover:border-orange-500/50 text-orange-300 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
            >
              🔄 Trocar Fotos
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-orange-300 font-bold">{fotosSelecionadasTroca.length}/2 selecionadas</span>
              <button
                onClick={confirmarTrocaFotos}
                disabled={fotosSelecionadasTroca.length !== 2 || salvandoTroca}
                className="px-3 py-1.5 bg-orange-500/20 border border-orange-500/40 text-orange-300 rounded-lg text-xs font-bold transition-all disabled:opacity-30"
              >
                {salvandoTroca ? 'Salvando...' : 'Confirmar Troca'}
              </button>
              <button
                onClick={() => { setModoTrocarFoto(false); setFotosSelecionadasTroca([]); }}
                className="px-2 py-1.5 bg-ebony-surface border border-ebony-border hover:border-red-500/50 text-red-400 rounded-lg text-xs font-bold transition-all"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 custom-scrollbar">

        {/* BOTÕES FLUTUANTES */}
        {!loadingDetalhe && detalhesCarregados && (
          <>
            <button
              onClick={() => navegar(-1)}
              disabled={feedbacksFiltrados.findIndex(f => f.name === feedbackSelecionado?.name) <= 0}
              className="fixed left-20 md:left-24 top-1/2 -translate-y-1/2 z-30 p-2 md:p-3 bg-ebony-surface/90 backdrop-blur border border-ebony-border rounded-full shadow-xl hover:bg-ebony-deep hover:border-ebony-primary/50 disabled:opacity-20 disabled:cursor-not-allowed text-white transition-all"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={() => navegar(1)}
              disabled={feedbacksFiltrados.findIndex(f => f.name === feedbackSelecionado?.name) >= feedbacksFiltrados.length - 1}
              className="fixed right-2 md:right-4 top-1/2 -translate-y-1/2 z-30 p-2 md:p-3 bg-ebony-surface/90 backdrop-blur border border-ebony-border rounded-full shadow-xl hover:bg-ebony-deep hover:border-ebony-primary/50 disabled:opacity-20 disabled:cursor-not-allowed text-white transition-all"
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}

        {loadingDetalhe || !detalhesCarregados ? (
          <div className="flex flex-col justify-center items-center h-full">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-ebony-primary mb-3"></div>
            <p className="text-ebony-muted text-xs font-bold uppercase tracking-widest animate-pulse">Carregando...</p>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-4">

            {/* INFO DO ALUNO */}
            <div className="bg-ebony-surface px-4 py-2.5 rounded-xl border border-ebony-border shadow-sm flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <User className="w-4 h-4 text-ebony-muted shrink-0" />
                <h1 className="text-sm font-black text-white leading-none">{detalhesCarregados.nome_completo}</h1>
              </div>
              <div className="flex items-center gap-3 text-ebony-muted text-[10px] font-bold uppercase tracking-wide flex-wrap">
                <span className="flex items-center gap-1"><Calendar size={11} /> {detalhesCarregados.date ? new Date(detalhesCarregados.date + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</span>
                <span className="flex items-center gap-1 text-blue-300"><FileText size={11} /> {detalhesCarregados.titulo}</span>
                <span className="flex items-center gap-1">{detalhesCarregados.email}</span>
                <span className="flex items-center gap-1"><Clock size={11} /> {formatDateTime(detalhesCarregados.modified)}</span>
              </div>
            </div>

            {/* PERGUNTAS E RESPOSTAS - NOVO LAYOUT TABELA */}
            <div className="bg-ebony-surface rounded-xl border border-ebony-border overflow-hidden">
              <table className="w-full text-left border-collapse">
                <tbody className="divide-y divide-ebony-border/40">
                  {detalhesCarregados.perguntas_e_respostas?.map((item, idx) => {
                    // TIPO 1: QUEBRA DE SEÇÃO (Cabeçalho da Tabela)
                    if (item.tipo === 'Quebra de Seção') {
                      return (
                        <tr key={idx} className="bg-ebony-deep">
                          <td colSpan={2} className="p-4">
                            <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                              {item.pergunta}
                            </h2>
                          </td>
                        </tr>
                      );
                    }

                    // TIPO 2: FOTO (Mantém layout vertical para ocupar espaço, mas dentro da tabela)
                    if (item.tipo === 'Anexar Imagem') {
                      const rotationKey = `${detalhesCarregados.name}_${idx}`;
                      const rotation = rotations[rotationKey] || 0;
                      return (
                        <tr key={idx} className="hover:bg-white/5 transition-colors">
                          <td colSpan={2} className="p-0 w-full">
                            <div className="px-4 pt-3 pb-1">
                              <h3 className="text-white text-xs font-bold leading-relaxed">{item.pergunta}</h3>
                            </div>
                            <div className="w-full pb-4">
                              {item.resposta ? (
                                <div className="relative">
                                  <ImagemInterativa
                                    id={detalhesCarregados.name}
                                    index={idx}
                                    src={`${FRAPPE_URL}${item.resposta}`}
                                    rotation90={rotation}
                                    onRotate90={() => toggleRotation(detalhesCarregados.name, idx)}
                                  />
                                  {modoTrocarFoto && (() => {
                                    const key = `${detalhesCarregados.name}_${idx}`;
                                    const ordemSel = fotosSelecionadasTroca.findIndex(f => f.key === key);
                                    const selecionada = ordemSel !== -1;
                                    return (
                                      <div
                                        onClick={() => selecionarFotoParaTroca(detalhesCarregados.name, idx)}
                                        className={`absolute inset-0 rounded-lg cursor-pointer flex items-start justify-end p-2 transition-all z-10 ${selecionada ? 'bg-orange-500/20 border-2 border-orange-400' : 'bg-black/30 border-2 border-dashed border-orange-400/40 hover:bg-orange-500/10'}`}
                                      >
                                        {selecionada && (
                                          <span className="bg-orange-500 text-white text-xs font-black w-6 h-6 rounded-full flex items-center justify-center shadow-lg">
                                            {ordemSel + 1}
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })()}
                                </div>
                              ) : (
                                <span className="text-ebony-muted text-xs italic px-4">Não enviada</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    // TIPO 3: TEXTO / RATING / SELECT (Layout Lado a Lado)
                    return (
                      <tr key={idx} className="hover:bg-white/5 transition-colors">
                        {/* COLUNA DA ESQUERDA: PERGUNTA */}
                        <td className="p-4 w-1/3 align-top border-r border-ebony-border/30">
                          <h3 className="text-white text-xs font-bold leading-relaxed">
                            {item.pergunta}
                          </h3>
                        </td>

                        {/* COLUNA DA DIREITA: RESPOSTA */}
                        <td className="p-4 align-top text-sm text-ebony-text leading-relaxed">
                          {item.tipo === 'Avaliação' ? (
                            <div className="flex items-center gap-1">
                              {Array.from({ length: parseInt(item.opcoes) || 5 }, (_, i) => (
                                <Star key={i} size={16} className={i < (parseInt(item.resposta) || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-ebony-border'} />
                              ))}
                              <span className="text-ebony-muted text-xs ml-2 font-mono">({item.resposta}/{item.opcoes})</span>
                            </div>
                          ) : (
                            item.resposta || <span className="text-ebony-muted italic opacity-50">Não respondida</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}