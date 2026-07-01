import { useState, useRef, useEffect } from 'react'
import { Save, Images } from 'lucide-react'
import { Modal, Button, FormGroup, Input } from '../ui'
import FotoSlotUpload from './FotoSlotUpload'
import DistribuirFotosModal from './DistribuirFotosModal'
import { salvarRegistro, uploadFotoEvolucao } from '../../api/evolucao'
import { buscarConjunto } from '../../api/conjuntos'
import useErrorModal from '../../hooks/useErrorModal'

// Modal de edição completa de um Registro de Evolução Física:
// data, peso e fotos por slot — tudo numa tela só.
export default function EditarRegistroModal({ registro, onClose, onSalvo }) {
  const [data, setData] = useState(String(registro.data || '').slice(0, 10))
  const [peso, setPeso] = useState(registro.peso != null && registro.peso > 0 ? String(registro.peso).replace('.', ',') : '')
  const [fotosSlots, setFotosSlots] = useState(() => {
    const mapa = {}
    for (const f of registro.fotos || []) if (f.slot_id) mapa[f.slot_id] = f.url || ''
    return mapa
  })
  const [conjuntoSlots, setConjuntoSlots] = useState([])
  const [salvando, setSalvando] = useState(false)
  const [fotosMulti, setFotosMulti] = useState(null)
  const multiInputRef = useRef(null)
  const errorModal = useErrorModal()

  useEffect(() => {
    if (!registro.conjunto_origem) {
      // Sem conjunto: deriva slots das fotos existentes
      const slots = (registro.fotos || [])
        .filter(f => f.slot_id)
        .map(f => ({ slot_id: f.slot_id, rotulo: f.rotulo || f.slot_id, ordem: f.ordem || 999 }))
        .sort((a, b) => a.ordem - b.ordem)
      setConjuntoSlots(slots)
      return
    }
    buscarConjunto(registro.conjunto_origem)
      .then(doc => setConjuntoSlots([...(doc.slots || [])].sort((a, b) => (a.ordem || 0) - (b.ordem || 0))))
      .catch(() => setConjuntoSlots([]))
  }, [registro.name, registro.conjunto_origem])

  const handleSalvar = async () => {
    const payload = { peso_revisado: 1 }
    if (data) payload.data = data
    const pesoNum = parseFloat(String(peso).replace(',', '.'))
    if (peso.trim()) {
      if (isNaN(pesoNum) || pesoNum < 20 || pesoNum > 400) {
        errorModal.show({ type: 'validation', title: 'Peso inválido', messages: ['Informe um peso entre 20 e 400 kg.'], statusCode: 0 }, 'Editar registro')
        return
      }
      payload.peso = pesoNum
    } else {
      payload.peso = null
    }
    // Reconstrói array de fotos com as novas URLs
    const fotosBase = registro.fotos || []
    const novasFotos = conjuntoSlots.map((s, i) => {
      const url = fotosSlots[s.slot_id] || ''
      const existente = fotosBase.find(f => f.slot_id === s.slot_id) || {}
      return { ...existente, slot_id: s.slot_id, rotulo: s.rotulo, ordem: s.ordem || i + 1, url }
    }).filter(f => f.url)
    // Fotos de slots não mapeados no conjunto (legados)
    for (const f of fotosBase) {
      if (f.slot_id && !conjuntoSlots.find(s => s.slot_id === f.slot_id) && fotosSlots[f.slot_id] !== '') {
        novasFotos.push({ ...f, url: fotosSlots[f.slot_id] ?? f.url })
      }
    }
    if (novasFotos.length) payload.fotos = novasFotos
    setSalvando(true)
    try {
      await salvarRegistro(registro.name, payload)
      onSalvo?.({ ...registro, ...payload, fotos: novasFotos })
      onClose()
    } catch (e) {
      errorModal.show(e, 'Editar registro')
    } finally {
      setSalvando(false)
    }
  }

  return (<>
    {errorModal.element}
    <Modal
      isOpen
      onClose={onClose}
      title="Editar registro"
      subtitle="Data, peso e fotos do registro de evolução"
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" icon={Save} loading={salvando} onClick={handleSalvar}>Salvar</Button>
        </>
      }
    >
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <FormGroup label="Data do registro" hint="Data original do registro">
            <Input type="date" value={data} onChange={setData} />
          </FormGroup>
          <FormGroup label="Peso (kg)" hint="Opcional">
            <Input value={peso} onChange={setPeso} placeholder="Ex: 72,5" />
          </FormGroup>
        </div>

        {conjuntoSlots.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 font-medium">Fotos</span>
              <Button variant="secondary" size="xs" icon={Images} onClick={() => multiInputRef.current?.click()}>
                Selecionar várias
              </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {conjuntoSlots.map(s => (
                <FotoSlotUpload
                  key={s.slot_id}
                  label={s.rotulo}
                  modelo={s.foto_modelo || ''}
                  modeloCrop={s.foto_modelo_crop || ''}
                  value={fotosSlots[s.slot_id] || ''}
                  onChange={(url) => setFotosSlots(prev => ({ ...prev, [s.slot_id]: url }))}
                />
              ))}
            </div>
            <input
              ref={multiInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp,image/heic,image/heif"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files || [])
                e.target.value = ''
                if (files.length > 1) setFotosMulti(files)
              }}
            />
          </div>
        )}
      </div>
    </Modal>

    {fotosMulti && (
      <DistribuirFotosModal
        files={fotosMulti}
        slots={conjuntoSlots}
        uploadFn={uploadFotoEvolucao}
        onConfirm={(novasUrls) => setFotosSlots(prev => ({ ...prev, ...novasUrls }))}
        onClose={() => setFotosMulti(null)}
      />
    )}
  </>)
}
