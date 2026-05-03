import { useState } from 'react'
import { Modal, Button } from '../ui'
import { salvarAnamnese } from '../../api/anamneses'
import ImagemInterativa from '../../pages/Feedbacks/ImagemInterativa'

const FRAPPE_URL = import.meta.env.VITE_FRAPPE_URL || ''

const fmtData = (d) => {
  if (!d) return '—'
  const [y, m, day] = String(d).split(' ')[0].split('-')
  return `${day}/${m}/${y}`
}

function dedupePerguntas(perguntas) {
  if (!Array.isArray(perguntas) || perguntas.length < 2) return perguntas || []
  const primeira = perguntas[0]
  const idxRep = perguntas.findIndex((p, i) =>
    i > 0
    && p?.pergunta === primeira?.pergunta
    && p?.tipo === primeira?.tipo,
  )
  if (idxRep === -1) return perguntas
  return perguntas.slice(0, idxRep)
}

export default function AnamneseViewerModal({ anamnese, onClose, onAtualizada }) {
  const [respostas, setRespostas] = useState(
    dedupePerguntas(anamnese.perguntas_e_respostas || []).map(p => ({ ...p })),
  )
  const [editando, setEditando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)
  const [imgSrcs, setImgSrcs] = useState({})

  const setResposta = (idx, valor) =>
    setRespostas(prev => prev.map((p, i) => i === idx ? { ...p, resposta: valor } : p))

  const handleRotate = (fileUrl, idx) => {
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
              <Button variant="secondary" onClick={() => setEditando(true)}>Editar respostas</Button>
            </>
          )}
        </>
      }
    >
      <div className="p-4">
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
            if (item.tipo === 'Anexar Imagem') return (
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
            return (
              <div key={idx} className="px-4 py-3">
                <p className="text-white text-xs font-semibold leading-relaxed mb-1.5">
                  {item.pergunta}
                </p>
                {editando
                  ? <textarea
                      value={item.resposta || ''}
                      onChange={e => setResposta(idx, e.target.value)}
                      onInput={e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px' }}
                      style={{ minHeight: '2.5rem', overflow: 'hidden' }}
                      className="w-full bg-[#29292e] border border-[#323238] focus:border-[#2563eb]/60 text-white text-xs rounded-lg px-3 py-2 outline-none resize-none leading-relaxed transition-colors"
                    />
                  : <p className="text-gray-400 text-xs italic leading-relaxed">
                      {item.resposta || <span className="text-gray-600 not-italic opacity-50">Não respondida</span>}
                    </p>}
              </div>
            )
          })}
        </div>
      </div>
    </Modal>
  )
}
