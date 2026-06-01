import { useEffect, useMemo, useState } from 'react'
import { X, Loader2, ChevronDown, Check } from 'lucide-react'
import SecaoDivider from './SecaoDivider'
import CampoLabel from './CampoLabel'
import CampoTexto from './CampoTexto'
import CampoSelect from './CampoSelect'
import CampoChecks from './CampoChecks'
import CampoRating from './CampoRating'
import CampoInt from './CampoInt'
import CampoImagem from './CampoImagem'
import CampoBlocoHTML from './CampoBlocoHTML'

const isSecao = (t) => t === 'Quebra de Seção' || t === 'Quebra de Sessão' || t === 'Section Break'
const isHTML = (t) => t === 'Bloco HTML' || t === 'HTML'
const isImagem = (t) => t === 'Anexar Imagem' || t === 'Attach Image'
const isSelect = (t) => t === 'Select' || t === 'Seleção'
const isChecks = (t) => t === 'Checks' || t === 'Múltipla Escolha'
const isRating = (t) => t === 'Rating' || t === 'Avaliação'
const isInt = (t) => t === 'Int' || t === 'Número'

// Modal que aparece quando o aluno seleciona varias fotos de uma vez na galeria.
// Mostra cada foto como thumb + um select pra escolher pra qual campo de imagem
// vai. Pula automaticamente os ja preenchidos sugerindo o proximo vazio.
function DistribuirFotosModal({ aberto, files, campos, onConfirm, onClose }) {
  const [atribuicoes, setAtribuicoes] = useState(() => {
    if (!files) return []
    const vazios = campos.filter(c => !c.preenchido).map(c => c.idx)
    return files.map((_, i) => vazios[i] ?? null)
  })
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  // Quando o picker de campo esta aberto pra alguma linha, guarda o indice.
  const [pickerLinha, setPickerLinha] = useState(null)

  // Cria URLs estaveis (uma so vez) e revoga ao desmontar pra nao vazar.
  const fileUrls = useMemo(() => {
    if (!files) return []
    return files.map(f => URL.createObjectURL(f))
  }, [files])
  useEffect(() => {
    return () => { fileUrls.forEach(u => URL.revokeObjectURL(u)) }
  }, [fileUrls])

  // Reseta atribuicoes quando files mudar (abrir o modal de novo).
  useEffect(() => {
    if (!files) return
    const vazios = campos.filter(c => !c.preenchido).map(c => c.idx)
    setAtribuicoes(files.map((_, i) => vazios[i] ?? null))
    setErro('')
    setPickerLinha(null)
  }, [files, campos])

  if (!aberto || !files) return null

  const trocar = (i, idx) => {
    setAtribuicoes(prev => prev.map((v, j) => j === i ? idx : v))
  }

  const submit = async () => {
    setErro('')
    const pares = atribuicoes
      .map((idx, i) => ({ idx, file: files[i] }))
      .filter(p => p.idx != null)
    if (pares.length === 0) {
      setErro('Atribua pelo menos uma foto a um campo.')
      return
    }
    setEnviando(true)
    try {
      await onConfirm(pares)
      onClose()
    } catch (err) {
      console.error('Falha ao distribuir fotos:', err)
      setErro('Algumas fotos falharam. Verifique e tente novamente.')
    } finally {
      setEnviando(false)
    }
  }

  const labelCampo = (idx) => campos.find(c => c.idx === idx)?.label || ''

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-3"
      onClick={enviando ? undefined : onClose}
    >
      <div
        className="w-full max-w-[460px] max-h-[90vh] bg-[var(--sf-bg)] border border-[var(--sf-border-strong)] rounded-2xl shadow-[0_25px_50px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-[var(--sf-border)] flex items-center justify-between">
          <div>
            <p className="text-white text-sm font-bold">Atribuir fotos</p>
            <p className="text-[var(--sf-text-muted)] text-[11px] mt-0.5">
              {files.length} {files.length === 1 ? 'foto selecionada' : 'fotos selecionadas'} — toque em cada uma pra escolher o campo
            </p>
          </div>
          {!enviando && (
            <button
              onClick={onClose}
              className="h-8 w-8 flex items-center justify-center text-gray-400 hover:text-white border border-[var(--sf-border)] hover:border-[var(--sf-border-strong)] rounded-lg transition-colors shrink-0"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {files.map((_, i) => {
            const atribuido = atribuicoes[i] != null
            return (
              <div
                key={i}
                className="flex items-center gap-3 p-2 rounded-xl bg-[var(--sf-surface)] border border-[var(--sf-border)]"
              >
                <img
                  src={fileUrls[i]}
                  alt=""
                  className="w-14 h-14 rounded-lg object-cover shrink-0 border border-[var(--sf-border)]"
                />
                <button
                  type="button"
                  onClick={() => setPickerLinha(i)}
                  disabled={enviando}
                  className={`flex-1 min-w-0 h-11 px-3 flex items-center justify-between gap-2 rounded-lg border transition-colors text-left disabled:opacity-60 ${
                    atribuido
                      ? 'bg-[#2563EB]/15 border-[#2563EB]/60 text-white hover:bg-[#2563EB]/25'
                      : 'bg-[var(--sf-bg)] border-dashed border-[var(--sf-border-strong)] text-[var(--sf-text-muted)] hover:text-white hover:border-[#2563EB]/60'
                  }`}
                >
                  <span className="text-xs font-semibold truncate">
                    {atribuido ? labelCampo(atribuicoes[i]) : 'Toque para escolher o campo'}
                  </span>
                  <ChevronDown size={14} className="shrink-0" />
                </button>
              </div>
            )
          })}
        </div>

        {erro && (
          <p className="px-4 pb-2 text-[#F87171] text-[11px] font-medium">{erro}</p>
        )}

        <div className="px-4 py-3 border-t border-[var(--sf-border)] flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            disabled={enviando}
            className="h-9 px-4 rounded-lg border border-[var(--sf-border)] text-gray-300 text-xs font-bold hover:bg-[var(--sf-surface-2)] disabled:opacity-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={enviando}
            className="h-9 px-4 rounded-lg bg-[#2563EB] hover:bg-[#1d4ed8] text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-60 transition-colors"
          >
            {enviando && <Loader2 size={13} className="animate-spin" />}
            {enviando ? 'Enviando...' : 'Enviar fotos'}
          </button>
        </div>
      </div>

      {/* Picker de campo — bottom sheet acima do modal principal */}
      {pickerLinha !== null && (
        <div
          className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-3"
          onClick={() => setPickerLinha(null)}
        >
          <div
            className="w-full max-w-[420px] max-h-[80vh] bg-[var(--sf-bg)] border border-[var(--sf-border-strong)] rounded-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-[var(--sf-border)] flex items-center justify-between">
              <p className="text-white text-sm font-bold">Escolher campo</p>
              <button
                onClick={() => setPickerLinha(null)}
                className="h-8 w-8 flex items-center justify-center text-gray-400 hover:text-white border border-[var(--sf-border)] rounded-lg transition-colors"
              >
                <X size={14} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              <button
                type="button"
                onClick={() => { trocar(pickerLinha, null); setPickerLinha(null) }}
                className="w-full px-3 py-3 rounded-lg text-left text-[var(--sf-text-muted)] text-xs font-semibold hover:bg-[var(--sf-surface-2)] transition-colors flex items-center gap-2"
              >
                {atribuicoes[pickerLinha] == null && <Check size={14} className="text-[#60A5FA]" />}
                <span className={atribuicoes[pickerLinha] == null ? 'text-white' : ''}>
                  Nao usar essa foto
                </span>
              </button>
              {campos.map(c => {
                const selecionado = atribuicoes[pickerLinha] === c.idx
                return (
                  <button
                    key={c.idx}
                    type="button"
                    onClick={() => { trocar(pickerLinha, c.idx); setPickerLinha(null) }}
                    className={`w-full px-3 py-3 rounded-lg text-left text-xs font-semibold transition-colors flex items-center gap-2 ${
                      selecionado
                        ? 'bg-[#2563EB]/15 text-white border border-[#2563EB]/60'
                        : 'text-gray-200 hover:bg-[var(--sf-surface-2)] border border-transparent'
                    }`}
                  >
                    {selecionado && <Check size={14} className="text-[#60A5FA] shrink-0" />}
                    <span className="flex-1 min-w-0 truncate">{c.label}</span>
                    {c.preenchido && (
                      <span className="text-[9px] uppercase tracking-widest text-orange-300 shrink-0">
                        substituir
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Renderiza uma lista de perguntas (formato child table do Frappe).
// perguntas: array de { pergunta, tipo, opcoes, reqd, conteudo_html, resposta }
// onChange: (idx, valor) => void
// uploadFn: usado pelos campos do tipo Anexar Imagem
export default function FormularioRespostas({ perguntas, onChange, uploadFn, filtrarIdx }) {
  const [bulkFiles, setBulkFiles] = useState(null)

  const camposImagem = perguntas
    .map((p, idx) => ({ p, idx }))
    .filter(({ p }) => isImagem(p.tipo))
    .map(({ p, idx }) => ({
      idx,
      label: p.pergunta,
      preenchido: !!p.resposta,
    }))

  const handleMultipleSelected = (files) => {
    setBulkFiles(files)
  }

  const handleConfirmDistribuicao = async (pares) => {
    // Faz upload em paralelo, sem bloquear no primeiro erro
    const resultados = await Promise.allSettled(
      pares.map(async ({ idx, file }) => {
        const url = await uploadFn(file)
        if (!url) throw new Error('Upload falhou')
        return { idx, url }
      })
    )
    resultados.forEach((r) => {
      if (r.status === 'fulfilled') onChange(r.value.idx, r.value.url)
    })
    const erros = resultados.filter(r => r.status === 'rejected').length
    if (erros > 0) throw new Error(`${erros} upload(s) falharam`)
  }

  return (
    <>
      <div className="flex flex-col gap-2.5">
        {perguntas.map((item, idx) => {
          // Wizard: renderiza só os índices do passo atual (preserva idx original no onChange).
          if (filtrarIdx && !filtrarIdx.has(idx)) return null
          if (isSecao(item.tipo)) {
            return <SecaoDivider key={idx} titulo={item.pergunta} />
          }
          if (isHTML(item.tipo)) {
            return <CampoBlocoHTML key={idx} html={item.conteudo_html || item.pergunta} />
          }

          const opcoes = String(item.opcoes || '').split('\n').map(s => s.trim()).filter(Boolean)
          const obrigatoria = Number(item.reqd) === 1

          return (
            <div
              key={idx}
              data-pergunta-idx={idx}
              className="bg-[#0a0a0c] border border-[#1c1c22] rounded-2xl px-4 py-4"
            >
              <CampoLabel obrigatorio={obrigatoria}>{item.pergunta}</CampoLabel>

              {isImagem(item.tipo) ? (
                <CampoImagem
                  value={item.resposta}
                  onChange={(v) => onChange(idx, v)}
                  uploadFn={uploadFn}
                  onMultipleSelected={camposImagem.length > 1 ? handleMultipleSelected : undefined}
                />
              ) : isSelect(item.tipo) ? (
                <CampoSelect value={item.resposta} onChange={(v) => onChange(idx, v)} opcoes={opcoes} />
              ) : isChecks(item.tipo) ? (
                <CampoChecks value={item.resposta} onChange={(v) => onChange(idx, v)} opcoes={opcoes} />
              ) : isRating(item.tipo) ? (
                <CampoRating value={item.resposta} onChange={(v) => onChange(idx, v)} />
              ) : isInt(item.tipo) ? (
                <CampoInt value={item.resposta} onChange={(v) => onChange(idx, v)} />
              ) : (
                <CampoTexto value={item.resposta} onChange={(v) => onChange(idx, v)} />
              )}
            </div>
          )
        })}
      </div>

      <DistribuirFotosModal
        aberto={!!bulkFiles}
        files={bulkFiles}
        campos={camposImagem}
        onConfirm={handleConfirmDistribuicao}
        onClose={() => setBulkFiles(null)}
      />
    </>
  )
}
