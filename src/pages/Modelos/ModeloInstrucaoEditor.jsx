import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Save, Plus, Trash2, ArrowUp, ArrowDown, Upload, Copy, ChevronDown,
  Settings, Check, Heading1, Heading2, Type, Video, FileText, Image as ImageIcon, AlertCircle,
} from 'lucide-react'
import {
  buscarModeloInstrucao, salvarModeloInstrucao, uploadArquivo,
  SEGMENTOS_INSTRUCAO, rotuloModelo,
} from '../../api/modelos'
import useAuthSrc from '../../hooks/useAuthSrc'
import { Button, Input, Textarea, Spinner, Modal, FormGroup } from '../../components/ui'

const BASE = import.meta.env.VITE_FRAPPE_URL

// Checkboxes dieta/treino/econômico — os mesmos do aluno.
const CheckSegmentos = ({ valores, onChange }) => (
  <div className="flex flex-wrap gap-2">
    {SEGMENTOS_INSTRUCAO.map((s) => {
      const on = !!valores[s.key]
      return (
        <button key={s.key} type="button"
          onClick={() => onChange({ ...valores, [s.key]: on ? 0 : 1 })}
          className={`inline-flex items-center gap-2 px-3 h-9 rounded-lg border text-sm transition-colors ${
            on ? 'bg-[#2563eb]/10 border-[#2563eb]/50 text-white' : 'bg-[#29292e] border-[#323238] text-gray-300 hover:border-gray-500'
          }`}>
          <span className={`h-4 w-4 rounded flex items-center justify-center border shrink-0 ${
            on ? 'bg-[#2563eb] border-[#2563eb]' : 'border-[#4a4a52]'
          }`}>
            {on && <Check size={11} className="text-white" />}
          </span>
          {s.label}
        </button>
      )
    })}
  </div>
)

// ─── Catálogo de blocos ───────────────────────────────────────────────────────

const BLOCK_TYPES = [
  { tipo: 'topico', label: 'Tópico', icon: Heading1, novo: () => ({ tipo: 'topico', texto: '' }) },
  { tipo: 'titulo', label: 'Título', icon: Heading2, novo: () => ({ tipo: 'titulo', texto: '' }) },
  { tipo: 'texto', label: 'Texto / lista', icon: Type, novo: () => ({ tipo: 'texto', texto: '' }) },
  { tipo: 'video', label: 'Vídeo', icon: Video, novo: () => ({ tipo: 'video', url: '' }) },
  { tipo: 'pdf', label: 'PDF', icon: FileText, novo: () => ({ tipo: 'pdf', file_url: '', label: '' }) },
  { tipo: 'imagem', label: 'Imagem', icon: ImageIcon, novo: () => ({ tipo: 'imagem', file_url: '', legenda: '' }) },
]

const META = Object.fromEntries(BLOCK_TYPES.map(b => [b.tipo, b]))

// ─── Editor de um bloco ───────────────────────────────────────────────────────

