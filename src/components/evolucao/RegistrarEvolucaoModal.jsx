import { useState, useEffect, useRef, useCallback } from 'react'
import { Save, Upload, Trash2, Camera, X } from 'lucide-react'
import { Modal, Button, FormGroup, Input, Select, Autocomplete } from '../ui'
import client from '../../api/client'
import { listarConjuntos, buscarConjunto, conjuntoPadraoAtual } from '../../api/conjuntos'
import { criarRegistroManual } from '../../api/evolucao'
import { listarAlunos } from '../../api/alunos'
import useErrorModal from '../../hooks/useErrorModal'

const FRAPPE_URL = import.meta.env.VITE_FRAPPE_URL || ''

const buscarAlunosFn = async (q) => {
  if (q.length < 1) return []
  try { return (await listarAlunos({ search: q, limit: 8 })).list } catch { return [] }
}

// Upload de foto por slot — mesmo padrão do AvaliacaoForm (público, sem optimize).
function FotoUpload({ label, value, onChange }) {
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef(null)
  const errorModal = useErrorModal()

  const enviarArquivo = async (file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      errorModal.show({ type: 'validation', title: 'Arquivo inválido', messages: ['Envie apenas imagens (PNG, JPG, WEBP).'], statusCode: 0 }, 'Upload de foto')
      return
    }
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('is_private', '0')
      fd.append('optimize', '0')
      const res = await client.post('/api/method/upload_file', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      const url = res.data?.message?.file_url
      if (url) onChange(url)
    } catch (err) {
      errorModal.show(err, 'Upload de foto')
    } finally {
      setUploading(false)
    }
  }

  const preview = value ? `${FRAPPE_URL}${value}` : null

  return (
    <div className="bg-[#1a1a1a] border border-[#323238] rounded-lg p-2 space-y-2">
      {errorModal.element}
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 truncate">{label}</p>
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        className="relative aspect-square w-full rounded-lg border border-dashed border-[#323238] bg-[#0a0a0a] hover:border-[#2563eb]/50 overflow-hidden cursor-pointer transition-colors flex items-center justify-center"
      >
        {uploading ? (
          <span className="w-6 h-6 border-2 border-[#2563eb] border-t-transparent rounded-full animate-spin" />
        ) : preview ? (
          <img src={preview} alt={label} className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-1.5 text-gray-600 px-2 text-center">
            <Camera size={20} />
            <span className="text-[10px] leading-tight">Clique pra enviar</span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="flex-1 h-7 flex items-center justify-center gap-1 text-[10px] text-gray-400 hover:text-white border border-[#323238] hover:border-blue-500 rounded transition-colors disabled:opacity-40"
        >
          <Upload size={10} /> {value ? 'Trocar' : 'Enviar'}
        </button>
        {value && (
          <button
            type="button"
            disabled={uploading}
            onClick={() => onChange('')}
            title="Remover foto"
            className="h-7 w-7 flex items-center justify-center text-[#2563eb] hover:text-white border border-[#2563eb]/30 hover:bg-[#2563eb] rounded transition-colors disabled:opacity-40"
          >
            <Trash2 size={11} />
          </button>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; enviarArquivo(f) }} />
    </div>
  )
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
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {conjuntoSlots.map(s => (
              <FotoUpload
                key={s.slot_id}
                label={s.rotulo}
                value={fotosSlots[s.slot_id] || ''}
                onChange={(url) => setFotosSlots(prev => ({ ...prev, [s.slot_id]: url }))}
              />
            ))}
          </div>
        )}
      </div>
    </Modal>
  </>)
}
