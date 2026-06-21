import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft, Play, AlertCircle, CheckCircle2, Check, Replace, Ban,
  StickyNote, Trophy, Info, Eye, ExternalLink, Timer, Shuffle, Zap,
} from 'lucide-react'
import { FormGroup, Select, Spinner, Textarea } from '../../components/ui'
import {
  buscarTreinoDetalhe, finalizarTreino, verificarTreinoFinalizado,
} from '../../api/treino'

// ============================================================
// Tokens visuais
// ============================================================

// Padrao mobile glass (var CLAUDE.md > Padrao Mobile). Equivale ao
// <GlassCard /> primitivo, mas como string utility pra usar em divs.
const CARD = 'sf-card'
const CARD_DESTAQUE = 'sf-card sf-card--highlight'
const LABEL = 'text-[#60A5FA] text-[11px] font-bold uppercase'
const LABEL_STYLE = { letterSpacing: '0.18em' }
// Titulo de secao (Treino principal / Alongamento & mobilidade): branco, caixa
// alta, um pouco maior que o nome do exercicio (text-sm).
const SECTION_TITLE = 'text-white text-base font-bold uppercase tracking-wider'

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

// Cor do timer de descanso: comeca branco e vai esquentando (ambar ->
// laranja -> vermelho) conforme se aproxima e passa do fim do descanso.
// `alvo` = segundos do limite superior do descanso (ex: "0 a 30" -> 30).
// TODO: tokenizar essas cores na area do aluno (--sf-warn/--sf-orange).
const corDescanso = (elapsed, alvo) => {
  if (!alvo || alvo <= 0) return '#FFFFFF'
  if (elapsed >= alvo) return '#EF4444'        // passou do tempo (vermelho)
  const ratio = elapsed / alvo
  if (ratio >= 0.85) return '#FB923C'          // quase la (laranja)
  if (ratio >= 0.55) return '#FBBF24'          // chegando perto (ambar)
  return '#FFFFFF'                             // ainda com folga (branco)
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
const getYouTubeThumb = (id) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
// Drive: proxy do backend que entrega o arquivo bruto pra um <video> nativo
// (play/pause/scrub/PiP/fullscreen reais), no lugar do iframe /preview do Drive.
const getDriveStream = (id) =>
  `${import.meta.env.VITE_FRAPPE_URL}/api/method/shapefy.api.video.stream?drive_id=${encodeURIComponent(id)}`

// Marcador de secao (Treino principal / Alongamento & mobilidade): barra de
// acento azul fina + titulo branco caixa-alta + contador discreto a direita.
function MarcadorSecao({ titulo, count, sufixo }) {
  return (
    <div className="flex items-center gap-2.5 mb-4 px-1">
      <span className="h-5 w-1 rounded-full bg-[#2563eb] shrink-0" aria-hidden="true" />
      <h2 className={`${SECTION_TITLE} flex-1`}>{titulo}</h2>
      {count != null && (
        <span className="text-[var(--sf-text-muted)] text-xs font-medium tabular-nums shrink-0">
          {count} {sufixo}
        </span>
      )}
    </div>
  )
}

function VideoEmbed({ id, plataforma }) {
  const [aberto, setAberto] = useState(false)
  if (!id) return null
  const plat = (plataforma || 'YouTube').toLowerCase()
  const ehDrive = plat.includes('drive')
  const ehVimeo = plat.includes('vimeo')

  if (aberto) {
    // Drive: player nativo <video> via proxy do backend (controles reais).
    if (ehDrive) {
      return (
        <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-[var(--sf-border)] bg-black">
          <video
            src={getDriveStream(id)}
            controls
            autoPlay
            playsInline
            preload="metadata"
            className="w-full h-full"
          />
        </div>
      )
    }
    const src = ehVimeo ? getVimeoEmbed(id) : getYouTubeEmbed(id)
    return (
      <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-[var(--sf-border)] bg-black">
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
      className="relative w-full aspect-video rounded-xl overflow-hidden border border-[var(--sf-border)] bg-black group"
    >
      {ehDrive ? (
        <div className="w-full h-full bg-gradient-to-br from-[var(--sf-surface-2)] to-[var(--sf-bg)] flex items-center justify-center">
          <span className="absolute top-2 left-2 text-[10px] font-bold uppercase tracking-widest text-[#60A5FA] bg-black/60 px-2 py-0.5 rounded">
            Google Drive
          </span>
        </div>
      ) : ehVimeo ? (
        <div className="w-full h-full bg-gradient-to-br from-[var(--sf-surface-2)] to-[var(--sf-bg)] flex items-center justify-center">
          <span className="text-[#60A5FA] text-xs uppercase tracking-widest font-bold">Vimeo</span>
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
// Cronometro card glass premium — fica no topo do conteudo (nao fixed),
// segue o padrao da area do aluno (sf-card + neon).
// ============================================================

function CronometrosBar({ inicioMs, agora, descanso, onPularDescanso }) {
  const elapsedTreino = Math.max(0, Math.floor((agora - inicioMs) / 1000))
  const descansando = !!descanso?.ativo
  const elapsedDesc = descansando ? Math.max(0, Math.floor((agora - descanso.inicioMs) / 1000)) : 0
  const alvoDesc = descanso?.upper || descanso?.lower || 0
  const corDesc = corDescanso(elapsedDesc, alvoDesc)

  return (
    <div className="sf-card flex items-center justify-between gap-3 px-4 py-3">
      <div className="flex items-center gap-3 min-w-0">
        <Timer size={20} className="text-[#60A5FA] shrink-0" />
        <span className="text-white text-xl font-bold tabular-nums">
          {formatarTempoLongo(elapsedTreino)}
        </span>
      </div>
      {descansando ? (
        <>
          <span
            className="text-sm font-bold tabular-nums transition-colors duration-500"
            style={{ color: corDesc }}
          >
            Descansando - {formatarTempo(elapsedDesc)}
          </span>
          <button
            onClick={onPularDescanso}
            className="h-9 px-3 rounded-lg bg-[var(--sf-surface-2)] border border-[var(--sf-border-strong)] text-[#60A5FA] hover:bg-[#2563EB] hover:text-white hover:border-[#2563EB] text-xs font-bold uppercase tracking-widest transition-colors"
          >
            Pular
          </button>
        </>
      ) : (
        <span className="text-[var(--sf-text-muted)] text-xs font-medium">
          Pronto para a próxima série
        </span>
      )}
    </div>
  )
}

// ============================================================
// Linha de serie — layout final igual ao print
// ============================================================

function SerieLinha({ exercicio, idx, serie, onUpdate, onConcluir, onAnotar, onVerTecnica }) {
  // Remove o prefixo numerico ("1a ", "2a ", "1º ") — fica so o nome
  // (Aquecimento, Preparatoria, Trabalho).
  const tipoSerie = (exercicio.tipo_de_serie_list?.[idx] || '')
    .replace(/^\d+[aºo°]?\s*/i, '')
    .trim()
  const tecnica = exercicio.tecnicas_por_serie?.[idx] || null
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
            <p className="text-[var(--sf-text-muted)] text-[11px]">{tipoSerie}</p>
          )}
          {tecnica && (
            <button
              onClick={() => onVerTecnica?.(tecnica)}
              className="flex items-center gap-1 mt-0.5"
              title={tecnica.nome}
            >
              <Zap size={10} className="text-amber-400 shrink-0" />
              <span className="text-amber-400 text-[10px] font-medium truncate max-w-[72px]">{tecnica.nome}</span>
            </button>
          )}
        </div>
        <input
          type="number"
          inputMode="numeric"
          placeholder="Reps"
          value={serie.repeticoes || ''}
          onChange={(e) => onUpdate({ repeticoes: parseInt(e.target.value, 10) || 0 })}
          className="w-16 h-9 px-2 bg-[var(--sf-surface)] border border-[var(--sf-border)] text-white rounded-full text-xs outline-none focus:border-[#2563eb] placeholder:text-[var(--sf-text-muted)] text-center font-bold"
        />
        <input
          type="number"
          inputMode="decimal"
          step="0.5"
          placeholder="Kg"
          value={serie.carga || ''}
          onChange={(e) => onUpdate({ carga: parseFloat(e.target.value) || 0 })}
          className="w-16 h-9 px-2 bg-[var(--sf-surface)] border border-[var(--sf-border)] text-white rounded-full text-xs outline-none focus:border-[#2563eb] placeholder:text-[var(--sf-text-muted)] text-center font-bold"
        />
        <button
          onClick={onAnotar}
          title="Anotar"
          className={`h-9 w-9 flex items-center justify-center rounded-lg transition-colors shrink-0 ${
            serie.nota
              ? 'text-[#60A5FA] bg-[#0a2956] border border-[#2563eb]/60'
              : 'text-white bg-[var(--sf-surface)] border border-[var(--sf-border)] hover:bg-[var(--sf-surface-2)]'
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
        <p className="text-[var(--sf-text-muted)] text-[11px] pl-[88px] ml-2.5">
          historico: {hist.repeticoes} reps - {hist.carga}kg
        </p>
      )}
      {serie.nota && (
        <p className="text-[#60A5FA] text-[11px] italic pl-[88px] ml-2.5">{serie.nota}</p>
      )}
    </div>
  )
}

// ============================================================
// ExercicioBody (modo execucao) - usado em simples e dentro de combinado
// ============================================================

function ExercicioBody({
  exercicio, estado, onSubstituir, onDesfazer, onPular, onUpdateSerie, onConcluirSerie,
  onAnotarSerie, onConcluirExercicio, onFeedback,
}) {
  const [tecnicaAtual, setTecnicaAtual] = useState(null)
  const pulado = estado?.pulado === true
  const concluido = estado?.concluido === true
  const tituloFinal = estado?.exercicio_substituto || exercicio.exercicio
  const foiSubstituido = !!estado?.exercicio_substituto
  const videoFinal = foiSubstituido && estado?.video_substituto ? estado.video_substituto : exercicio.video
  const plataformaFinal = foiSubstituido && estado?.video_substituto ? (estado.plataforma_video_substituto || 'YouTube') : exercicio.plataforma_video
  const series = estado?.series || []
  const semSeries = series.length === 0
  const ativo = !pulado && !concluido

  return (
    <div className={`transition-opacity ${pulado ? 'opacity-40' : concluido ? 'opacity-60' : ''}`}>
      {/* Cabeçalho: nome/grupo + botão substituir */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {exercicio.grupo_muscular && (
            <p className="text-[#60A5FA] text-[9px] font-bold uppercase tracking-widest">
              {exercicio.grupo_muscular}
            </p>
          )}
          <p className="text-white text-sm font-bold mt-0.5 leading-snug">
            {tituloFinal}
          </p>
          {foiSubstituido && (
            <div className="flex items-center gap-1.5 mt-1">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-[#2563eb]/20 text-blue-300 border border-[#2563eb]/30">
                <Shuffle size={8} /> substituído
              </span>
              <span className="text-[10px] text-[var(--sf-text-muted)] line-through">{exercicio.exercicio}</span>
            </div>
          )}
        </div>
        {ativo && (
          <div className="flex items-center gap-1.5 shrink-0">
            {foiSubstituido ? (
              <button
                onClick={onDesfazer}
                className="h-7 flex items-center gap-1.5 px-2.5 text-blue-400 hover:text-white border border-[#2563eb]/40 hover:bg-[#2563eb] rounded-lg transition-colors text-[11px] font-medium"
              >
                <Shuffle size={11} /> Desfazer
              </button>
            ) : (
              <button
                onClick={onSubstituir}
                className="h-7 flex items-center gap-1.5 px-2.5 text-[#60A5FA] hover:text-white border border-[#2563eb]/40 hover:bg-[#2563eb] rounded-lg transition-colors text-[11px] font-medium"
              >
                <Replace size={11} /> Substituir
              </button>
            )}
            <button
              onClick={onPular}
              className="h-7 flex items-center gap-1.5 px-2.5 text-red-400/70 hover:text-white border border-red-500/30 hover:bg-red-600 hover:border-red-600 rounded-lg transition-colors text-[11px] font-medium"
            >
              <Ban size={11} /> Pular
            </button>
          </div>
        )}
      </div>

      {videoFinal && (
        <div className="mt-3">
          <VideoEmbed id={videoFinal} plataforma={plataformaFinal} />
        </div>
      )}

      <div className="mt-3 rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 py-2.5">
        <p className="text-white text-sm font-bold leading-snug">
          {exercicio.series ? `${exercicio.series}x ` : ''}{exercicio.repeticoes || '-'}
          {exercicio.descanso && ` - desc ${exercicio.descanso}`}
          {exercicio.carga_sugerida ? ` - sugerido ${exercicio.carga_sugerida}kg` : ''}
        </p>
        {exercicio.observacao && (
          <p className="text-gray-300 text-xs font-medium mt-1.5 leading-relaxed">
            {exercicio.observacao}
          </p>
        )}
      </div>

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
              onVerTecnica={(tec) => setTecnicaAtual(tec)}
            />
          ))}
        </div>
      )}

      {/* Sem séries: Pular ao lado do Marcar concluído */}
      {!pulado && semSeries && (
        <div className="flex gap-2 mt-3">
          <button
            onClick={onConcluirExercicio}
            className={`flex-1 h-10 rounded-lg flex items-center justify-center gap-2 text-xs font-bold transition-colors ${
              concluido
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-500 hover:bg-emerald-600 text-white'
            }`}
          >
            <CheckCircle2 size={14} /> {concluido ? 'Concluido' : 'Marcar concluido'}
          </button>
        </div>
      )}

      {!pulado && (
        <textarea
          value={estado?.feedback || ''}
          onChange={(e) => onFeedback(e.target.value)}
          placeholder="Como foi a execucao?"
          rows={2}
          className="w-full mt-3 px-3 py-2 bg-[var(--sf-bg)] border border-[var(--sf-border)] text-white rounded-lg text-xs outline-none focus:border-[#2563eb] resize-none placeholder:text-[var(--sf-text-soft)]"
        />
      )}
      <TecnicaSheet tecnica={tecnicaAtual} onClose={() => setTecnicaAtual(null)} />
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

      {alongamento.video && (
        <div className="mt-3">
          <VideoEmbed id={alongamento.video} plataforma={alongamento.plataforma_video} />
        </div>
      )}

      <div className="mt-3 rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 py-2.5">
        <p className="text-white text-sm font-bold leading-snug">
          {alongamento.series} {alongamento.series === 1 ? 'serie' : 'series'}
          {alongamento.observacoes && ` - ${alongamento.observacoes}`}
        </p>
      </div>

      <textarea
        value={estado?.feedback || ''}
        onChange={(e) => onFeedback(e.target.value)}
        placeholder="Como foi? Observacoes..."
        rows={2}
        className="w-full mt-3 px-3 py-2 bg-[var(--sf-bg)] border border-[var(--sf-border)] text-white rounded-lg text-xs outline-none focus:border-[#2563eb] resize-none placeholder:text-[var(--sf-text-soft)]"
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
          {sub && <p className="text-[var(--sf-text-muted)] text-[11px] mt-0.5">{sub}</p>}
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
  onSubstituir, onDesfazer, onPular, onUpdateSerie, onConcluirSerie, onAnotarSerie,
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
            <span className="text-[var(--sf-text-muted)] text-[10px]">Execute em sequencia</span>
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
                onSubstituir={() => onSubstituir(ex.name, ex.exercicio, ex.substitutos)}
                onDesfazer={() => onDesfazer(ex.name)}
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
        onSubstituir={() => onSubstituir(ex.name, ex.exercicio, ex.substitutos)}
        onDesfazer={() => onDesfazer(ex.name)}
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
// ============================================================
// SubstitutosSheet — lista de substitutos pré-cadastrados
// ============================================================

function SubstitutosSheet({ aberto, exercicioNome, substitutos = [], onSelect, onClose }) {
  if (!aberto) return null

  const buildUrl = (video, plataforma) => {
    if (!video) return ''
    if (video.includes('://')) return video
    switch (plataforma) {
      case 'Vimeo': return `https://vimeo.com/${video}`
      case 'Google Drive': return `https://drive.google.com/file/d/${video}/view`
      default: return `https://www.youtube.com/watch?v=${video}`
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-3"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[420px] bg-[var(--sf-surface)] border border-[var(--sf-border)] rounded-2xl shadow-[0_25px_50px_rgba(0,0,0,0.6)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-[var(--sf-border)]">
          <p className="text-white text-sm font-bold">Substituir exercício</p>
          <p className="text-[var(--sf-text-muted)] text-[11px] mt-0.5 truncate">
            Substituindo: <span className="text-gray-300">{exercicioNome}</span>
          </p>
        </div>
        <div className="py-2 max-h-72 overflow-y-auto">
          {substitutos.map((s) => {
            const videoUrl = buildUrl(s.video, s.plataforma_video)
            return (
              <div key={s.name} className="flex items-center gap-1 px-3 hover:bg-[var(--sf-surface-2)] transition-colors">
                <button
                  onClick={() => onSelect(s)}
                  className="flex-1 text-left py-3 text-white text-sm flex items-center gap-3 min-w-0"
                >
                  <Replace size={13} className="text-[#60A5FA] shrink-0" />
                  <span className="truncate">{s.nome}</span>
                </button>
                {videoUrl && (
                  <a
                    href={videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    title="Ver vídeo"
                    className="h-8 w-8 flex items-center justify-center text-[#60A5FA]/60 hover:text-[#60A5FA] border border-[var(--sf-border)] hover:border-[#2563eb]/40 rounded-lg transition-colors shrink-0"
                  >
                    <Play size={12} />
                  </a>
                )}
              </div>
            )
          })}
        </div>
        <div className="px-4 py-3 border-t border-[var(--sf-border)]">
          <button
            onClick={onClose}
            className="w-full h-9 rounded-lg border border-[var(--sf-border)] text-gray-300 text-xs font-bold hover:bg-[var(--sf-surface-2)] transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// TecnicaSheet — detalhe da técnica intensificadora
// ============================================================

function TecnicaSheet({ tecnica, onClose }) {
  if (!tecnica) return null

  const buildUrl = (video, plataforma) => {
    if (!video) return ''
    if (video.includes('://')) return video
    switch (plataforma) {
      case 'Vimeo': return `https://vimeo.com/${video}`
      case 'Google Drive': return `https://drive.google.com/file/d/${video}/view`
      default: return `https://www.youtube.com/watch?v=${video}`
    }
  }
  const videoUrl = buildUrl(tecnica.video, tecnica.plataforma_video)

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-3"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[420px] bg-[var(--sf-surface)] border border-[var(--sf-border)] rounded-2xl shadow-[0_25px_50px_rgba(0,0,0,0.6)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-[var(--sf-border)] flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
            <Zap size={13} className="text-amber-400" />
          </div>
          <div>
            <p className="text-white text-sm font-bold">{tecnica.nome}</p>
            <p className="text-amber-400/70 text-[10px] uppercase tracking-widest font-bold">Técnica Intensificadora</p>
          </div>
        </div>

        <div className="px-4 py-4 space-y-3">
          {tecnica.descricao && (
            <p className="text-[var(--sf-text-muted)] text-sm leading-relaxed whitespace-pre-line">
              {tecnica.descricao}
            </p>
          )}
          {tecnica.video && (
            <div className="mt-1 relative w-full aspect-video rounded-xl overflow-hidden border border-[var(--sf-border)] bg-black">
              {(tecnica.plataforma_video || 'YouTube').toLowerCase().includes('drive') ? (
                <video src={getDriveStream(tecnica.video)} controls playsInline preload="metadata" className="w-full h-full" />
              ) : (
                <iframe
                  src={(tecnica.plataforma_video || '').toLowerCase().includes('vimeo') ? getVimeoEmbed(tecnica.video) : getYouTubeEmbed(tecnica.video)}
                  title={tecnica.nome}
                  allow="autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                />
              )}
            </div>
          )}
        </div>

        <div className="px-4 pb-4">
          <button
            onClick={onClose}
            className="w-full h-9 rounded-lg border border-[var(--sf-border)] text-gray-300 text-xs font-bold hover:bg-[var(--sf-surface-2)] transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
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
        className="w-full max-w-[420px] bg-[var(--sf-surface)] border border-[var(--sf-border)] rounded-2xl shadow-[0_25px_50px_rgba(0,0,0,0.6)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-[var(--sf-border)]">
          <p className="text-white text-sm font-bold">{title}</p>
          {subtitle && <p className="text-[var(--sf-text-muted)] text-[11px] mt-0.5">{subtitle}</p>}
        </div>
        <div className="p-4">
          <input
            type="text"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder={placeholder || ''}
            autoFocus
            className="w-full h-10 px-3 bg-[var(--sf-bg)] border border-[var(--sf-border)] text-white rounded-lg text-sm outline-none focus:border-[#2563eb] placeholder:text-[var(--sf-text-soft)]"
          />
        </div>
        <div className="px-4 py-3 border-t border-[var(--sf-border)] flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="h-9 px-4 rounded-lg border border-[var(--sf-border)] text-gray-300 text-xs font-bold hover:bg-[var(--sf-surface-2)] transition-colors"
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
        className="w-full max-w-[380px] bg-[var(--sf-surface)] border border-[var(--sf-border)] rounded-2xl shadow-[0_25px_50px_rgba(0,0,0,0.6)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-4">
          <p className="text-white text-sm font-bold">{title}</p>
          {message && <p className="text-[var(--sf-text-muted)] text-xs mt-1.5 leading-relaxed">{message}</p>}
        </div>
        <div className="px-4 pb-4 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="h-9 px-4 rounded-lg border border-[var(--sf-border)] text-gray-300 text-xs font-bold hover:bg-[var(--sf-surface-2)] transition-colors"
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
        className="w-full max-w-[420px] bg-[var(--sf-surface)] border border-[var(--sf-border)] rounded-2xl shadow-[0_25px_50px_rgba(0,0,0,0.6)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-[var(--sf-border)]">
          <p className="text-white text-sm font-bold">Finalizar treino</p>
          <p className="text-[var(--sf-text-muted)] text-[11px] mt-0.5">Conta como foi sua sessao</p>
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
        <div className="px-4 py-3 border-t border-[var(--sf-border)] flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            disabled={enviando}
            className="h-9 px-4 rounded-lg border border-[var(--sf-border)] text-gray-300 text-xs font-bold hover:bg-[var(--sf-surface-2)] disabled:opacity-50 transition-colors"
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
  const [substitutosSheet, setSubstitutosSheet] = useState(null) // { exercicioName, exercicioNome, substitutos }

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

  const handleSubstituir = (name, nomeAtual, substitutos = []) => {
    if (substitutos.length > 0) {
      setSubstitutosSheet({ exercicioName: name, exercicioNome: nomeAtual, substitutos })
    } else {
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
      <div className="min-h-full bg-[var(--sf-bg)] flex items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (erro) {
    return (
      <div className="pb-8 bg-[var(--sf-bg)] min-h-full">
        <div className="px-4 pt-4">
          <button
            onClick={() => navigate(`/aluno/treinos/${fichaName}`)}
            className="h-9 w-9 flex items-center justify-center rounded-xl border border-[var(--sf-border)] text-gray-300 hover:text-white hover:border-[#2563eb] transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft size={15} />
          </button>
        </div>
        <div className="px-4 mt-4">
          <div className={`${CARD_DESTAQUE} px-4 py-5 flex items-start gap-3`}>
            <AlertCircle size={18} className="text-[#60A5FA] shrink-0 mt-0.5" />
            <p className="text-gray-200 text-sm leading-relaxed">{erro}</p>
          </div>
        </div>
      </div>
    )
  }

  if (jaFinalizadoHoje) {
    return (
      <div className="pb-8 bg-[var(--sf-bg)] min-h-full">
        <div className="px-4 pt-4">
          <button
            onClick={() => navigate(`/aluno/treinos/${fichaName}`)}
            className="h-9 w-9 flex items-center justify-center rounded-xl border border-[var(--sf-border)] text-gray-300 hover:text-white hover:border-[#2563eb] transition-colors"
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
            <p className="text-[var(--sf-text-muted)] text-xs mt-1">Volte amanha pra treinar novamente.</p>
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

  const { treino_label, orientacoes_treino, orientacoes_aem, alongamentos = [], exercicios = [] } = dados

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
      <div className="bg-[var(--sf-bg)] min-h-full pb-24">
        <div className="px-4 pt-4 pb-4 flex items-center gap-3 border-b border-[var(--sf-border)]">
          <button
            onClick={() => navigate(`/aluno/treinos/${fichaName}`)}
            className="h-9 w-9 flex items-center justify-center rounded-xl text-white hover:bg-[var(--sf-surface-2)] transition-colors"
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
            <Info size={16} className="text-[#60A5FA] shrink-0 mt-0.5" />
            <p className="text-gray-200 text-xs leading-relaxed">
              Esta e uma <span className="font-bold text-white">visualizacao</span> do treino. Toque em <span className="font-bold text-white">Iniciar treino</span> para comecar e registrar sua sessao.
            </p>
          </div>
        </div>

        {alongamentos.length > 0 && (
          <section className="px-4 mt-5">
            <MarcadorSecao
              titulo="Alongamento & mobilidade"
              count={alongamentos.length}
              sufixo={alongamentos.length === 1 ? 'exercício' : 'exercícios'}
            />
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
            <MarcadorSecao
              titulo="Treino principal"
              count={exercAchatados.length}
              sufixo={exercAchatados.length === 1 ? 'exercício' : 'exercícios'}
            />
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

        <div className="px-4 mt-8 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            onClick={() => navigate(`/aluno/treinos/${fichaName}/${encodeURIComponent(treinoIdDecoded)}`)}
            className="w-full min-h-[52px] rounded-2xl bg-gradient-to-b from-[#3B82F6] to-[#2563EB] hover:shadow-[0_0_36px_rgba(37,99,235,0.55)] text-white text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-[0_0_28px_rgba(37,99,235,0.35)] active:scale-[0.98]"
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
    <div className="bg-[var(--sf-bg)] min-h-full pb-28">
      <div className="px-4 pt-3 pb-3 flex items-center gap-3 border-b border-[var(--sf-border)]">
        <button
          onClick={() => navigate(`/aluno/treinos/${fichaName}`)}
          className="h-9 w-9 flex items-center justify-center rounded-xl text-white hover:bg-[var(--sf-surface-2)] transition-colors"
          aria-label="Voltar"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="flex-1 text-center text-white text-base font-bold pr-9">
          {treino_label || treinoIdDecoded}
        </h1>
      </div>

      {/* Cronometro fixed na viewport — top calculado com a altura do header
          do AlunoLayout (~56px). Backdrop blur deixa nitido sobre o conteudo
          que rola por baixo. Compensar com mt no proximo bloco. */}
      <div className="fixed top-14 left-0 right-0 z-50 px-4 py-3 bg-[var(--sf-bg)]/95 backdrop-blur-md border-b border-[var(--sf-border)]">
        <CronometrosBar
          inicioMs={estado.inicio}
          agora={agora}
          descanso={descansoState}
          onPularDescanso={pularDescanso}
        />
      </div>

      {/* Spacer pro fixed cronometro nao cobrir o primeiro conteudo */}
      <div className="h-[88px]" aria-hidden="true" />

      {alongamentos.length > 0 && (
        <section className="px-4 mt-5">
          <MarcadorSecao
            titulo="Alongamento & mobilidade"
            count={alongamentos.length}
            sufixo={alongamentos.length === 1 ? 'exercício' : 'exercícios'}
          />
          {orientacoes_aem && (
            <div className={`${CARD} px-4 py-3 border-l-4 !border-l-[#2563eb] mb-3`}>
              <p className={LABEL}>Orientacoes</p>
              <p className="text-gray-200 text-xs mt-1.5 leading-relaxed whitespace-pre-wrap">{orientacoes_aem}</p>
            </div>
          )}
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
          <MarcadorSecao
            titulo="Treino principal"
            count={exercicios.length}
            sufixo={exercicios.length === 1 ? 'exercício' : 'exercícios'}
          />
          {orientacoes_treino && (
            <div className={`${CARD} px-4 py-3 border-l-4 !border-l-[#2563eb] mb-3`}>
              <p className={LABEL}>Orientacoes</p>
              <p className="text-gray-200 text-xs mt-1.5 leading-relaxed whitespace-pre-wrap">{orientacoes_treino}</p>
            </div>
          )}
          <div className="flex flex-col gap-3">
            {exercicios.map((item, i) => (
              <ExercicioCard
                key={item.tipo === 'combinado' ? `combo-${i}` : item.exercicio?.name}
                item={item}
                estados={estado.exercicios}
                onSubstituir={handleSubstituir}
                onDesfazer={(name) => atualizarExercicio(name, { exercicio_substituto: null, video_substituto: null, plataforma_video_substituto: null })}
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

      <div className="px-4 mt-8 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <button
          onClick={() => setModalFinalizar(true)}
          className="w-full min-h-[52px] rounded-2xl bg-gradient-to-b from-[#22C55E] to-[#10B981] hover:shadow-[0_0_36px_rgba(16,185,129,0.55)] text-white text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-[0_0_28px_rgba(16,185,129,0.35)] active:scale-[0.98]"
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

      <SubstitutosSheet
        aberto={!!substitutosSheet}
        exercicioNome={substitutosSheet?.exercicioNome}
        substitutos={substitutosSheet?.substitutos || []}
        onSelect={(sub) => {
          atualizarExercicio(substitutosSheet.exercicioName, {
            exercicio_substituto: sub.nome,
            video_substituto: sub.video || null,
            plataforma_video_substituto: sub.plataforma_video || null,
          })
          setSubstitutosSheet(null)
        }}
        onClose={() => setSubstitutosSheet(null)}
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
