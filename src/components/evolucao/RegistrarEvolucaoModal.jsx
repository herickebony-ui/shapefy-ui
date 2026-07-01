import { useState, useEffect, useCallback, useRef } from 'react'
import { Save, X, Images } from 'lucide-react'
import { Modal, Button, FormGroup, Input, Select, Autocomplete } from '../ui'
import FotoSlotUpload from './FotoSlotUpload'
import DistribuirFotosModal from './DistribuirFotosModal'
import { listarConjuntos, buscarConjunto, conjuntoPadraoAtual } from '../../api/conjuntos'
import { criarRegistroManual, uploadFotoEvolucao } from '../../api/evolucao'
import { listarAlunos } from '../../api/alunos'
import useErrorModal from '../../hooks/useErrorModal'

const buscarAlunosFn = async (q) => {
  if (q.length < 1) return []
  try { return (await listarAlunos({ search: q, limit: 8 })).list } catch { return [] }
}

// Lançamento manual de evolução: aluno + data + peso + fotos por slot → Registro origem=manual.
export default function RegistrarEvolucaoModal({ alunoId = null, alunoNome = '', onClose, onCriado }) {
  const hoje = new Date().toISOString().slice(0, 10)
  const [aluno, setAluno] = useState(alunoId ? { name: alunoId, nome_completo: alunoNome || alunoId } : null)
  const [data, setData] = useState(hoje)
  const [peso, setPeso] = useState('')
  const [conjuntos, setConjuntos] = useState([])
  const [conjunto, setConjunto] = useState('')
  const [conjuntoSlots, setConjuntoSlots] = useState([])
  const [fotosSlots, setFotosSlots] = useState({})
  const [salvando, setSalvando] = useState(false)
  const [fotosMulti, setFotosMulti] = useState(null)
  const multiInputRef = useRef(null)
  const errorModal = useErrorModal()

  const carregarSlots = useCallback(async (conjuntoId) => {
    if (!conjuntoId) { setConjuntoSlots([]); return }
    try {
      const doc = await buscarConjunto(conjuntoId)
      setConjuntoSlots([...(doc.slots || [])].sort((a, b) => (a.ordem || 0) - (b.ordem || 0)))
    } catch { setConjuntoSlots([]) }
  }, [])

  useEffect(() => {
    listarConjuntos({ limit: 100 }).then(({ list }) => setConjuntos(list || [])).catch(() => {})
    conjuntoPadraoAtual().then((padrao) => { if (padrao) { setConjunto(padrao); carregarSlots(padrao) } }).catch(() => {})
  }, [carregarSlots])

  const handleSalvar = async () => {
    if (!aluno) {
      errorModal.show({ type: 'mandatory', title: 'Campos obrigatórios', messages: ['Campo obrigatório: Aluno'], statusCode: 0 }, 'Registrar evolução')
      return
    }
    let pesoNum = null
    if (peso.trim()) {
      pesoNum = parseFloat(peso.replace(',', '.'))
      if (isNaN(pesoNum) || pesoNum < 20 || pesoNum > 400) {
        errorModal.show({ type: 'validation', title: 'Peso inválido', messages: ['Informe um peso entre 20 e 400 kg.'], statusCode: 0 }, 'Registrar evolução')
        return
      }
    }
    const fotos = conjuntoSlots
      .map((s, i) => ({ slot_id: s.slot_id, rotulo: s.rotulo, ordem: s.ordem || i + 1, url: fotosSlots[s.slot_id] || '' }))
      .filter(f => f.url)
    if (!fotos.length && pesoNum == null) {
      errorModal.show({ type: 'validation', title: 'Nada pra registrar', messages: ['Adicione ao menos uma foto ou o peso.'], statusCode: 0 }, 'Registrar evolução')
      return
    }
    setSalvando(true)
    try {
      const payload = { aluno: aluno.name, data, peso: pesoNum, fotos }
      if (fotos.length) payload.conjunto_origem = conjunto
      const doc = await criarRegistroManual(payload)
      onCriado?.(doc)
      onClose()
    } catch (e) {
      errorModal.show(e, 'Registrar evolução')
    } finally {
      setSalvando(false)
    }
  }

  return (<>
    {errorModal.element}
    <Modal
      isOpen
      onClose={onClose}
      title="Registrar evolução"
      subtitle="Lançamento manual de peso e/ou fotos do aluno"
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" icon={Save} loading={salvando} onClick={handleSalvar}>Salvar</Button>
        </>
      }
    >
      <div className="p-4 space-y-4">
        <FormGroup label="Aluno" required>
          {aluno ? (
            <div className="flex items-center justify-between h-10 px-3 rounded-lg bg-[#29292e] border border-[#2563eb]/40">
              <p className="text-white text-sm font-medium truncate">{aluno.nome_completo}</p>
              {!alunoId && (
                <button onClick={() => setAluno(null)} className="text-gray-500 hover:text-red-400 transition-colors ml-2 shrink-0" title="Trocar aluno">
                  <X size={14} />
                </button>
              )}
            </div>
          ) : (
            <Autocomplete
              searchFn={buscarAlunosFn}
              onSelect={(a) => setAluno(a)}
              renderItem={(a) => (
                <div>
                  <p className="font-medium text-sm text-white">{a.nome_completo}</p>
                  {a.email && <p className="text-gray-500 text-xs">{a.email}</p>}
                </div>
              )}
              placeholder="Buscar aluno pelo nome..."
            />
          )}
        </FormGroup>

        <div className="grid grid-cols-2 gap-3">
          <FormGroup label="Data" hint="Pode ser retroativa">
            <Input type="date" value={data} onChange={setData} />
          </FormGroup>
          <FormGroup label="Peso (kg)" hint="Opcional">
            <Input value={peso} onChange={setPeso} placeholder="Ex: 72,5" />
          </FormGroup>
        </div>

        <FormGroup label="Conjunto de Fotos" hint="Define os slots de foto. Vazio = só peso.">
          <Select
            value={conjunto}
            onChange={(v) => { setConjunto(v); setFotosSlots({}); carregarSlots(v) }}
            options={conjuntos.map(c => ({ value: c.name, label: c.titulo }))}
            placeholder="Nenhum (só peso)"
          />
        </FormGroup>

        {conjuntoSlots.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Fotos por slot</span>
              <Button
                variant="secondary"
                size="xs"
                icon={Images}
                onClick={() => multiInputRef.current?.click()}
              >
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
                else if (files.length === 1) {
                  const [f] = files
                  const slotLivre = conjuntoSlots.find(s => !fotosSlots[s.slot_id])
                  if (slotLivre) {
                    uploadFotoEvolucao(f).then(url => {
                      if (url) setFotosSlots(prev => ({ ...prev, [slotLivre.slot_id]: url }))
                    }).catch(console.error)
                  }
                }
              }}
            />
          </div>
        )}
        {fotosMulti && (
          <DistribuirFotosModal
            files={fotosMulti}
            slots={conjuntoSlots}
            uploadFn={uploadFotoEvolucao}
            onConfirm={(novasFotos) => setFotosSlots(prev => ({ ...prev, ...novasFotos }))}
            onClose={() => setFotosMulti(null)}
          />
        )}
      </div>
    </Modal>
  </>)
}
