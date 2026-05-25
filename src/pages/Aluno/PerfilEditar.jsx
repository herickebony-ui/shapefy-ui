import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, AlertCircle, Camera, Loader2, X } from 'lucide-react'
import { Spinner } from '../../components/ui'
import { ActionButton, GlassCard, SectionHeader } from '../../components/aluno'
import { CampoLabel, CampoTexto, CampoSelect } from '../../components/aluno/form'
import { perfilEditarAluno, salvarPerfilAluno, uploadFotoAluno } from '../../api/aluno'
import useErrorModal from '../../hooks/useErrorModal'

const FRAPPE_URL = import.meta.env.VITE_FRAPPE_URL || ''

const FIELDTYPES_TEXTAREA = new Set(['Small Text', 'Text', 'Long Text', 'Text Editor', 'Code'])
const FIELDTYPES_NUMERO = new Set(['Int', 'Float', 'Currency', 'Percent'])

const inputBase =
  'w-full h-11 bg-[#0d0d0f] border border-[#1f1f24] focus:border-[#2563eb]/60 focus:shadow-[0_0_12px_rgba(37,99,235,0.15)] text-white text-sm rounded-xl px-3.5 outline-none transition-all'

const absUrl = (u) => {
  if (!u) return ''
  if (/^https?:\/\//i.test(u)) return u
  if (u.startsWith('/')) return `${FRAPPE_URL}${u}`
  return u
}

function CampoFoto({ value, onChange }) {
  const [enviando, setEnviando] = useState(false)
  const inputRef = useRef(null)

  const handleFile = async (file) => {
    if (!file) return
    setEnviando(true)
    try {
      const url = await uploadFotoAluno(file)
      if (url) onChange(url)
    } catch (err) {
      console.error('Falha no upload da foto:', err)
      alert('Falha ao enviar a foto. Tente novamente.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative w-20 h-20 rounded-full overflow-hidden border border-[var(--sf-border-strong)] bg-[#0d0d0f] flex items-center justify-center shrink-0">
        {value ? (
          <img src={absUrl(value)} alt="Foto" className="w-full h-full object-cover" />
        ) : (
          <Camera size={20} className="text-[var(--sf-text-soft)]" />
        )}
        {enviando && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <Loader2 size={18} className="text-[#60A5FA] animate-spin" />
          </div>
        )}
      </div>
      <div className="flex-1 flex flex-col gap-1.5">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => handleFile(e.target.files?.[0])}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={enviando}
          className="h-9 px-3 rounded-lg border border-[var(--sf-border-strong)] text-[#60A5FA] text-xs font-semibold hover:bg-[#2563EB]/15 transition-colors disabled:opacity-50"
        >
          {value ? 'Trocar foto' : 'Enviar foto'}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="h-8 px-3 rounded-lg text-[var(--sf-text-soft)] text-xs font-semibold hover:text-white flex items-center gap-1 self-start"
          >
            <X size={11} /> Remover
          </button>
        )}
      </div>
    </div>
  )
}

function renderInput(meta, value, onChange) {
  const ft = meta.fieldtype
  const ph = meta.label || ''

  if (ft === 'Attach Image' || ft === 'Attach') {
    return <CampoFoto value={value || ''} onChange={onChange} />
  }
  if (ft === 'Select') {
    const opcoes = (meta.options || '').split('\n').filter(o => o !== '')
    return <CampoSelect value={value || ''} onChange={onChange} opcoes={opcoes} />
  }
  if (FIELDTYPES_TEXTAREA.has(ft)) {
    return <CampoTexto value={value || ''} onChange={onChange} placeholder={ph} />
  }
  if (FIELDTYPES_NUMERO.has(ft)) {
    const step = ft === 'Int' ? '1' : '0.01'
    return (
      <input
        type="number"
        step={step}
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        placeholder={ph}
        className={inputBase}
      />
    )
  }
  if (ft === 'Date') {
    return (
      <input
        type="date"
        value={value ? String(value).split(/[T ]/)[0] : ''}
        onChange={e => onChange(e.target.value)}
        className={inputBase}
      />
    )
  }
  if (ft === 'Datetime') {
    return (
      <input
        type="datetime-local"
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        className={inputBase}
      />
    )
  }
  if (ft === 'Check') {
    return (
      <label className="flex items-center gap-2.5 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={!!Number(value)}
          onChange={e => onChange(e.target.checked ? 1 : 0)}
          className="w-4 h-4 accent-[#2563EB]"
        />
        <span className="text-white text-sm">{meta.description || 'Sim'}</span>
      </label>
    )
  }
  const tipoInput =
    ft === 'Phone' ? 'tel' :
    ft === 'Email' ? 'email' :
    ft === 'Password' ? 'password' :
    'text'
  return (
    <input
      type={tipoInput}
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
      placeholder={ph}
      className={inputBase}
    />
  )
}