const BlocoEditor = ({ bloco, onChange }) => {
  const [uploading, setUploading] = useState(false)
  const fileSrc = useAuthSrc(bloco.file_url ? `${BASE}${bloco.file_url}` : null)

  const handleUpload = async (file) => {
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadArquivo(file)
      if (url) onChange({ ...bloco, file_url: url })
    } catch (e) {
      alert('Erro no upload: ' + (e?.message || 'desconhecido'))
    } finally {
      setUploading(false)
    }
  }

  if (bloco.tipo === 'topico' || bloco.tipo === 'titulo') {
    return (
      <Input
        value={bloco.texto || ''}
        onChange={(v) => onChange({ ...bloco, texto: v })}
        placeholder={bloco.tipo === 'topico'
          ? 'Tópico — texto maior (ex: REQUISITOS INICIAIS)'
          : 'Título — texto médio (ex: 1.0 - Fotos das refeições)'}
      />
    )
  }

  if (bloco.tipo === 'texto') {
    return (
      <Textarea
        value={bloco.texto || ''}
        onChange={(v) => onChange({ ...bloco, texto: v })}
        placeholder={'Escreva o texto. Use uma linha começando com "- " para virar item de lista.'}
        rows={5}
      />
    )
  }

  if (bloco.tipo === 'video') {
    return (
      <div className="space-y-1.5">
        <Input
          value={bloco.url || ''}
          onChange={(v) => onChange({ ...bloco, url: v })}
          placeholder="Cole a URL do vídeo (YouTube ou Vimeo)"
        />
        <p className="text-gray-500 text-xs">O aluno vê o vídeo embedado na página.</p>
      </div>
    )
  }

  if (bloco.tipo === 'pdf') {
    return (
      <div className="space-y-2">
        <Input
          value={bloco.label || ''}
          onChange={(v) => onChange({ ...bloco, label: v })}
          placeholder="Nome do arquivo (ex: Planilha exemplo)"
        />
        <div className="flex items-center gap-2">
          <label className="inline-flex items-center gap-2 h-9 px-3 rounded-lg bg-[#29292e] border border-[#323238] hover:border-[#2563eb]/60 text-sm text-gray-200 cursor-pointer transition-colors">
            {uploading ? <Spinner size="sm" /> : <Upload size={14} />}
            {bloco.file_url ? 'Trocar PDF' : 'Enviar PDF'}
            <input type="file" accept="application/pdf" className="hidden"
              onChange={(e) => { handleUpload(e.target.files?.[0]); e.target.value = '' }} />
          </label>
          {fileSrc && (
            <a href={fileSrc} target="_blank" rel="noreferrer"
              className="text-[#2563eb] text-xs underline truncate max-w-[200px]">
              {bloco.file_url.split('/').pop()}
            </a>
          )}
        </div>
      </div>
    )
  }

  if (bloco.tipo === 'imagem') {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <label className="inline-flex items-center gap-2 h-9 px-3 rounded-lg bg-[#29292e] border border-[#323238] hover:border-[#2563eb]/60 text-sm text-gray-200 cursor-pointer transition-colors">
            {uploading ? <Spinner size="sm" /> : <Upload size={14} />}
            {bloco.file_url ? 'Trocar imagem' : 'Enviar imagem'}
            <input type="file" accept="image/*" className="hidden"
              onChange={(e) => { handleUpload(e.target.files?.[0]); e.target.value = '' }} />
          </label>
        </div>
        {bloco.file_url && (
          <img src={fileSrc} alt="" className="max-h-48 rounded-lg border border-[#323238]" />
        )}
        <Input
          value={bloco.legenda || ''}
          onChange={(v) => onChange({ ...bloco, legenda: v })}
          placeholder="Legenda (opcional)"
        />
      </div>
    )
  }

  return null
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function ModeloInstrucaoEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const keyRef = useRef(0)
  const nextKey = () => { keyRef.current += 1; return keyRef.current }

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [titulo, setTitulo] = useState('')
  const [seg, setSeg] = useState({ dieta: 0, treino: 0, economico: 0 })
  const [descricao, setDescricao] = useState('')
  const [showConfig, setShowConfig] = useState(false)
  const [blocos, setBlocos] = useState([])
  const [salvando, setSalvando] = useState(false)
  const [salvoEm, setSalvoEm] = useState(false)
  const [menuMais, setMenuMais] = useState(null) // _k do bloco com o menu "+" aberto
  const [menuTipo, setMenuTipo] = useState(null) // _k do bloco com o menu de trocar tipo aberto

  const carregar = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const m = await buscarModeloInstrucao(id)
      setTitulo(m.titulo || '')
      setSeg({ dieta: m.dieta || 0, treino: m.treino || 0, economico: m.economico || 0 })
      setDescricao(m.descricao || '')
      let arr = []
      try { arr = JSON.parse(m.blocos_json || '[]') } catch { arr = [] }
      if (!Array.isArray(arr)) arr = []
      setBlocos(arr.map(b => ({ ...b, _k: nextKey() })))
    } catch (err) {
      setError(err?.message || 'Erro ao carregar modelo')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { carregar() }, [carregar])

  const addBloco = (tipoBloco, aposKey = null) => {
    const novo = { ...META[tipoBloco].novo(), _k: nextKey() }
    setBlocos(prev => {
      if (aposKey == null) return [...prev, novo]
      const i = prev.findIndex(b => b._k === aposKey)
      if (i < 0) return [...prev, novo]
      const arr = [...prev]
      arr.splice(i + 1, 0, novo)
      return arr
    })
    setSalvoEm(false)
  }

  const mudarTipo = (k, novoTipo) => {
    setBlocos(prev => prev.map(b => b._k === k ? { ...b, tipo: novoTipo } : b))
    setSalvoEm(false)
    setMenuTipo(null)
  }

  const duplicarBloco = (k) => {
    setBlocos(prev => {
      const i = prev.findIndex(b => b._k === k)
      if (i < 0) return prev
      const arr = [...prev]
      arr.splice(i + 1, 0, { ...prev[i], _k: nextKey() })
      return arr
    })
    setSalvoEm(false)
  }

  const updateBloco = (k, novo) => {
    setBlocos(prev => prev.map(b => b._k === k ? { ...novo, _k: k } : b))
    setSalvoEm(false)
  }

  const removeBloco = (k) => {
    setBlocos(prev => prev.filter(b => b._k !== k))
    setSalvoEm(false)
  }

  const moveBloco = (k, dir) => {
    setBlocos(prev => {
      const i = prev.findIndex(b => b._k === k)
      const j = i + dir
      if (i < 0 || j < 0 || j >= prev.length) return prev
      const arr = [...prev]
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
      return arr
    })
    setSalvoEm(false)
  }

  const handleSalvar = async () => {
    setSalvando(true)
    try {
      const limpos = blocos.map((b) => { const copy = { ...b }; delete copy._k; return copy })
      await salvarModeloInstrucao(id, {
        titulo: titulo.trim() || 'Sem título',
        ...seg,
        descricao: descricao.trim(),
        blocos_json: JSON.stringify(limpos),
      })
      setSalvoEm(true)
    } catch (e) {
      alert('Erro ao salvar: ' + (e?.message || 'desconhecido'))
    } finally {
      setSalvando(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-[60vh]"><Spinner /></div>
  }

  if (error) {
    return (
      <div className="p-8 text-white max-w-screen-md mx-auto">
        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
          <AlertCircle size={18} className="shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
        <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => navigate('/modelos/instrucoes')} className="mt-4">
          Voltar
        </Button>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 text-white">
      {(menuMais !== null || menuTipo !== null) && (
        <div className="fixed inset-0 z-10" onClick={() => { setMenuMais(null); setMenuTipo(null) }} />
      )}

      {showConfig && (
        <Modal
          isOpen
          onClose={() => setShowConfig(false)}
          title="Configurações do modelo"
          subtitle="Título, checkboxes e descrição"
          size="md"
          footer={<Button variant="primary" onClick={() => setShowConfig(false)}>Concluir</Button>}
        >
          <div className="p-5 space-y-4">
            <FormGroup label="Título" required>
              <Input value={titulo} onChange={(v) => { setTitulo(v); setSalvoEm(false) }} placeholder="Título do modelo" />
            </FormGroup>
            <FormGroup label="Para quem" hint="Os mesmos checkboxes do aluno. Ex: Dieta + Econômico = dieta econômica.">
              <CheckSegmentos valores={seg} onChange={(v) => { setSeg(v); setSalvoEm(false) }} />
            </FormGroup>
            <FormGroup label="Descrição">
              <Textarea value={descricao} onChange={(v) => { setDescricao(v); setSalvoEm(false) }} placeholder="Pra que serve este modelo…" rows={3} />
            </FormGroup>
            <p className="text-xs text-gray-500">As alterações são gravadas quando você clicar em <strong>Salvar</strong> no editor.</p>
          </div>
        </Modal>
      )}
      <div className="max-w-screen-md mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => navigate('/modelos/instrucoes')}
            className="h-9 w-9 flex items-center justify-center rounded-lg border border-[#323238] hover:border-gray-500 text-gray-300 hover:text-white transition-colors shrink-0">
            <ArrowLeft size={16} />
          </button>
          <div className="flex-1 min-w-0">
            <Input value={titulo} onChange={(v) => { setTitulo(v); setSalvoEm(false) }} placeholder="Título do modelo" />
          </div>
          <button onClick={() => setShowConfig(true)} title="Configurações do modelo"
            className="h-9 w-9 flex items-center justify-center rounded-lg border border-[#323238] hover:border-gray-500 text-gray-300 hover:text-white transition-colors shrink-0">
            <Settings size={16} />
          </button>
          <Button variant="primary" icon={Save} onClick={handleSalvar} loading={salvando} className="shrink-0">
            {salvoEm ? 'Salvo' : 'Salvar'}
          </Button>
        </div>

        {/* Resumo do tipo (definido nas configurações) */}
        <div className="mb-4 -mt-1">
          <button onClick={() => setShowConfig(true)}
            className="text-xs text-gray-400 hover:text-white transition-colors inline-flex items-center gap-1.5">
            <Settings size={11} /> Para: <span className="text-gray-200 font-medium">{rotuloModelo(seg)}</span> · editar configurações
          </button>
        </div>

        {/* Blocos */}
        <div className="space-y-3">
          {blocos.length === 0 && (
            <div className="text-center py-10 text-gray-500 text-sm border border-dashed border-[#323238] rounded-xl">
              Nenhum bloco ainda. Adicione o primeiro abaixo.
            </div>
          )}
          {blocos.map((bloco, idx) => {
            const Icon = META[bloco.tipo]?.icon || Type
            return (
              <div key={bloco._k} className="bg-[#1a1a1a] border border-[#323238] rounded-xl p-3 md:p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="relative">
                    <button onClick={() => setMenuTipo(menuTipo === bloco._k ? null : bloco._k)} title="Trocar o tipo do bloco"
                      className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                      <Icon size={14} />
                      <span className="text-xs font-semibold uppercase tracking-wider">{META[bloco.tipo]?.label || bloco.tipo}</span>
                      <ChevronDown size={12} />
                    </button>
                    {menuTipo === bloco._k && (
                      <div className="absolute left-0 top-7 z-20 w-44 bg-[#1a1a1a] border border-[#323238] rounded-lg shadow-xl p-1">
                        {BLOCK_TYPES.map((bt) => {
                          const I = bt.icon
                          const ativo = bt.tipo === bloco.tipo
                          return (
                            <button key={bt.tipo} onClick={() => mudarTipo(bloco._k, bt.tipo)}
                              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-left transition-colors ${ativo ? 'bg-[#29292e] text-white' : 'text-gray-200 hover:bg-[#29292e]'}`}>
                              <I size={13} className="text-gray-400" /> {bt.label}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="relative">
                      <button onClick={() => setMenuMais(menuMais === bloco._k ? null : bloco._k)} title="Inserir bloco abaixo"
                        className="h-7 w-7 flex items-center justify-center text-blue-400 hover:text-white hover:bg-blue-600 border border-[#323238] hover:border-blue-600 rounded-lg transition-colors">
                        <Plus size={12} />
                      </button>
                      {menuMais === bloco._k && (
                        <div className="absolute right-0 top-8 z-20 w-44 bg-[#1a1a1a] border border-[#323238] rounded-lg shadow-xl p-1">
                          {BLOCK_TYPES.map((bt) => {
                            const I = bt.icon
                            return (
                              <button key={bt.tipo}
                                onClick={() => { addBloco(bt.tipo, bloco._k); setMenuMais(null) }}
                                className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-gray-200 hover:bg-[#29292e] text-left transition-colors">
                                <I size={13} className="text-gray-400" /> {bt.label}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                    <button onClick={() => duplicarBloco(bloco._k)} title="Duplicar"
                      className="h-7 w-7 flex items-center justify-center text-gray-400 hover:text-white border border-[#323238] hover:border-gray-500 rounded-lg transition-colors">
                      <Copy size={12} />
                    </button>
                    <button onClick={() => moveBloco(bloco._k, -1)} disabled={idx === 0} title="Subir"
                      className="h-7 w-7 flex items-center justify-center text-gray-400 hover:text-white border border-[#323238] hover:border-gray-500 rounded-lg transition-colors disabled:opacity-30 disabled:hover:border-[#323238]">
                      <ArrowUp size={12} />
                    </button>
                    <button onClick={() => moveBloco(bloco._k, 1)} disabled={idx === blocos.length - 1} title="Descer"
                      className="h-7 w-7 flex items-center justify-center text-gray-400 hover:text-white border border-[#323238] hover:border-gray-500 rounded-lg transition-colors disabled:opacity-30 disabled:hover:border-[#323238]">
                      <ArrowDown size={12} />
                    </button>
                    <button onClick={() => removeBloco(bloco._k)} title="Remover"
                      className="h-7 w-7 flex items-center justify-center text-[#2563eb] hover:text-white border border-[#2563eb]/30 hover:bg-[#2563eb] rounded-lg transition-colors">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
                <BlocoEditor bloco={bloco} onChange={(novo) => updateBloco(bloco._k, novo)} />
              </div>
            )
          })}
        </div>

        {/* Adicionar bloco */}
        <div className="mt-4">
          <p className="text-gray-500 text-xs font-medium mb-2">Adicionar bloco</p>
          <div className="flex flex-row gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden py-0.5">
            {BLOCK_TYPES.map((bt) => {
              const Icon = bt.icon
              return (
                <button key={bt.tipo} onClick={() => addBloco(bt.tipo)}
                  className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-[#1a1a1a] border border-[#323238] hover:border-[#2563eb]/60 text-sm text-gray-200 whitespace-nowrap shrink-0 transition-colors">
                  <Plus size={13} /><Icon size={13} />{bt.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
