import { useState, useEffect } from 'react'
import { Copy, Check } from 'lucide-react'
import { Modal, Button } from '../ui'
import { salvarAnamnese, rotarImagemAnamnese } from '../../api/anamneses'
import { buscarRegistro, buscarRegistroPorData } from '../../api/evolucao'
import ImagemInterativa from '../../pages/Feedbacks/ImagemInterativa'
import { formatFeedbackParaCopia, copiarTexto } from '../../utils/copiarRespostas'

const FRAPPE_URL = import.meta.env.VITE_FRAPPE_URL || ''

const fmtData = (d) => {
  if (!d) return '—'
  const [y, m, day] = String(d).split(' ')[0].split('-')
  return `${day}/${m}/${y}`
}

const numBR = (n) => (n == null ? '—' : Number(n).toFixed(1).replace('.', ','))

// Detecta duplicação em sequência (idx 1..N + idx N+1..2N com mesmas perguntas)
// e escolhe a metade com mais informação preenchida — backend às vezes cria a
// child table 2x: a primeira leva fica sem `opcoes`/`conteudo_html`, a segunda
// fica completa. Cortar no primeiro repetido (versão anterior) ficava com a
// metade pobre e escondia opções de Select/Múltipla Escolha.
function dedupePerguntas(perguntas) {
  if (!Array.isArray(perguntas) || perguntas.length < 2) return perguntas || []
  const primeira = perguntas[0]
  const idxRep = perguntas.findIndex((p, i) =>
    i > 0
    && p?.pergunta === primeira?.pergunta
    && p?.tipo === primeira?.tipo,
  )
  if (idxRep === -1) return perguntas
  const a = perguntas.slice(0, idxRep)
  const b = perguntas.slice(idxRep)
  const score = (arr) =>
    arr.reduce((acc, p) => acc + (p?.opcoes ? 1 : 0) + (p?.conteudo_html ? 1 : 0) + (p?.resposta ? 1 : 0), 0)
  return score(b) > score(a) ? b : a
}

