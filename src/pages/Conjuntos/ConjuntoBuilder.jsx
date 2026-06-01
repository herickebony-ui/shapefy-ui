import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Plus, Trash2, ChevronUp, ChevronDown, Save, ArrowLeft, Images } from 'lucide-react'
import { criarConjunto, salvarConjunto, buscarConjunto } from '../../api/conjuntos'
import { Button, FormGroup, Input, Spinner } from '../../components/ui'
import useErrorModal from '../../hooks/useErrorModal'

const gerarId = () => `${Date.now()}_${Math.random().toString(36).slice(2)}`
const slotVazio = () => ({ _id: gerarId(), rotulo: '', obrigatorio: false, slot_id: '' })

export default function ConjuntoBuilder() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isNovo = id === 'novo'

  const [titulo, setTitulo] = useState('')
  const [enabled, setEnabled] = useState(true)
  const [slots, setSlots] = useState([slotVazio()])
  const [loading, setLoading] = useState(!isNovo)
  const [salvando, setSalvando] = useState(false)
  const [erroTitulo, setErroTitulo] = useState(null)
  const [erroGeral, setErroGeral] = useState(null)
  const errorModal = useErrorModal()

  useEffect(() => {
    if (isNovo) return
    buscarConjunto(id)
      .then((doc) => {
        setTitulo(doc.titulo || '')
        setEnabled(!!doc.enabled)
        // PRESERVA slot_id de cada slot — é a chave de alinhamento, imutável.
        setSlots(
          doc.slots?.length
            ? doc.slots.map((s) => ({
                _id: gerarId(),
                rotulo: s.rotulo || '',
                obrigatorio: !!s.obrigatorio,
                slot_id: s.slot_id || '',
              }))
            : [slotVazio()],
        )
      })
      .catch((e) => errorModal.show(e, 'Carregar conjunto'))
      .finally(() => setLoading(false))
  }, [id, isNovo])

  const addSlot = () => setSlots((p) => [...p, slotVazio()])
  const removeSlot = (idx) => setSlots((p) => p.filter((_, i) => i !== idx))
  const updateSlot = (idx, campo, valor) =>
    setSlots((p) => p.map((s, i) => (i === idx ? { ...s, [campo]: valor } : s)))
  const moverCima = (idx) =>
    setSlots((p) => {
      if (idx === 0) return p
      const a = [...p]
      ;[a[idx - 1], a[idx]] = [a[idx], a[idx - 1]]
      return a
    })
  const moverBaixo = (idx) =>
    setSlots((p) => {
      if (idx >= p.length - 1) return p
      const a = [...p]
      ;[a[idx], a[idx + 1]] = [a[idx + 1], a[idx]]
      return a
    })

  const salvar = async () => {
    setErroTitulo(null)
    setErroGeral(null)
    if (!titulo.trim()) {
      setErroTitulo('Informe o título do conjunto.')
      return
    }
    const validos = slots.filter((s) => s.rotulo.trim())
    if (!validos.length) {
      setErroGeral('Adicione ao menos um slot com rótulo.')
      return
    }
    setSalvando(true)
    const payload = {
      titulo: titulo.trim(),
      enabled: enabled ? 1 : 0,
      slots: validos.map((s, i) => ({
        rotulo: s.rotulo.trim(),
        obrigatorio: s.obrigatorio ? 1 : 0,
        ordem: i + 1,
        // só manda slot_id quando já existe (edição) — novos o backend gera.
        ...(s.slot_id ? { slot_id: s.slot_id } : {}),
      })),
    }
    try {
      if (isNovo) {
        const doc = await criarConjunto(payload)
        navigate(`/conjuntos-fotos/${doc.name}`, { replace: true })
      } else {
        await salvarConjunto(id, payload)
        navigate('/conjuntos-fotos')
      }
    } catch (e) {
      errorModal.show(e, isNovo ? 'Criar conjunto' : 'Salvar conjunto')
    } finally {
      setSalvando(false)
    }
  }

  if (loading) return <div className="flex justify-center py-24"><Spinner /></div>

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/conjuntos-fotos')}
          className="h-9 w-9 flex items-center justify-center text-gray-400 hover:text-white border border-[#323238] hover:border-gray-500 rounded-lg transition-colors shrink-0"
        >
          <ArrowLeft size={14} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-white text-lg font-bold">{isNovo ? 'Novo Conjunto de Fotos' : 'Editar Conjunto de Fotos'}</h1>
          <p className="text-gray-500 text-xs">Ângulos de foto reutilizáveis. O ID de cada slot é fixo — renomear não quebra a comparação histórica.</p>
        </div>
      </div>

      {erroGeral && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 text-sm">{erroGeral}</div>
      )}

      <div className="bg-[#29292e] rounded-xl border border-[#323238] p-4 space-y-4">
        <FormGroup label="Título do conjunto" required error={erroTitulo}>
          <Input value={titulo} onChange={(v) => { setTitulo(v); setErroTitulo(null) }} placeholder="Ex: Padrão Mensal, Avaliação Postural" error={!!erroTitulo} />
        </FormGroup>
        <label className="flex items-center gap-2 cursor-pointer w-fit">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="rounded border-[#323238] bg-[#1a1a1a] accent-[#2563eb]" />
          <span className="text-gray-400 text-xs">Ativo</span>
        </label>
      </div>

      <div className="space-y-3">
        {slots.map((s, idx) => (
          <div key={s._id} className="bg-[#29292e] rounded-xl border border-[#323238] p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-gray-600 text-xs font-bold min-w-[1.5rem]">#{idx + 1}</span>
              {s.slot_id && (
                <span className="text-[10px] text-gray-600 font-mono">id: {s.slot_id}</span>
              )}
              <div className="flex items-center gap-1 ml-auto">
                <button onClick={() => moverCima(idx)} disabled={idx === 0} className="h-6 w-6 flex items-center justify-center text-gray-500 hover:text-white border border-[#323238] rounded transition-colors disabled:opacity-30"><ChevronUp size={11} /></button>
                <button onClick={() => moverBaixo(idx)} disabled={idx === slots.length - 1} className="h-6 w-6 flex items-center justify-center text-gray-500 hover:text-white border border-[#323238] rounded transition-colors disabled:opacity-30"><ChevronDown size={11} /></button>
                <button onClick={() => removeSlot(idx)} className="h-6 w-6 flex items-center justify-center text-[#2563eb] hover:text-white border border-[#2563eb]/30 hover:bg-[#2563eb] rounded transition-colors"><Trash2 size={11} /></button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px] gap-3">
              <FormGroup label="Rótulo do ângulo">
                <Input value={s.rotulo} onChange={(v) => updateSlot(idx, 'rotulo', v)} placeholder="Ex: Frente, Costas, Lado direito" />
              </FormGroup>
              <FormGroup label="Obrigatório">
                <label className="flex items-center gap-2 cursor-pointer h-10">
                  <input type="checkbox" checked={s.obrigatorio} onChange={(e) => updateSlot(idx, 'obrigatorio', e.target.checked)} className="rounded border-[#323238] bg-[#1a1a1a] accent-[#2563eb]" />
                  <span className="text-gray-400 text-xs">{s.obrigatorio ? 'Sim' : 'Não'}</span>
                </label>
              </FormGroup>
            </div>
          </div>
        ))}
        <button onClick={addSlot} className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-[#323238] hover:border-[#2563eb]/50 text-gray-500 hover:text-[#2563eb] rounded-lg transition-colors text-sm font-medium">
          <Plus size={14} /> Adicionar slot
        </button>
      </div>

      <div className="flex items-center justify-end gap-3 pb-8">
        <Button variant="ghost" onClick={() => navigate('/conjuntos-fotos')}>Cancelar</Button>
        <Button variant="primary" icon={Save} loading={salvando} onClick={salvar}>{isNovo ? 'Criar Conjunto' : 'Salvar Alterações'}</Button>
      </div>
      {errorModal.element}
    </div>
  )
}
