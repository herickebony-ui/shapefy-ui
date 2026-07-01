import { useState } from 'react'
import { X, Upload } from 'lucide-react'
import { Modal, Button } from '../ui'
import { toRenderableImage } from '../../utils/heicToJpeg'

// Modal de distribuição de fotos multi-seleção.
// O aluno/profissional seleciona N fotos de uma vez; aqui ele atribui
// cada uma a um slot antes do upload.
//
// Props:
//   files: File[]                     — fotos selecionadas
//   slots: {slot_id, rotulo}[]        — slots disponíveis no conjunto
//   uploadFn: async (File) => url     — função de upload (varia por contexto)
//   onConfirm: (fotosSlots) => void   — chamado após upload com {slot_id: url}
//   onClose: () => void
export default function DistribuirFotosModal({ files, slots, uploadFn, onConfirm, onClose }) {
  const [atribuicoes, setAtribuicoes] = useState(() =>
    files.map((file, i) => ({
      file,
      preview: URL.createObjectURL(file),
      slotId: slots[i]?.slot_id || '',
    }))
  )
  const [uploading, setUploading] = useState(false)
  const [progresso, setProgresso] = useState(0)

  const setSlot = (idx, slotId) => {
    setAtribuicoes(prev => prev.map((a, i) => i === idx ? { ...a, slotId } : a))
  }

  const remover = (idx) => {
    setAtribuicoes(prev => {
      URL.revokeObjectURL(prev[idx].preview)
      return prev.filter((_, i) => i !== idx)
    })
  }

  const confirmar = async () => {
    const comSlot = atribuicoes.filter(a => a.slotId)
    if (!comSlot.length) return
    setUploading(true)
    setProgresso(0)
    const resultado = {}
    let concluidos = 0
    await Promise.all(comSlot.map(async (item) => {
      try {
        // toRenderableImage converte HEIC→JPEG se necessário; uploadFn recebe o arquivo pronto
        const preparado = await toRenderableImage(item.file)
        const url = await uploadFn(preparado)
        if (url) resultado[item.slotId] = url
      } catch (e) {
        console.error('Falha ao enviar foto:', e)
      } finally {
        concluidos++
        setProgresso(Math.round((concluidos / comSlot.length) * 100))
      }
    }))
    setUploading(false)
    onConfirm(resultado)
    onClose()
  }

  const slotsOpts = [
    { value: '', label: '— Não atribuir —' },
    ...slots.map(s => ({ value: s.slot_id, label: s.rotulo })),
  ]

  const slotsUsados = atribuicoes.map(a => a.slotId).filter(Boolean)
  const temDuplicata = slotsUsados.length !== new Set(slotsUsados).size

  return (
    <Modal
      isOpen
      onClose={!uploading ? onClose : undefined}
      title="Distribuir fotos"
      subtitle={`${atribuicoes.length} foto${atribuicoes.length > 1 ? 's' : ''} selecionada${atribuicoes.length > 1 ? 's' : ''} — atribua cada uma a um slot`}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={uploading}>Cancelar</Button>
          <Button
            variant="primary"
            icon={Upload}
            onClick={confirmar}
            loading={uploading}
            disabled={!atribuicoes.some(a => a.slotId) || temDuplicata}
          >
            {uploading ? `Enviando… ${progresso}%` : 'Fazer upload'}
          </Button>
        </>
      }
    >
      <div className="p-4 space-y-4">
        {temDuplicata && (
          <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
            Dois ou mais arquivos estão atribuídos ao mesmo slot — cada slot pode receber apenas uma foto.
          </p>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {atribuicoes.map((item, idx) => (
            <div key={idx} className="bg-[#1a1a1a] border border-[#323238] rounded-xl p-2 space-y-2">
              <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-[#0a0a0a]">
                <img src={item.preview} alt={`foto ${idx + 1}`} className="w-full h-full object-cover" />
                {!uploading && (
                  <button
                    onClick={() => remover(idx)}
                    className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
                  >
                    <X size={10} />
                  </button>
                )}
              </div>
              <select
                value={item.slotId}
                onChange={e => setSlot(idx, e.target.value)}
                disabled={uploading}
                className="w-full h-7 px-1 bg-[#29292e] border border-[#323238] text-white rounded text-xs outline-none focus:border-[#2563eb]/60 appearance-none disabled:opacity-50"
              >
                {slotsOpts.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  )
}