export default function AnamneseViewerModal({ anamnese, onClose, onAtualizada }) {
  const [respostas, setRespostas] = useState(
    dedupePerguntas(anamnese.perguntas_e_respostas || []).map(p => ({ ...p })),
  )
  const [editando, setEditando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const [imgSrcs, setImgSrcs] = useState({})
  const [registro, setRegistro] = useState(null)

  // Fonte única de fotos/peso: FK direta (registro_evolucao) tem prioridade;
  // fallback: busca por aluno + data da anamnese (date ou creation).
  useEffect(() => {
    let cancel = false
    const data = anamnese.date || String(anamnese.creation || '').split(' ')[0]
    if (anamnese.registro_evolucao) {
      buscarRegistro(anamnese.registro_evolucao)
        .then(r => { if (!cancel) setRegistro(r) })
        .catch(() => {})
    } else if (anamnese.aluno && data) {
      buscarRegistroPorData(anamnese.aluno, data)
        .then(r => { if (!cancel && r) setRegistro(r) })
        .catch(() => {})
    }
    return () => { cancel = true }
  }, [anamnese.registro_evolucao, anamnese.aluno, anamnese.date, anamnese.creation])

  const handleCopiarRespostas = async () => {
    const limpas = dedupePerguntas(respostas)
    const dados = { ...anamnese, perguntas_e_respostas: limpas }
    const ok = await copiarTexto(formatFeedbackParaCopia(dados, { tipo: 'Anamnese' }))
    if (ok) {
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    }
  }

  const setResposta = (idx, valor) =>
    setRespostas(prev => prev.map((p, i) => i === idx ? { ...p, resposta: valor } : p))

  const handleRotate = async (fileUrl, idx) => {
    // Persiste a rotação no servidor (mesmo padrão do feedback). Falha
    // silenciosa preserva ao menos a rotação visual via CSS transform.
    try {
      await rotarImagemAnamnese(anamnese.name, fileUrl, 'right')
    } catch (err) {
      console.warn('Rotação no servidor falhou:', err)
    }
    setImgSrcs(prev => ({
      ...prev,
      [`${anamnese.name}_${idx}`]: `${FRAPPE_URL}${fileUrl}?v=${Date.now()}`,
    }))
  }

  const salvar = async () => {
    setSalvando(true)
    try {
      const limpas = dedupePerguntas(respostas)
      await salvarAnamnese(anamnese.name, limpas)
      if (limpas.length !== respostas.length) setRespostas(limpas.map(p => ({ ...p })))
      setSalvo(true); setEditando(false)
      onAtualizada?.()
      setTimeout(() => setSalvo(false), 2000)
    } catch (e) {
      console.error(e)
      alert('Erro ao salvar anamnese.')
    } finally { setSalvando(false) }
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={anamnese.titulo || anamnese.name}
      subtitle={`${anamnese.nome_completo || anamnese.aluno || ''} · ${fmtData(anamnese.date)}`}
      size="lg"
      footer={
        <>
          {salvo && (
            <span className="text-[10px] text-green-400 font-bold bg-green-500/10 border border-green-500/20 px-2 py-1 rounded-lg self-center">
              Salvo
            </span>
          )}
          {editando ? (
            <>
              <Button variant="ghost" onClick={() => setEditando(false)}>Cancelar</Button>
              <Button variant="primary" loading={salvando} onClick={salvar}>Salvar</Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={onClose}>Fechar</Button>
              <Button
                variant="secondary"
                icon={copiado ? Check : Copy}
                onClick={handleCopiarRespostas}
              >
                {copiado ? 'Copiado' : 'Copiar respostas'}
              </Button>
              <Button variant="secondary" onClick={() => setEditando(true)}>Editar respostas</Button>
            </>
          )}
        </>
      }
    >
      <div className="p-4">
        {/* Evolução · Fotos & Peso — do Registro de Evolução vinculado */}
        {registro && (registro.peso != null || registro.fotos?.length > 0) && (
          <div className="bg-[#1a1a1a] rounded-xl border border-[#323238] p-4 mb-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Evolução · Fotos &amp; Peso</h3>
            {registro.peso != null && (
              <div className="mb-4">
                <span className="text-gray-500 text-[10px] uppercase tracking-wider font-bold">Peso</span>
                <p className="text-white text-2xl font-bold leading-none mt-1">
                  {numBR(registro.peso)} <span className="text-base text-gray-500">kg</span>
                </p>
              </div>
            )}
            {registro.fotos?.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {registro.fotos.map((f, i) => (
                  <div key={i}>
                    <p className="text-[#93C5FD] text-[10px] font-bold uppercase tracking-wider mb-1 truncate" title={f.rotulo}>
                      {f.rotulo}
                    </p>
                    {f.url ? (
                      <ImagemInterativa
                        src={imgSrcs[`${anamnese.name}_reg_${i}`] || `${FRAPPE_URL}${encodeURI(f.url)}`}
                        feedbackId={anamnese.name}
                        idx={`reg_${i}`}
                        onRotate={() => handleRotate(f.url, `reg_${i}`)}
                      />
                    ) : (
                      <div className="w-full aspect-[3/4] rounded-lg border border-dashed border-[#323238] flex items-center justify-center text-gray-600 text-[10px] text-center px-1">
                        sem foto neste período
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="divide-y divide-[#323238]/40 bg-[#1a1a1a] rounded-xl border border-[#323238] overflow-hidden">
          {respostas.map((item, idx) => {
            const isSecao = item.tipo === 'Quebra de Seção' || item.tipo === 'Quebra de Sessão' || item.tipo === 'Section Break'
            if (isSecao) return (
              <div key={idx} className="px-6 py-5 bg-[#111113] flex items-center gap-4">
                <div className="flex-1 h-px bg-[#323238]" />
                <span className="text-[#2563eb] text-xs font-bold uppercase tracking-widest shrink-0">
                  {item.pergunta}
                </span>
                <div className="flex-1 h-px bg-[#323238]" />
              </div>
            )
            if (item.tipo === 'Bloco HTML') return (
              <div key={idx} className="px-4 py-3 bg-[#0a0a0a]">
                <div
                  className="text-xs text-gray-400 prose prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: item.conteudo_html || item.pergunta }}
                />
              </div>
            )
            if (item.tipo === 'Anexar Imagem' || item.tipo === 'Attach Image') return (
              <div key={idx} className="hover:bg-white/5 transition-colors">
                <div className="px-4 pt-3 pb-1">
                  <p className="text-white text-xs font-bold">{item.pergunta}</p>
                </div>
                <div className="w-full pb-4">
                  {item.resposta
                    ? <ImagemInterativa
                        src={imgSrcs[`${anamnese.name}_${idx}`] || `${FRAPPE_URL}${item.resposta}`}
                        feedbackId={anamnese.name}
                        idx={idx}
                        onRotate={() => handleRotate(item.resposta, idx)}
                      />
                    : <span className="text-gray-600 text-xs italic px-4">Não enviada</span>}
                </div>
              </div>
            )
            const opcoes = String(item.opcoes || '').split('\n').map(s => s.trim()).filter(Boolean)
            const isSelect = item.tipo === 'Select' || item.tipo === 'Seleção'
            const isChecks = item.tipo === 'Checks' || item.tipo === 'Múltipla Escolha'
            const isRating = item.tipo === 'Rating' || item.tipo === 'Avaliação'
            const isInt = item.tipo === 'Int' || item.tipo === 'Número'
            // Múltipla escolha persiste como string com valores separados por ", " ou "\n".
            const marcadasMultipla = String(item.resposta || '')
              .split(/\n|,/).map(s => s.trim()).filter(Boolean)

            return (
              <div key={idx} className="px-4 py-3">
                <p className="text-white text-xs font-semibold leading-relaxed mb-1.5">
                  {item.pergunta}
                </p>
                {editando ? (
                  isSelect ? (
                    <select
                      value={item.resposta || ''}
                      onChange={e => setResposta(idx, e.target.value)}
                      className="w-full h-9 bg-[#29292e] border border-[#323238] focus:border-[#2563eb]/60 text-white text-xs rounded-lg px-3 outline-none"
                    >
                      <option value="">Selecione...</option>
                      {opcoes.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  ) : isChecks ? (
                    <div className="flex flex-col gap-1.5">
                      {opcoes.map(opt => {
                        const marcada = marcadasMultipla.includes(opt)
                        return (
                          <label key={opt} className="flex items-center gap-2 cursor-pointer text-xs text-gray-300 hover:text-white">
                            <input
                              type="checkbox"
                              checked={marcada}
                              onChange={() => {
                                const nova = marcada
                                  ? marcadasMultipla.filter(v => v !== opt)
                                  : [...marcadasMultipla, opt]
                                setResposta(idx, nova.join('\n'))
                              }}
                              className="accent-[#2563eb] w-4 h-4"
                            />
                            <span>{opt}</span>
                          </label>
                        )
                      })}
                    </div>
                  ) : isRating ? (
                    <input
                      type="number" min="0" max="5"
                      value={item.resposta || ''}
                      onChange={e => setResposta(idx, e.target.value)}
                      className="w-20 h-9 bg-[#29292e] border border-[#323238] focus:border-[#2563eb]/60 text-white text-xs rounded-lg px-3 outline-none"
                    />
                  ) : isInt ? (
                    <input
                      type="number"
                      value={item.resposta || ''}
                      onChange={e => setResposta(idx, e.target.value)}
                      className="w-32 h-9 bg-[#29292e] border border-[#323238] focus:border-[#2563eb]/60 text-white text-xs rounded-lg px-3 outline-none"
                    />
                  ) : (
                    <textarea
                      value={item.resposta || ''}
                      onChange={e => setResposta(idx, e.target.value)}
                      onInput={e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px' }}
                      style={{ minHeight: '2.5rem', overflow: 'hidden' }}
                      className="w-full bg-[#29292e] border border-[#323238] focus:border-[#2563eb]/60 text-white text-xs rounded-lg px-3 py-2 outline-none resize-none leading-relaxed transition-colors"
                    />
                  )
                ) : isChecks && marcadasMultipla.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {marcadasMultipla.map(v => (
                      <span key={v} className="px-2 py-0.5 rounded bg-[#2563eb]/15 border border-[#2563eb]/40 text-blue-200 text-[11px]">{v}</span>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-xs italic leading-relaxed">
                    {item.resposta || <span className="text-gray-600 not-italic opacity-50">Não respondida</span>}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </Modal>
  )
}
