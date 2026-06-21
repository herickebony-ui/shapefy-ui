import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Modal, Button, Input } from '../ui'

export default function CriarEnqueteModal({ isOpen, onClose, onSubmit }) {
  const [pergunta, setPergunta] = useState('')
  const [opcoes, setOpcoes] = useState(['', ''])
  const [loading, setLoading] = useState(false)

  const addOpcao = () => {
    if (opcoes.length < 10) setOpcoes([...opcoes, ''])
  }

  const removeOpcao = (i) => {
    if (opcoes.length <= 2) return
    setOpcoes(opcoes.filter((_, idx) => idx !== i))
  }

  const updateOpcao = (i, val) => {
    setOpcoes(opcoes.map((o, idx) => idx === i ? val : o))
  }

  const valid = pergunta.trim() && opcoes.every(o => o.trim()) && opcoes.length >= 2

  const handleSubmit = async () => {
    if (!valid || loading) return
    setLoading(true)
    try {
      await onSubmit({ pergunta: pergunta.trim(), opcoes: opcoes.map(o => o.trim()) })
      setPergunta('')
      setOpcoes(['', ''])
      onClose()
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nova enquete" size="md"
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={handleSubmit} loading={loading} disabled={!valid}>
            Publicar
          </Button>
        </div>
      }>
      <div className="p-4 space-y-4">
        <div>
          <label className="text-xs text-gray-400 font-medium mb-1 block">Pergunta</label>
          <Input value={pergunta} onChange={setPergunta} placeholder="Qual a sua preferência?" maxLength={200} />
        </div>

        <div>
          <label className="text-xs text-gray-400 font-medium mb-1.5 block">Opções</label>
          <div className="space-y-2">
            {opcoes.map((o, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input value={o} onChange={(v) => updateOpcao(i, v)}
                  placeholder={`Opção ${i + 1}`} maxLength={200} />
                {opcoes.length > 2 && (
                  <button onClick={() => removeOpcao(i)}
                    className="text-gray-500 hover:text-red-400 shrink-0 transition-colors">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
          {opcoes.length < 10 && (
            <button onClick={addOpcao}
              className="flex items-center gap-1.5 text-[#2563eb] text-xs font-medium mt-2 hover:underline">
              <Plus size={12} /> Adicionar opção
            </button>
          )}
        </div>
      </div>
    </Modal>
  )
}