export default function PerfilEditar() {
  const navigate = useNavigate()
  const errorModal = useErrorModal()
  const errorModalRef = useRef(errorModal)
  useEffect(() => { errorModalRef.current = errorModal }, [errorModal])

  const [meta, setMeta] = useState([])
  const [valores, setValores] = useState({})
  const [iniciais, setIniciais] = useState({})
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    let cancelado = false
    perfilEditarAluno()
      .then(res => {
        if (cancelado) return
        const m = Array.isArray(res?.meta) ? res.meta : []
        const a = res?.aluno || {}
        setMeta(m)
        setValores({ ...a })
        setIniciais({ ...a })
      })
      .catch(err => !cancelado && errorModalRef.current.show(err, 'Editar perfil'))
      .finally(() => !cancelado && setCarregando(false))
    return () => { cancelado = true }
  }, [])

  const camposVisiveis = useMemo(
    () => meta.filter(m => m.fieldname && m.fieldtype && !m.read_only),
    [meta]
  )

  const setCampo = (fieldname) => (val) => {
    setValores(prev => ({ ...prev, [fieldname]: val }))
    setErro('')
  }

  const validar = () => {
    for (const m of camposVisiveis) {
      if (!m.reqd) continue
      const v = valores[m.fieldname]
      const vazio = v === null || v === undefined || v === ''
      if (vazio) {
        setErro(`O campo "${m.label || m.fieldname}" é obrigatório.`)
        return false
      }
    }
    return true
  }

  const handleSalvar = async () => {
    if (!validar()) return
    setSalvando(true)
    setErro('')
    try {
      const diff = camposVisiveis
        .map(m => m.fieldname)
        .filter(fn => {
          const novo = valores[fn] ?? ''
          const antigo = iniciais[fn] ?? ''
          return String(novo) !== String(antigo)
        })
        .map(fn => ({ fieldname: fn, value: valores[fn] ?? '' }))

      if (diff.length === 0) {
        navigate('/aluno/perfil')
        return
      }

      await salvarPerfilAluno(diff)
      navigate('/aluno/perfil')
    } catch (err) {
      errorModalRef.current.show(err, 'Editar perfil')
    } finally {
      setSalvando(false)
    }
  }

  if (carregando) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-[var(--sf-bg)]">
        {errorModal.element}
        <Spinner />
      </div>
    )
  }

  return (
    <div className="pb-32 bg-[var(--sf-bg)] min-h-full">
      {errorModal.element}

      <div className="px-4 pt-4 pb-3 border-b border-[var(--sf-border)] bg-[var(--sf-bg)]/95 backdrop-blur-sm sticky top-0 z-10 flex items-center gap-3">
        <button
          onClick={() => navigate('/aluno/perfil')}
          title="Voltar"
          className="h-9 w-9 flex items-center justify-center text-gray-400 hover:text-white border border-[var(--sf-border)] hover:border-[var(--sf-border-strong)] rounded-lg transition-colors shrink-0"
        >
          <ArrowLeft size={16} />
        </button>
        <h1 className="text-white text-base font-bold">Editar Perfil</h1>
      </div>

      <div className="px-3 pt-4 space-y-3">
        <SectionHeader label="Informações" />
        <GlassCard as="div" className="px-4 py-4 space-y-4">
          {camposVisiveis.map(m => (
            <div key={m.fieldname}>
              <CampoLabel obrigatorio={!!m.reqd}>{m.label || m.fieldname}</CampoLabel>
              {renderInput(m, valores[m.fieldname], setCampo(m.fieldname))}
              {m.description && (m.fieldtype !== 'Check') && (
                <p className="text-[var(--sf-text-soft)] text-[11px] mt-1.5">{m.description}</p>
              )}
            </div>
          ))}
        </GlassCard>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-[var(--sf-bg)]/95 backdrop-blur-md border-t border-[var(--sf-border)] px-4 py-3 z-20">
        {erro && (
          <div className="flex items-center gap-2 text-xs text-[var(--sf-red)] mb-2 px-1">
            <AlertCircle size={14} />
            <span>{erro}</span>
          </div>
        )}
        <ActionButton
          variant="primary"
          fullWidth
          loading={salvando}
          onClick={handleSalvar}
        >
          Salvar alterações
        </ActionButton>
      </div>
    </div>
  )
}
