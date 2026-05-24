import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft, Play, AlertCircle, CheckCircle2, Check, Replace, Ban,
  StickyNote, Trophy, Info, Eye, ExternalLink, X,
} from 'lucide-react'
import { FormGroup, Select, Spinner, Textarea } from '../../components/ui'
import {
  buscarTreinoDetalhe, finalizarTreino, verificarTreinoFinalizado,
} from '../../api/treino'

// ============================================================
// Tokens visuais
// ============================================================

const CARD = 'bg-[#0d2042] border border-[#1c3661] rounded-2xl'
const CARD_DESTAQUE = 'bg-[#16306a] border border-[#2563eb]/60 rounded-2xl'
const LABEL = 'text-[#60a5fa] text-[10px] font-bold uppercase tracking-widest'

// ============================================================
// Helpers
// ============================================================

const storageKey = (fichaId, treinoId) => `treino-${fichaId}-${treinoId}`

const carregarEstadoLocal = (fichaId, treinoId) => {
  try {
    const raw = localStorage.getItem(storageKey(fichaId, treinoId))
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

const salvarEstadoLocal = (fichaId, treinoId, dados) => {
  try {
    localStorage.setItem(storageKey(fichaId, treinoId), JSON.stringify(dados))
  } catch (err) { console.warn('localStorage falhou:', err) }
}

const limparEstadoLocal = (fichaId, treinoId) => {
  try { localStorage.removeItem(storageKey(fichaId, treinoId)) } catch (err) { void err }
}

const parseTempo = (str) => {
  if (!str) return 0
  const s = String(str).trim()
  if (s.includes(':')) {
    const [m, sec] = s.split(':').map(p => parseInt(p, 10) || 0)
    return m * 60 + sec
  }
  return parseInt(s, 10) || 0
}

const parseDescanso = (descanso) => {
  if (!descanso) return { lower: 60, upper: 60 }
  const partes = String(descanso).split(/\s*(?:a|-|–|—|ate|até)\s*/i)
  if (partes.length === 2) {
    return { lower: parseTempo(partes[0]), upper: parseTempo(partes[1]) }
  }
  const t = parseTempo(partes[0])
  return { lower: t, upper: t }
}

const formatarTempo = (segundos) => {
  if (segundos < 0) segundos = 0
  const h = Math.floor(segundos / 3600)
  const m = Math.floor((segundos % 3600) / 60)
  const s = segundos % 60
  const pad = (n) => String(n).padStart(2, '0')
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`
  return `${pad(m)}:${pad(s)}`
}

const formatarTempoLongo = (segundos) => {
  const h = Math.floor(segundos / 3600)
  const m = Math.floor((segundos % 3600) / 60)
  const s = segundos % 60
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(h)}:${pad(m)}:${pad(s)}`
}

const achatarExercicios = (lista) => {
  const out = []
  for (const item of lista || []) {
    if (item.tipo === 'combinado') {
      for (const e of (item.exercicios || [])) out.push(e)
    } else {
      out.push(item.exercicio)
    }
  }
  return out
}

const inicializarEstado = (fichaId, treinoId, alongamentos, exercicios) => {
  const dict = {}
  for (const a of alongamentos || []) {
    dict[a.name] = {
      concluido: false, pulado: false, carga: 0,
      feedback: '', exercicio_substituto: null,
      series: [],
    }
  }
  for (const ex of achatarExercicios(exercicios)) {
    const series = Math.max(parseInt(ex.series, 10) || 0, 0)
    dict[ex.name] = {
      concluido: false, pulado: false, carga: 0,
      feedback: '', exercicio_substituto: null,
      series: Array.from({ length: series }, () => ({
        repeticoes: 0, carga: 0, concluida: false, nota: '',
      })),
    }
  }
  return {
    fichaId, treinoId, inicio: null, finalizado: false,
    descanso: null,
    exercicios: dict,
  }
}

// ============================================================
// VideoEmbed — thumbnail click vira iframe inline (YT, Vimeo, Drive)
// ============================================================

const getYouTubeEmbed = (id) => `https://www.youtube.com/embed/${id}?rel=0&autoplay=1&modestbranding=1`
const getVimeoEmbed = (id) => `https://player.vimeo.com/video/${id}?autoplay=1`
const getDriveEmbed = (id) => `https://drive.google.com/file/d/${id}/preview`
const getYouTubeThumb = (id) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`

function VideoEmbed({ id, plataforma }) {
  const [aberto, setAberto] = useState(false)
  const [modalCheio, setModalCheio] = useState(false)
  if (!id) return null
  const plat = (plataforma || 'YouTube').toLowerCase()
  const ehDrive = plat.includes('drive')
  const ehVimeo = plat.includes('vimeo')

  // Drive: player embarcado e limitado. Abrimos em modal verdadeiramente fullscreen
  // (iframe ocupa 100% da viewport) com so um botao flutuante de fechar — assim o
  // player do Google tem o maximo de espaco e a experiencia fica decente.
  if (ehDrive) {
    return (
      <>
        <button
          type="button"
          onClick={() => setModalCheio(true)}
          className="relative w-full aspect-video rounded-xl overflow-hidden border border-[#1c3661] bg-gradient-to-br from-[#16306a] to-[#08152e] group flex items-center justify-center"
        >
          <span className="absolute top-2 left-2 text-[10px] font-bold uppercase tracking-widest text-[#60a5fa] bg-black/60 px-2 py-0.5 rounded">
            Google Drive
          </span>
          <div className="h-14 w-14 rounded-full bg-[#2563eb] flex items-center justify-center shadow-[0_0_28px_rgba(37,99,235,0.6)] group-hover:scale-110 transition-transform">
            <Play size={22} className="text-white fill-white ml-0.5" />
          </div>
          <span className="absolute bottom-2 text-[10px] text-[#8ba6c8]">
            Toque para ver em tela cheia
          </span>
        </button>
        {modalCheio && (
          <div className="fixed inset-0 z-[200] bg-black">
            <iframe
              src={getDriveEmbed(id)}
              title="Video"
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              className="w-full h-full border-0"
            />
            <button
              onClick={() => setModalCheio(false)}
              className="fixed top-3 right-3 z-10 h-10 w-10 flex items-center justify-center rounded-full bg-black/70 backdrop-blur text-white border border-white/20 hover:bg-black/90 transition-colors shadow-lg"
              style={{ top: 'max(0.75rem, env(safe-area-inset-top))' }}
              aria-label="Fechar"
            >
              <X size={18} />
            </button>
          </div>
        )}
      </>
    )
  }

  if (aberto) {
    const src = ehVimeo ? getVimeoEmbed(id) : getYouTubeEmbed(id)
    return (
      <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-[#1c3661] bg-black">
        <iframe
          src={src}
          title="Video"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          className="w-full h-full"
        />
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setAberto(true)}
      className="relative w-full aspect-video rounded-xl overflow-hidden border border-[#1c3661] bg-black group"
    >
      {ehVimeo ? (
        <div className="w-full h-full bg-gradient-to-br from-[#16306a] to-[#08152e] flex items-center justify-center">
          <span className="text-[#60a5fa] text-xs uppercase tracking-widest font-bold">Vimeo</span>
        </div>
      ) : (
        <img
          src={getYouTubeThumb(id)}
          alt="Thumbnail"
          loading="lazy"
          className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
          onError={(e) => { e.currentTarget.style.display = 'none' }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-black/0 to-black/40" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="h-14 w-14 rounded-full bg-[#2563eb] flex items-center justify-center shadow-[0_0_28px_rgba(37,99,235,0.6)] group-hover:scale-110 transition-transform">
          <Play size={22} className="text-white fill-white ml-0.5" />
        </div>
      </div>
    </button>
  )
}

// ============================================================
// Cronometros — fixed top sobrepoe o header do AlunoLayout
// ============================================================

function CronometrosBar({ inicioMs, agora, descanso, onPularDescanso }) {
  const elapsedTreino = Math.max(0, Math.floor((agora - inicioMs) / 1000))
  let statusEl = (
    <span className="text-white/80 text-xs font-medium">Pronto para a proxima serie</span>
  )

  if (descanso?.ativo) {
    const elapsedDesc = Math.max(0, Math.floor((agora - descanso.inicioMs) / 1000))
    const total = descanso.upper || descanso.lower || 60
    const ratio = elapsedDesc / Math.max(total, 1)
    let cor = 'text-white'
    if (ratio >= 1) cor = 'text-red-300'
    else if (ratio >= 0.7) cor = 'text-orange-200'
    statusEl = (
      <>
        <span className={`text-xs font-bold tabular-nums ${cor}`}>
          Descansando - {formatarTempo(elapsedDesc)}
        </span>
        <button
          onClick={onPularDescanso}
          className="h-7 px-2 rounded-md bg-white/15 hover:bg-white/25 text-white text-[10px] font-bold uppercase tracking-widest transition-colors"
        >
          Pular
        </button>
      </>
    )
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] bg-[#0d4f5c] border-b border-[#1c6877] shadow-[0_4px_18px_rgba(13,79,92,0.6)]">
      <div className="px-4 py-2.5 flex items-center justify-between gap-3">
        <span className="text-white text-base font-bold tabular-nums">
          {formatarTempoLongo(elapsedTreino)}
        </span>
        <div className="flex items-center gap-2 min-w-0">{statusEl}</div>
      </div>
    </div>
  )
}

// ============================================================
// Linha de serie — layout final igual ao print
// ============================================================

function SerieLinha({ exercicio, idx, serie, onUpdate, onConcluir, onAnotar }) {
  const tipoSerie = exercicio.tipo_de_serie_list?.[idx] || ''
  const hist = exercicio.historico_series?.[idx]
  const concluida = serie.concluida === true

  // Quando concluida: linha inteira com opacidade reduzida (50%). So o botao
  // de check muda de cor (verde sinaliza o status). Sem badges/borders verdes.
  return (
    <div className={`flex flex-col gap-1 transition-opacity ${concluida ? 'opacity-50' : ''}`}>
      <div className="flex items-center gap-2.5">
        <div className="min-w-[88px]">
          <p className="text-white text-sm font-bold">Serie {idx + 1}</p>
          {tipoSerie && (
            <p className="text-[#8ba6c8] text-[11px]">{tipoSerie}</p>
          )}
        </div>
        <input
          type="number"
          inputMode="numeric"
          placeholder="Reps"
          value={serie.repeticoes || ''}
          onChange={(e) => onUpdate({ repeticoes: parseInt(e.target.value, 10) || 0 })}
          className="w-16 h-9 px-2 bg-[#0a1a35] border border-[#1c3661] text-white rounded-full text-xs outline-none focus:border-[#2563eb] placeholder:text-[#8ba6c8] text-center font-bold"
        />
        <input
          type="number"
          inputMode="decimal"
          step="0.5"
          placeholder="Kg"
          value={serie.carga || ''}
          onChange={(e) => onUpdate({ carga: parseFloat(e.target.value) || 0 })}
          className="w-16 h-9 px-2 bg-[#0a1a35] border border-[#1c3661] text-white rounded-full text-xs outline-none focus:border-[#2563eb] placeholder:text-[#8ba6c8] text-center font-bold"
        />
        <button
          onClick={onAnotar}
          title="Anotar"
          className={`h-9 w-9 flex items-center justify-center rounded-lg transition-colors shrink-0 ${
            serie.nota
              ? 'text-[#60a5fa] bg-[#0a2956] border border-[#2563eb]/60'
              : 'text-white bg-[#0a1a35] border border-[#1c3661] hover:bg-[#13294e]'
          }`}
        >
          <StickyNote size={14} />
        </button>
        <button
          onClick={onConcluir}
          title={concluida ? 'Desfazer' : 'Concluir serie'}
          className="h-9 w-9 flex items-center justify-center rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition-colors shrink-0"
        >
          <Check size={15} strokeWidth={3} />
        </button>
      </div>
      {hist?.repeticoes != null && (
        <p className="text-[#8ba6c8] text-[11px] pl-[88px] ml-2.5">
          historico: {hist.repeticoes} reps - {hist.carga}kg
        </p>
      )}
      {serie.nota && (
        <p className="text-[#60a5fa] text-[11px] italic pl-[88px] ml-2.5">{serie.nota}</p>
      )}
    </div>
  )
}

// ============================================================
// ExercicioBody (modo execucao) - usado em simples e dentro de combinado
// ============================================================

function ExercicioBody({
  exercicio, estado, onSubstituir, onPular, onUpdateSerie, onConcluirSerie,
  onAnotarSerie, onConcluirExercicio, onFeedback,
}) {
  const pulado = estado?.pulado === true
  const concluido = estado?.concluido === true
  const tituloFinal = estado?.exercicio_substituto
    ? `${exercicio.exercicio} (Substituto: ${estado.exercicio_substituto})`
    : exercicio.exercicio
  const series = estado?.series || []
  const semSeries = series.length === 0

  return (
    <div className={`transition-opacity ${pulado ? 'opacity-40' : concluido ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {exercicio.grupo_muscular && (
            <p className="text-[#60a5fa] text-[9px] font-bold uppercase tracking-widest">
              {exercicio.grupo_muscular}
            </p>
          )}
          <p className="text-white text-sm font-bold mt-0.5 leading-snug">
            {tituloFinal}
          </p>
          <p className="text-[#60a5fa] text-[11px] mt-1">
            {exercicio.series ? `${exercicio.series}x ` : ''}{exercicio.repeticoes || '-'}
            {exercicio.descanso && ` - desc ${exercicio.descanso}`}
            {exercicio.carga_sugerida ? ` - sugerido ${exercicio.carga_sugerida}kg` : ''}
          </p>
          {exercicio.observacao && (
            <p className="text-[#60a5fa] text-[11px] mt-1.5 leading-relaxed">
              {exercicio.observacao}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onSubstituir}
            title="Substituir"
            className="h-7 w-7 flex items-center justify-center text-[#60a5fa] hover:text-white border border-[#2563eb]/40 hover:bg-[#2563eb] rounded-lg transition-colors"
          >
            <Replace size={12} />
          </button>
          <button
            onClick={onPular}
            title="Pular"
            className="h-7 w-7 flex items-center justify-center text-red-400 hover:text-white border border-red-500/30 hover:bg-red-600 rounded-lg transition-colors"
          >
            <Ban size={12} />
          </button>
        </div>
      </div>

      {exercicio.video && (
        <div className="mt-3">
          <VideoEmbed id={exercicio.video} plataforma={exercicio.plataforma_video} />
        </div>
      )}

      {!pulado && series.length > 0 && (
        <div className="flex flex-col gap-3 mt-4">
          {series.map((s, idx) => (
            <SerieLinha
              key={idx}
              exercicio={exercicio}
              idx={idx}
              serie={s}
              onUpdate={(patch) => onUpdateSerie(idx, patch)}
              onConcluir={() => onConcluirSerie(idx, exercicio.descanso)}
              onAnotar={() => onAnotarSerie(idx)}
            />
          ))}
        </div>
      )}

      {!pulado && semSeries && (
        <button
          onClick={onConcluirExercicio}
          className={`w-full mt-3 h-10 rounded-lg flex items-center justify-center gap-2 text-xs font-bold transition-colors ${
            concluido
              ? 'bg-emerald-600 text-white'
              : 'bg-emerald-500 hover:bg-emerald-600 text-white'
          }`}
        >
          <CheckCircle2 size={14} /> {concluido ? 'Concluido' : 'Marcar concluido'}
        </button>
      )}

      {!pulado && (
        <textarea
          value={estado?.feedback || ''}
          onChange={(e) => onFeedback(e.target.value)}
          placeholder="Como foi a execucao?"
          rows={2}
          className="w-full mt-3 px-3 py-2 bg-[#08152e] border border-[#1c3661] text-white rounded-lg text-xs outline-none focus:border-[#2563eb] resize-none placeholder:text-[#5b7ba3]"
        />
      )}
    </div>
  )
}

// ============================================================
// AlongamentoCard
// ============================================================

function AlongamentoCard({ alongamento, estado, onConcluir, onFeedback }) {
  const concluido = estado?.concluido === true
  return (
    <div className={`${CARD} px-4 py-4 transition-opacity ${concluido ? 'opacity-50' : ''}`}>
      <p className="text-white text-xs font-bold uppercase tracking-wider leading-snug">
        {alongamento.exercicio}
      </p>
      <p className="text-[#8ba6c8] text-[11px] mt-1">
        {alongamento.series} {alongamento.series === 1 ? 'serie' : 'series'}
        {alongamento.observacoes && ` - ${alongamento.observacoes}`}
      </p>

      {alongamento.video && (
        <div className="mt-3">
          <VideoEmbed id={alongamento.video} plataforma={alongamento.plataforma_video} />
        </div>
      )}

      <textarea
        value={estado?.feedback || ''}
        onChange={(e) => onFeedback(e.target.value)}
        placeholder="Como foi? Observacoes..."
        rows={2}
        className="w-full mt-3 px-3 py-2 bg-[#08152e] border border-[#1c3661] text-white rounded-lg text-xs outline-none focus:border-[#2563eb] resize-none placeholder:text-[#5b7ba3]"
      />
      <button
        onClick={onConcluir}
        className="w-full mt-3 h-10 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors"
      >
        <Check size={14} strokeWidth={3} /> Concluido
      </button>
    </div>
  )
}

// ============================================================
// Modo Visualizacao - card compacto so com botao "Ver execucao"
// ============================================================

function VerExercicioInline({ titulo, sub, video, plataforma_video, uppercase }) {
  const [aberto, setAberto] = useState(false)
  return (
    <div className={`${CARD} px-4 py-3`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`text-white text-sm font-bold leading-snug ${uppercase ? 'uppercase tracking-wider' : ''}`}>
            {titulo}
          </p>
          {sub && <p className="text-[#8ba6c8] text-[11px] mt-0.5">{sub}</p>}
        </div>
      </div>
      {video && (
        <button
          type="button"
          onClick={() => setAberto(prev => !prev)}
          className="w-full mt-3 h-9 rounded-lg bg-cyan-500/15 border border-cyan-400/40 text-cyan-300 text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-cyan-500/25 transition-colors"
        >
          {aberto ? <Eye size={13} /> : <Play size={13} className="fill-current" />}
          {aberto ? 'Ocultar' : 'Ver execucao'}
        </button>
      )}
      {aberto && video && (
        <div className="mt-3">
          <VideoEmbed id={video} plataforma={plataforma_video} />
        </div>
      )}
    </div>
  )
}

// ============================================================
// ExercicioCard execucao (wrapper simples ou combinado)
// ============================================================

function ExercicioCard({
  item, estados,
  onSubstituir, onPular, onUpdateSerie, onConcluirSerie, onAnotarSerie,
  onConcluirExercicio, onFeedback,
}) {
  if (item.tipo === 'combinado') {
    const lista = item.exercicios || []
    return (
      <div className={`${CARD} px-4 py-4 border-l-[5px] !border-l-emerald-400 shadow-[0_0_18px_rgba(74,222,128,0.12)]`}>
        {item.titulo && (
          <div className="flex items-center gap-2 mb-3">
            <span className="px-2 py-0.5 rounded-md bg-emerald-900/40 text-emerald-300 text-[9px] font-bold uppercase tracking-widest border border-emerald-500/40">
              {item.titulo}
            </span>
            <span className="text-[#8ba6c8] text-[10px]">Execute em sequencia</span>
          </div>
        )}
        <div className="flex flex-col gap-5">
          {lista.map((ex, i) => (
            <div key={ex.name} className="pl-3 border-l-2 border-emerald-500/30">
              <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-300 block mb-2">
                {i + 1}/{lista.length}
              </span>
              <ExercicioBody
                exercicio={ex}
                estado={estados?.[ex.name]}
                onSubstituir={() => onSubstituir(ex.name, ex.exercicio)}
                onPular={() => onPular(ex.name)}
                onUpdateSerie={(idx, patch) => onUpdateSerie(ex.name, idx, patch)}
                onConcluirSerie={(idx, desc) => onConcluirSerie(ex.name, idx, desc)}
                onAnotarSerie={(idx) => onAnotarSerie(ex.name, idx)}
                onConcluirExercicio={() => onConcluirExercicio(ex.name)}
                onFeedback={(v) => onFeedback(ex.name, v)}
              />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const ex = item.exercicio
  return (
    <div className={`${CARD} px-4 py-4`}>
      <ExercicioBody
        exercicio={ex}
        estado={estados?.[ex.name]}
        onSubstituir={() => onSubstituir(ex.name, ex.exercicio)}
        onPular={() => onPular(ex.name)}
        onUpdateSerie={(idx, patch) => onUpdateSerie(ex.name, idx, patch)}
        onConcluirSerie={(idx, desc) => onConcluirSerie(ex.name, idx, desc)}
        onAnotarSerie={(idx) => onAnotarSerie(ex.name, idx)}
        onConcluirExercicio={() => onConcluirExercicio(ex.name)}
        onFeedback={(v) => onFeedback(ex.name, v)}
      />
    </div>
  )
}

// ============================================================
// PromptModal — input de texto
// ============================================================

function PromptModal({ aberto, title, subtitle, placeholder, initialValue, confirmLabel, onConfirm, onClose }) {
  const [valor, setValor] = useState('')
  useEffect(() => { if (aberto) setValor(initialValue || '') }, [aberto, initialValue])
  if (!aberto) return null

  const submit = () => onConfirm(valor.trim())

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-3"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[420px] bg-[#0d2042] border border-[#1c3661] rounded-2xl shadow-[0_25px_50px_rgba(0,0,0,0.6)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-[#1c3661]">
          <p className="text-white text-sm font-bold">{title}</p>
          {subtitle && <p className="text-[#8ba6c8] text-[11px] mt-0.5">{subtitle}</p>}
        </div>
        <div className="p-4">
          <input
            type="text"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder={placeholder || ''}
            autoFocus
            className="w-full h-10 px-3 bg-[#08152e] border border-[#1c3661] text-white rounded-lg text-sm outline-none focus:border-[#2563eb] placeholder:text-[#5b7ba3]"
          />
        </div>
        <div className="px-4 py-3 border-t border-[#1c3661] flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="h-9 px-4 rounded-lg border border-[#1c3661] text-gray-300 text-xs font-bold hover:bg-[#13294e] transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={submit}
            className="h-9 px-4 rounded-lg bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-bold transition-colors"
          >
            {confirmLabel || 'OK'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// ConfirmModal — confirmacao simples
// ============================================================

function ConfirmModal({ aberto, title, message, confirmLabel, confirmVariant, onConfirm, onClose }) {
  if (!aberto) return null
  const variantClass = confirmVariant === 'danger'
    ? 'bg-red-600 hover:bg-red-700 text-white'
    : 'bg-[#2563eb] hover:bg-[#1d4ed8] text-white'

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-3"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[380px] bg-[#0d2042] border border-[#1c3661] rounded-2xl shadow-[0_25px_50px_rgba(0,0,0,0.6)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-4">
          <p className="text-white text-sm font-bold">{title}</p>
          {message && <p className="text-[#8ba6c8] text-xs mt-1.5 leading-relaxed">{message}</p>}
        </div>
        <div className="px-4 pb-4 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="h-9 px-4 rounded-lg border border-[#1c3661] text-gray-300 text-xs font-bold hover:bg-[#13294e] transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className={`h-9 px-4 rounded-lg text-xs font-bold transition-colors ${variantClass}`}
          >
            {confirmLabel || 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// FinalizarPopup — modal customizado pequeno (NAO fullscreen)
// ============================================================

const INTENSIDADES = ['Muito leve', 'Leve', 'Moderado', 'Intenso', 'Muito intenso', 'Exaustivo']

function FinalizarPopup({ aberto, onClose, onConfirmar, enviando }) {
  const [intensidade, setIntensidade] = useState('')
  const [feedback, setFeedback] = useState('')
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (aberto) { setIntensidade(''); setFeedback(''); setErro('') }
  }, [aberto])

  if (!aberto) return null

  const submit = () => {
    if (!intensidade) { setErro('Selecione a intensidade do treino.'); return }
    onConfirmar({ intensidade, feedback })
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-3"
      onClick={enviando ? undefined : onClose}
    >
      <div
        className="w-full max-w-[420px] bg-[#0d2042] border border-[#1c3661] rounded-2xl shadow-[0_25px_50px_rgba(0,0,0,0.6)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-[#1c3661]">
          <p className="text-white text-sm font-bold">Finalizar treino</p>
          <p className="text-[#8ba6c8] text-[11px] mt-0.5">Conta como foi sua sessao</p>
        </div>
        <div className="p-4 space-y-3">
          <FormGroup label="Intensidade" required error={erro}>
            <Select
              value={intensidade}
              onChange={setIntensidade}
              placeholder="Selecione..."
              options={INTENSIDADES.map(v => ({ value: v, label: v }))}
            />
          </FormGroup>
          <FormGroup label="Feedback" hint="Opcional">
            <Textarea
              value={feedback}
              onChange={setFeedback}
              placeholder="Cargas, sensacoes, observacoes..."
              rows={3}
            />
          </FormGroup>
        </div>
        <div className="px-4 py-3 border-t border-[#1c3661] flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            disabled={enviando}
            className="h-9 px-4 rounded-lg border border-[#1c3661] text-gray-300 text-xs font-bold hover:bg-[#13294e] disabled:opacity-50 transition-colors"
          >
            Voltar
          </button>
          <button
            onClick={submit}
            disabled={enviando}
            className="h-9 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-60 transition-colors"
          >
            <Trophy size={13} />
            {enviando ? 'Enviando...' : 'Finalizar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Main
// ============================================================

export default function TreinoExecucao() {
  const { fichaName, treinoId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const treinoIdDecoded = decodeURIComponent(treinoId || '')
  const modoVer = searchParams.get('modo') === 'ver'

  const [dados, setDados] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)
  const [jaFinalizadoHoje, setJaFinalizadoHoje] = useState(false)

  const [estado, setEstado] = useState(null)
  const [agora, setAgora] = useState(() => Date.now())
  const [modalFinalizar, setModalFinalizar] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [toast, setToast] = useState(null)
  // Modais customizados (substituem window.prompt/confirm)
  const [promptState, setPromptState] = useState(null) // { title, subtitle, placeholder, initialValue, confirmLabel, onConfirm }
  const [confirmState, setConfirmState] = useState(null) // { title, message, confirmLabel, confirmVariant, onConfirm }

  // Carrega backend + verifica anti-duplicacao
  useEffect(() => {
    let cancelado = false
    setCarregando(true)
    const promisesBase = [buscarTreinoDetalhe(fichaName, treinoIdDecoded)]
    if (!modoVer) {
      promisesBase.push(verificarTreinoFinalizado(fichaName, treinoIdDecoded).catch(() => ({ finalizado: false })))
    }
    Promise.all(promisesBase)
      .then(([detalhe, verif]) => {
        if (cancelado) return
        if (!detalhe) { setErro('Treino nao encontrado ou voce nao tem acesso.'); return }
        setDados(detalhe)

        if (modoVer) return // modo visualizacao nao precisa de estado

        if (verif?.finalizado) {
          setJaFinalizadoHoje(true)
          limparEstadoLocal(fichaName, treinoIdDecoded)
          return
        }

        const estadoExistente = carregarEstadoLocal(fichaName, treinoIdDecoded)
        if (estadoExistente && estadoExistente.inicio && !estadoExistente.finalizado) {
          // Limpa descanso se ja venceu antes da retomada
          if (estadoExistente.descanso?.ativo) {
            const total = estadoExistente.descanso.upper || estadoExistente.descanso.lower || 0
            const elapsed = (Date.now() - estadoExistente.descanso.inicioMs) / 1000
            if (elapsed > total + 30) {
              estadoExistente.descanso = null
            }
          }
          setEstado(estadoExistente)
        } else {
          // Auto-inicia: cria estado + grava inicio = agora
          const novo = inicializarEstado(fichaName, treinoIdDecoded, detalhe.alongamentos, detalhe.exercicios)
          novo.inicio = Date.now()
          setEstado(novo)
        }
      })
      .catch(err => {
        if (cancelado) return
        console.error('Falha ao carregar treino:', err)
        setErro(err.response?.status === 403
          ? 'Voce nao tem permissao para acessar esse treino.'
          : 'Nao foi possivel carregar o treino. Tente novamente.')
      })
      .finally(() => { if (!cancelado) setCarregando(false) })
    return () => { cancelado = true }
  }, [fichaName, treinoIdDecoded, modoVer])

  // Persiste no localStorage apos iniciar
  useEffect(() => {
    if (!estado || !estado.inicio || modoVer) return
    salvarEstadoLocal(fichaName, treinoIdDecoded, estado)
  }, [estado, fichaName, treinoIdDecoded, modoVer])

  const emExecucao = !modoVer && !!estado?.inicio && !estado?.finalizado

  // Tick 1s
  useEffect(() => {
    if (!emExecucao) return
    const id = setInterval(() => setAgora(Date.now()), 1000)
    return () => clearInterval(id)
  }, [emExecucao])

  // ---------- Acoes ----------

  const atualizarExercicio = useCallback((name, patch) => {
    setEstado(prev => ({
      ...prev,
      exercicios: { ...prev.exercicios, [name]: { ...prev.exercicios[name], ...patch } },
    }))
  }, [])

  const handleSubstituir = (name, nomeAtual) => {
    setPromptState({
      title: 'Substituir exercicio',
      subtitle: `Substituir "${nomeAtual}" por:`,
      placeholder: 'Nome do exercicio substituto',
      initialValue: '',
      confirmLabel: 'Substituir',
      onConfirm: (valor) => {
        atualizarExercicio(name, { exercicio_substituto: valor || null })
        setPromptState(null)
      },
    })
  }

  const handlePular = (name) => {
    setConfirmState({
      title: 'Pular exercicio?',
      message: 'Esse exercicio nao sera registrado. Voce pode reabilitar depois desfazendo.',
      confirmLabel: 'Pular',
      confirmVariant: 'danger',
      onConfirm: () => {
        atualizarExercicio(name, { pulado: true, concluido: false })
        setConfirmState(null)
      },
    })
  }

  const handleConcluirExercicio = (name) => {
    setEstado(prev => {
      const atual = prev.exercicios[name] || {}
      return {
        ...prev,
        exercicios: { ...prev.exercicios, [name]: { ...atual, concluido: !atual.concluido } },
      }
    })
  }

  const handleFeedbackExercicio = (name, valor) => {
    atualizarExercicio(name, { feedback: valor })
  }

  const handleUpdateSerie = useCallback((name, idx, patch) => {
    setEstado(prev => {
      const ex = prev.exercicios[name]
      if (!ex) return prev
      return {
        ...prev,
        exercicios: {
          ...prev.exercicios,
          [name]: { ...ex, series: ex.series.map((s, i) => i === idx ? { ...s, ...patch } : s) },
        },
      }
    })
  }, [])

  const handleConcluirSerie = (name, idx, descansoStr) => {
    const exAtual = estado?.exercicios?.[name]
    const estavaConcluida = exAtual?.series?.[idx]?.concluida === true

    setEstado(prev => {
      const ex = prev.exercicios[name]
      if (!ex) return prev
      const novasSeries = ex.series.map((s, i) => i === idx ? { ...s, concluida: !s.concluida } : s)
      const todasConcluidas = novasSeries.every(s => s.concluida)

      let novoDescanso = prev.descanso
      if (!estavaConcluida) {
        const tempos = parseDescanso(descansoStr)
        if (tempos.upper > 0) {
          novoDescanso = { ativo: true, inicioMs: Date.now(), ...tempos }
        }
      }

      return {
        ...prev,
        descanso: novoDescanso,
        exercicios: {
          ...prev.exercicios,
          [name]: { ...ex, series: novasSeries, concluido: todasConcluidas },
        },
      }
    })
  }

  const handleAnotarSerie = (name, idx) => {
    const atual = estado?.exercicios?.[name]?.series?.[idx]?.nota || ''
    setPromptState({
      title: `Anotacao da serie ${idx + 1}`,
      subtitle: 'Adicione uma observacao livre',
      placeholder: 'Ex: aumentar peso na proxima',
      initialValue: atual,
      confirmLabel: 'Salvar',
      onConfirm: (valor) => {
        handleUpdateSerie(name, idx, { nota: valor })
        setPromptState(null)
      },
    })
  }

  const pularDescanso = () => {
    setEstado(prev => ({ ...prev, descanso: null }))
  }

  const handleFinalizar = async ({ intensidade, feedback }) => {
    if (!estado?.inicio) return
    setEnviando(true)
    try {
      const fim = Date.now()
      const exerciciosComCarga = {}
      for (const [name, ex] of Object.entries(estado.exercicios)) {
        const cargas = (ex.series || []).map(s => parseFloat(s.carga) || 0)
        const cargaMax = cargas.length > 0 ? Math.max(...cargas) : 0
        exerciciosComCarga[name] = { ...ex, carga: cargaMax }
      }
      const res = await finalizarTreino({
        ficha: fichaName,
        treino: treinoIdDecoded,
        inicio_ms: estado.inicio,
        fim_ms: fim,
        exercicios: exerciciosComCarga,
        intensidade,
        feedback,
      })
      limparEstadoLocal(fichaName, treinoIdDecoded)
      setModalFinalizar(false)
      setToast(`Treino finalizado! Tempo: ${res?.tempo_total || formatarTempo(Math.floor((fim - estado.inicio) / 1000))}`)
      setTimeout(() => navigate(`/aluno/treinos/${fichaName}`), 1200)
    } catch (err) {
      console.error('Falha ao finalizar:', err)
      alert('Nao foi possivel finalizar o treino. Tente novamente.')
    } finally {
      setEnviando(false)
    }
  }

  // ---------- Render ----------

  if (carregando) {
    return (
      <div className="min-h-full bg-[#08152e] flex items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (erro) {
    return (
      <div className="pb-8 bg-[#08152e] min-h-full">
        <div className="px-4 pt-4">
          <button
            onClick={() => navigate(`/aluno/treinos/${fichaName}`)}
            className="h-9 w-9 flex items-center justify-center rounded-xl border border-[#1c3661] text-gray-300 hover:text-white hover:border-[#2563eb] transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft size={15} />
          </button>
        </div>
        <div className="px-4 mt-4">
          <div className={`${CARD_DESTAQUE} px-4 py-5 flex items-start gap-3`}>
            <AlertCircle size={18} className="text-[#60a5fa] shrink-0 mt-0.5" />
            <p className="text-gray-200 text-sm leading-relaxed">{erro}</p>
          </div>
        </div>
      </div>
    )
  }

  if (jaFinalizadoHoje) {
    return (
      <div className="pb-8 bg-[#08152e] min-h-full">
        <div className="px-4 pt-4">
          <button
            onClick={() => navigate(`/aluno/treinos/${fichaName}`)}
            className="h-9 w-9 flex items-center justify-center rounded-xl border border-[#1c3661] text-gray-300 hover:text-white hover:border-[#2563eb] transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft size={15} />
          </button>
        </div>
        <div className="px-4 mt-4">
          <div className={`${CARD_DESTAQUE} px-4 py-6 flex flex-col items-center text-center`}>
            <div className="h-12 w-12 rounded-full border-2 border-emerald-400 flex items-center justify-center text-emerald-300 mb-3 shadow-[0_0_16px_rgba(74,222,128,0.35)]">
              <CheckCircle2 size={20} />
            </div>
            <p className="text-white text-sm font-bold">Treino ja registrado hoje!</p>
            <p className="text-[#8ba6c8] text-xs mt-1">Volte amanha pra treinar novamente.</p>
            <button
              onClick={() => navigate(`/aluno/treinos/${fichaName}`)}
              className="mt-4 h-9 px-4 rounded-lg bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-bold transition-colors"
            >
              Voltar pra ficha
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!dados) return null

  const { treino_label, orientacoes_treino, alongamentos = [], exercicios = [] } = dados

  // ----------- Modo Visualizacao -----------
  if (modoVer) {
    const exercAchatados = []
    for (const item of exercicios) {
      if (item.tipo === 'combinado') {
        for (const ex of item.exercicios || []) exercAchatados.push({ ex, combo: item.titulo })
      } else {
        exercAchatados.push({ ex: item.exercicio })
      }
    }
    return (
      <div className="bg-[#08152e] min-h-full pb-24">
        <div className="px-4 pt-4 pb-4 flex items-center gap-3 border-b border-[#13294e]">
          <button
            onClick={() => navigate(`/aluno/treinos/${fichaName}`)}
            className="h-9 w-9 flex items-center justify-center rounded-xl text-white hover:bg-[#13294e] transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="flex-1 text-center text-white text-base font-bold pr-9">
            {treino_label || treinoIdDecoded}
          </h1>
        </div>

        <div className="px-4 mt-4">
          <div className={`${CARD_DESTAQUE} px-4 py-3 flex items-start gap-3`}>
            <Info size={16} className="text-[#60a5fa] shrink-0 mt-0.5" />
            <p className="text-gray-200 text-xs leading-relaxed">
              Esta e uma <span className="font-bold text-white">visualizacao</span> do treino. Toque em <span className="font-bold text-white">Iniciar treino</span> para comecar e registrar sua sessao.
            </p>
          </div>
        </div>

        {orientacoes_treino && (
          <div className="px-4 mt-3">
            <div className={`${CARD} px-4 py-3 border-l-4 !border-l-[#2563eb]`}>
              <p className={LABEL}>Orientacoes</p>
              <p className="text-gray-200 text-xs mt-1.5 leading-relaxed whitespace-pre-wrap">{orientacoes_treino}</p>
            </div>
          </div>
        )}

        {alongamentos.length > 0 && (
          <section className="px-4 mt-5">
            <p className={`${LABEL} mb-3 px-1`}>Alongamentos & mobilidade</p>
            <div className="flex flex-col gap-2.5">
              {alongamentos.map(a => (
                <VerExercicioInline
                  key={a.name}
                  titulo={a.exercicio}
                  sub={`${a.series} ${a.series === 1 ? 'serie' : 'series'}${a.observacoes ? ` - ${a.observacoes}` : ''}`}
                  video={a.video}
                  plataforma_video={a.plataforma_video}
                  uppercase
                />
              ))}
            </div>
          </section>
        )}

        {exercAchatados.length > 0 && (
          <section className="px-4 mt-5">
            <p className={`${LABEL} mb-3 px-1`}>Treino principal</p>
            <div className="flex flex-col gap-2.5">
              {exercAchatados.map(({ ex, combo }) => (
                <VerExercicioInline
                  key={ex.name}
                  titulo={combo ? `[${combo}] ${ex.exercicio}` : ex.exercicio}
                  sub={`${ex.series ? `${ex.series}x ` : ''}${ex.repeticoes || '-'}${ex.descanso ? ` - desc ${ex.descanso}` : ''}`}
                  video={ex.video}
                  plataforma_video={ex.plataforma_video}
                />
              ))}
            </div>
          </section>
        )}

        <div className="fixed bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-[#08152e] via-[#08152e]/95 to-transparent pt-6 pb-[max(1rem,env(safe-area-inset-bottom))] px-4">
          <button
            onClick={() => navigate(`/aluno/treinos/${fichaName}/${encodeURIComponent(treinoIdDecoded)}`)}
            className="w-full h-12 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-[0_0_24px_rgba(37,99,235,0.4)]"
          >
            <Play size={16} className="fill-white" /> Iniciar treino
          </button>
        </div>
      </div>
    )
  }

  // ----------- Modo Execucao -----------
  if (!estado) return null
  const descansoState = estado.descanso

  return (
    <div className="bg-[#08152e] min-h-full pb-28 pt-12">
      <CronometrosBar
        inicioMs={estado.inicio}
        agora={agora}
        descanso={descansoState}
        onPularDescanso={pularDescanso}
      />

      <div className="px-4 pt-4 pb-4 flex items-center gap-3 border-b border-[#13294e]">
        <button
          onClick={() => navigate(`/aluno/treinos/${fichaName}`)}
          className="h-9 w-9 flex items-center justify-center rounded-xl text-white hover:bg-[#13294e] transition-colors"
          aria-label="Voltar"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="flex-1 text-center text-white text-base font-bold pr-9">
          {treino_label || treinoIdDecoded}
        </h1>
      </div>

      {orientacoes_treino && (
        <div className="px-4 mt-3">
          <div className={`${CARD} px-4 py-3 border-l-4 !border-l-[#2563eb]`}>
            <p className={LABEL}>Orientacoes</p>
            <p className="text-gray-200 text-xs mt-1.5 leading-relaxed whitespace-pre-wrap">{orientacoes_treino}</p>
          </div>
        </div>
      )}

      {alongamentos.length > 0 && (
        <section className="px-4 mt-5">
          <p className={`${LABEL} mb-3 px-1`}>Alongamentos & mobilidade</p>
          <div className="flex flex-col gap-3">
            {alongamentos.map(a => (
              <AlongamentoCard
                key={a.name}
                alongamento={a}
                estado={estado.exercicios[a.name]}
                onConcluir={() => handleConcluirExercicio(a.name)}
                onFeedback={(v) => handleFeedbackExercicio(a.name, v)}
              />
            ))}
          </div>
        </section>
      )}

      {exercicios.length > 0 && (
        <section className="px-4 mt-6">
          <p className={`${LABEL} mb-3 px-1`}>Treino principal</p>
          <div className="flex flex-col gap-3">
            {exercicios.map((item, i) => (
              <ExercicioCard
                key={item.tipo === 'combinado' ? `combo-${i}` : item.exercicio?.name}
                item={item}
                estados={estado.exercicios}
                onSubstituir={handleSubstituir}
                onPular={handlePular}
                onUpdateSerie={handleUpdateSerie}
                onConcluirSerie={handleConcluirSerie}
                onAnotarSerie={handleAnotarSerie}
                onConcluirExercicio={handleConcluirExercicio}
                onFeedback={handleFeedbackExercicio}
              />
            ))}
          </div>
        </section>
      )}

      <div className="fixed bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-[#08152e] via-[#08152e]/95 to-transparent pt-6 pb-[max(1rem,env(safe-area-inset-bottom))] px-4">
        <button
          onClick={() => setModalFinalizar(true)}
          className="w-full h-12 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-[0_0_24px_rgba(16,185,129,0.4)]"
        >
          <Trophy size={16} /> Finalizar treino
        </button>
      </div>

      <FinalizarPopup
        aberto={modalFinalizar}
        onClose={() => !enviando && setModalFinalizar(false)}
        onConfirmar={handleFinalizar}
        enviando={enviando}
      />

      <PromptModal
        aberto={!!promptState}
        title={promptState?.title}
        subtitle={promptState?.subtitle}
        placeholder={promptState?.placeholder}
        initialValue={promptState?.initialValue}
        confirmLabel={promptState?.confirmLabel}
        onConfirm={(v) => promptState?.onConfirm(v)}
        onClose={() => setPromptState(null)}
      />

      <ConfirmModal
        aberto={!!confirmState}
        title={confirmState?.title}
        message={confirmState?.message}
        confirmLabel={confirmState?.confirmLabel}
        confirmVariant={confirmState?.confirmVariant}
        onConfirm={() => confirmState?.onConfirm()}
        onClose={() => setConfirmState(null)}
      />

      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] bg-emerald-900/95 border border-emerald-500/60 text-emerald-100 text-xs font-bold px-4 py-2.5 rounded-xl shadow-[0_0_24px_rgba(74,222,128,0.35)] flex items-center gap-2">
          <Trophy size={13} />
          {toast}
        </div>
      )}
    </div>
  )
}
