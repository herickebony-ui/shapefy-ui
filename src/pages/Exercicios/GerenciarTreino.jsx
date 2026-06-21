import { useState, useEffect, useRef, useMemo } from 'react'
import { Plus, Edit, Trash2, X, RefreshCw, BookOpen, ExternalLink, Play, Shuffle, Zap } from 'lucide-react'
import {
  listarExercicios, salvarTreinoExercicio, excluirTreinoExercicio, listarGruposMusculares,
} from '../../api/fichas'
import { listarTodasTecnicas, salvarTecnica, excluirTecnica } from '../../api/tecnicas'
import {
  Button, FormGroup, Input, Select, Modal, EmptyState, DataTable, Badge, Textarea,
  ImportExcelButton, BotaoTutoriais, Autocomplete, Tabs,
} from '../../components/ui'
import { buscarSmart } from '../../utils/strings'
import { TUTORIAIS_EXERCICIOS } from '../../data/tutoriais'
import ListPage from '../../components/templates/ListPage'
import ExplorarBibliotecaModal from '../../components/ExplorarBibliotecaModal'
import { extractVideoId } from '../../utils/video'
import useErrorModal from '../../hooks/useErrorModal'
import useSelection from '../../hooks/useSelection'
import { excluirEmLote } from '../../utils/bulk'

const getEmbedUrl = (id, platform) => {
  const plat = String(platform || '').toLowerCase()
  if (plat.includes('vimeo')) return `https://player.vimeo.com/video/${id}?autoplay=1`
  if (plat.includes('drive')) return `https://drive.google.com/file/d/${id}/preview`
  return `https://www.youtube.com/embed/${id}?rel=0&autoplay=1&modestbranding=1`
}

const VideoPreviewModal = ({ video, onClose }) => {
  if (!video?.id) return null
  return (
    <Modal isOpen onClose={onClose} title={video.titulo || 'Pré-visualização'} size="lg">
      <div className="p-3">
        <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-[#323238] bg-black">
          <iframe
            src={getEmbedUrl(video.id, video.platform)}
            title={video.titulo || 'Exercício'}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            className="w-full h-full"
          />
        </div>
      </div>
    </Modal>
  )
}

const normalizar = (s = '') =>
  String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()

const PLATAFORMAS = ['YouTube', 'Google Drive', 'Vimeo']

const extractVideoInfo = (input) => {
  if (!input || !input.includes('://')) return null
  try {
    const url = new URL(input)
    const host = url.hostname.replace('www.', '')

    if (host === 'youtube.com' || host === 'youtu.be') {
      let id = null
      if (host === 'youtu.be') id = url.pathname.slice(1).split('?')[0]
      else if (url.searchParams.get('v')) id = url.searchParams.get('v')
      else { const m = url.pathname.match(/\/(embed|shorts|v)\/([^/?]+)/); if (m) id = m[2] }
      if (id) return { id, platform: 'YouTube' }
    }

    if (host === 'drive.google.com') {
      const m = url.pathname.match(/\/d\/([^/]+)/)
      const id = m ? m[1] : url.searchParams.get('id')
      if (id) return { id, platform: 'Google Drive' }
    }

    if (host === 'vimeo.com' || host === 'player.vimeo.com') {
      const m = url.pathname.match(/\/(?:video\/)?(\d+)/)
      if (m) return { id: m[1], platform: 'Vimeo' }
    }
  } catch { }
  return null
}

const buildVideoUrl = (id, platform) => {
  if (!id) return ''
  const trimmed = String(id).trim()
  if (trimmed.includes('://')) return trimmed
  switch (platform) {
    case 'YouTube':      return `https://www.youtube.com/watch?v=${trimmed}`
    case 'Google Drive': return `https://drive.google.com/file/d/${trimmed}/view`
    case 'Vimeo':        return `https://vimeo.com/${trimmed}`
    default:             return ''
  }
}

const INTENSIDADE_OPCOES = [
  { value: '0,25', label: '0,25 — Leve' },
  { value: '0,5',  label: '0,5 — Moderado' },
  { value: '1',    label: '1,0 — Principal' },
]

// Normaliza valor de intensidade salvo (pode vir com ponto de versões antigas).
const normIntensidade = (v) => String(v ?? '').replace('.', ',')

// ─── ModalExercicio ───────────────────────────────────────────────────────────

const ModalExercicio = ({ exercicio, grupos, exercicios: todosExercicios = [], onSave, onClose, onVerVideo }) => {
  const isEdit = !!exercicio?.name
  const [saving, setSaving] = useState(false)
  const errorModal = useErrorModal()

  const [nome, setNome] = useState(exercicio?.nome_do_exercicio || '')
  const [grupo, setGrupo] = useState(exercicio?.grupo_muscular || '')
  const [video, setVideo] = useState(exercicio?.video || '')
  const [plataforma, setPlataforma] = useState(exercicio?.['plataforma_do_vídeo'] || 'YouTube')
  const [videoDetected, setVideoDetected] = useState(false)
  const [substitutos, setSubstitutos] = useState([]) // [{name, nome}]

  useEffect(() => {
    if (!exercicio?.name) return
    import('../../api/client').then(({ default: client }) => {
      client.get(`/api/resource/Treino%20Exercicio/${encodeURIComponent(exercicio.name)}`)
        .then(res => {
          const subs = res.data?.data?.substitutos || []
          setSubstitutos(subs.map(s => ({ name: s.exercicio, nome: s.nome_exercicio || s.exercicio })))
        })
        .catch(() => {})
    })
  }, [exercicio?.name])

  const handleVideoChange = (v) => {
    const info = extractVideoInfo(v)
    if (info) {
      setVideo(info.id)
      setPlataforma(info.platform)
      setVideoDetected(true)
    } else {
      setVideo(v)
      setVideoDetected(false)
    }
  }
  const [enabled, setEnabled] = useState(exercicio?.enabled ?? 1)
  const [intensidades, setIntensidades] = useState(() => {
    try {
      const raw = exercicio?.intensidade_json
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : (raw || [])
      return Array.isArray(parsed)
        ? parsed.map(i => ({ ...i, intensidade: normIntensidade(i.intensidade) }))
        : []
    } catch { return [] }
  })

  const addIntens = () => setIntensidades(prev => [...prev, { grupo_muscular: '', intensidade: '1' }])
  const updIntens = (i, field, val) => setIntensidades(prev => prev.map((it, idx) => idx === i ? { ...it, [field]: val } : it))
  const removeIntens = (i) => setIntensidades(prev => prev.filter((_, idx) => idx !== i))

  const handleSave = async () => {
    if (!nome.trim()) {
      errorModal.show({
        type: 'mandatory',
        title: 'Campo obrigatório',
        messages: ['Nome do exercício é obrigatório.'],
        statusCode: 0,
      }, isEdit ? 'Salvar exercício' : 'Criar exercício')
      return
    }
    setSaving(true)
    try {
      const intens = intensidades.filter(i => i.grupo_muscular && i.intensidade !== '')
      const payload = {
        nome_do_exercicio: nome.trim(),
        grupo_muscular: grupo,
        video,
        'plataforma_do_vídeo': plataforma,
        enabled,
        intensidade: intens.map(i => ({
          doctype: 'Treino Exercicio Grupo Muscular',
          grupo_muscular: i.grupo_muscular,
          intensidade: normIntensidade(i.intensidade),
        })),
        substitutos: substitutos.map(s => ({
          doctype: 'Treino Exercicio Substituto',
          exercicio: s.name,
        })),
      }
      const resultado = await salvarTreinoExercicio(isEdit ? exercicio.name : null, payload)
      onSave(resultado)
    } catch (e) {
      errorModal.show(e, isEdit ? 'Salvar exercício' : 'Criar exercício')
    } finally { setSaving(false) }
  }

  const grupoOpts = useMemo(() => grupos.map(g => ({ value: g, label: g })), [grupos])

  return (<>
    {errorModal.element}
    <Modal
      isOpen
      onClose={onClose}
      title={isEdit ? 'Editar Exercício' : 'Novo Exercício'}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={handleSave} loading={saving}>Salvar</Button>
        </>
      }
    >
      <div className="p-4 space-y-4">

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormGroup label="Nome do Exercício" required>
            <Input value={nome} onChange={setNome} placeholder="Ex: Agachamento Livre" />
          </FormGroup>
          <FormGroup label="Grupo Muscular">
            <Select value={grupo} onChange={setGrupo} options={grupoOpts} placeholder="Selecionar..." />
          </FormGroup>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormGroup
            label="Link ou ID do Vídeo"
            hint={videoDetected ? '✓ ID extraído automaticamente' : 'Cole o link ou o código do vídeo'}
          >
            <div className="flex gap-2">
              <div className="flex-1">
                <Input value={video} onChange={handleVideoChange} placeholder="https://youtu.be/... ou dQw4w9WgXcQ" />
              </div>
              <button
                type="button"
                onClick={() => {
                  const url = buildVideoUrl(video, plataforma)
                  if (url) window.open(url, '_blank', 'noopener,noreferrer')
                }}
                disabled={!video}
                title="Abrir vídeo em nova aba"
                className="h-10 w-10 flex items-center justify-center text-blue-400 hover:text-white hover:bg-blue-600 border border-[#323238] hover:border-blue-600 rounded-lg transition-colors shrink-0 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-blue-400 disabled:hover:border-[#323238]"
              >
                <ExternalLink size={14} />
              </button>
            </div>
          </FormGroup>
          <FormGroup label="Plataforma">
            <Select value={plataforma} onChange={setPlataforma} options={PLATAFORMAS} />
          </FormGroup>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={!!enabled} onChange={e => setEnabled(e.target.checked ? 1 : 0)}
            className="accent-[#2563eb] w-4 h-4" />
          <span className="text-sm text-gray-300">Exercício ativo</span>
        </label>

        <div className="border border-[#2563eb]/30 bg-[#2563eb]/5 rounded-lg overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2 bg-[#2563eb]/10 border-b border-[#2563eb]/20">
            <Shuffle size={13} className="text-blue-400 shrink-0" />
            <span className="text-xs font-bold text-blue-300 uppercase tracking-wider">Exercícios Substitutos</span>
          </div>
          <div className="p-3">
            <Autocomplete
              key={substitutos.length}
              placeholder="Buscar exercício substituto... (use % como coringa)"
              icon={Shuffle}
              searchFn={async (q) => {
                return todosExercicios.filter(e =>
                  buscarSmart(e.nome_do_exercicio, q) &&
                  e.name !== exercicio?.name &&
                  !substitutos.some(s => s.name === e.name)
                ).slice(0, 10)
              }}
              onSelect={(e) => setSubstitutos(prev => [...prev, { name: e.name, nome: e.nome_do_exercicio }])}
              renderItem={(e) => <span className="text-sm text-white">{e.nome_do_exercicio}</span>}
              emptyState={<span className="text-xs text-gray-500">Nenhum exercício encontrado</span>}
            />
            {substitutos.length === 0 ? (
              <p className="text-gray-600 text-xs text-center py-3">Nenhum substituto cadastrado.</p>
            ) : (
              <div className="mt-2 flex flex-col gap-1">
                {substitutos.map((s, i) => {
                  const exInfo = todosExercicios.find(e => e.name === s.name)
                  const temVideo = !!exInfo?.video
                  return (
                    <div key={s.name} className="flex items-center justify-between px-3 py-2 bg-[#29292e] rounded-lg">
                      <span className="text-gray-200 text-xs">{s.nome}</span>
                      <div className="flex items-center gap-1">
                        {temVideo && (
                          <button
                            onClick={() => onVerVideo?.({ id: exInfo.video, platform: exInfo['plataforma_do_vídeo'] || 'YouTube', titulo: exInfo.nome_do_exercicio })}
                            title="Ver vídeo"
                            className="h-6 w-6 flex items-center justify-center text-gray-400 hover:text-white border border-[#323238] hover:border-gray-500 rounded-lg transition-colors"
                          >
                            <Play size={10} />
                          </button>
                        )}
                        <button onClick={() => setSubstitutos(prev => prev.filter((_, idx) => idx !== i))}
                          className="h-6 w-6 flex items-center justify-center text-gray-500 hover:text-red-400 transition-colors">
                          <X size={11} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <div className="border border-[#323238] rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 bg-[#1a1a1a] border-b border-[#323238]">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Intensidade por Grupo Muscular</span>
            <button onClick={addIntens}
              className="h-6 w-6 flex items-center justify-center bg-[#29292e] text-green-400 hover:bg-green-600 hover:text-white rounded transition-colors">
              <Plus size={11} />
            </button>
          </div>
          {intensidades.length === 0 ? (
            <p className="text-gray-600 text-xs text-center py-4">Nenhuma intensidade cadastrada.</p>
          ) : (
            <>
              {/* Desktop: tabela */}
              <table className="hidden md:table w-full text-xs">
                <thead>
                  <tr className="text-gray-500 text-[10px] uppercase border-b border-[#323238]">
                    <th className="text-left px-3 py-2">Grupo Muscular</th>
                    <th className="text-left px-3 py-2 w-40">Intensidade</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {intensidades.map((it, i) => (
                    <tr key={i} className="border-b border-[#323238]/50 last:border-0">
                      <td className="px-2 py-1">
                        <select value={it.grupo_muscular} onChange={e => updIntens(i, 'grupo_muscular', e.target.value)}
                          className="w-full h-9 px-2 bg-[#29292e] border border-[#323238] text-white rounded text-xs outline-none focus:border-[#2563eb]/60 appearance-none">
                          <option value="">Selecionar...</option>
                          {grupos.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                      </td>
                      <td className="px-2 py-1">
                        <select value={String(it.intensidade)} onChange={e => updIntens(i, 'intensidade', e.target.value)}
                          className="w-full h-9 px-2 bg-[#29292e] border border-[#323238] text-white rounded text-xs outline-none focus:border-[#2563eb]/60 appearance-none">
                          {INTENSIDADE_OPCOES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </td>
                      <td className="px-2 py-1 text-center">
                        <button onClick={() => removeIntens(i)}
                          className="h-8 w-8 flex items-center justify-center text-red-400 hover:bg-red-600 hover:text-white rounded transition-colors mx-auto">
                          <X size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Mobile: linhas empilhadas com selects largos */}
              <div className="md:hidden divide-y divide-[#323238]/50">
                {intensidades.map((it, i) => (
                  <div key={i} className="px-3 py-2.5 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500">Linha {i + 1}</span>
                      <button onClick={() => removeIntens(i)}
                        className="h-7 w-7 flex items-center justify-center text-red-400 hover:bg-red-600 hover:text-white rounded transition-colors">
                        <X size={12} />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <select value={it.grupo_muscular} onChange={e => updIntens(i, 'grupo_muscular', e.target.value)}
                        className="w-full h-10 px-2 bg-[#29292e] border border-[#323238] text-white rounded-lg text-xs outline-none focus:border-[#2563eb]/60 appearance-none">
                        <option value="">Grupo…</option>
                        {grupos.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                      <select value={String(it.intensidade)} onChange={e => updIntens(i, 'intensidade', e.target.value)}
                        className="w-full h-10 px-2 bg-[#29292e] border border-[#323238] text-white rounded-lg text-xs outline-none focus:border-[#2563eb]/60 appearance-none">
                        {INTENSIDADE_OPCOES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </Modal>
  </>)
}

// ─── ModalTecnica ─────────────────────────────────────────────────────────────

const ModalTecnica = ({ tecnica, onSave, onClose }) => {
  const isEdit = !!tecnica?.name
  const [saving, setSaving] = useState(false)
  const [nome, setNome] = useState(tecnica?.nome || '')
  const [descricao, setDescricao] = useState(tecnica?.descricao || '')
  const [video, setVideo] = useState(tecnica?.video || '')
  const [plataforma, setPlataforma] = useState(tecnica?.['plataforma_do_vídeo'] || 'YouTube')
  const [enabled, setEnabled] = useState(tecnica?.enabled ?? 1)
  const [videoDetected, setVideoDetected] = useState(false)
  const errorModal = useErrorModal()

  const handleVideoChange = (v) => {
    const info = extractVideoInfo(v)
    if (info) { setVideo(info.id); setPlataforma(info.platform); setVideoDetected(true) }
    else { setVideo(v); setVideoDetected(false) }
  }

  const handleSave = async () => {
    if (!nome.trim()) {
      errorModal.show({ type: 'mandatory', title: 'Campo obrigatório', messages: ['Nome da técnica é obrigatório.'], statusCode: 0 }, 'Salvar técnica')
      return
    }
    setSaving(true)
    try {
      const resultado = await salvarTecnica(isEdit ? tecnica.name : null, {
        nome: nome.trim(), descricao, video, 'plataforma_do_vídeo': plataforma, enabled,
      })
      onSave(resultado)
    } catch (e) { errorModal.show(e, 'Salvar técnica') }
    finally { setSaving(false) }
  }

  return (<>
    {errorModal.element}
    <Modal isOpen onClose={onClose} title={isEdit ? 'Editar Técnica' : 'Nova Técnica'} size="md"
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button variant="primary" onClick={handleSave} loading={saving}>Salvar</Button></>}
    >
      <div className="p-4 space-y-4">
        <FormGroup label="Nome da Técnica" required>
          <Input value={nome} onChange={setNome} placeholder="Ex: Dropset, Strip Set, Backoff Set..." />
        </FormGroup>
        <FormGroup label="Descrição" hint="Explique como executar a técnica">
          <Textarea value={descricao} onChange={setDescricao} rows={4} placeholder="Descreva a execução, quando usar, benefícios..." />
        </FormGroup>
        <div className="grid grid-cols-2 gap-4">
          <FormGroup label="Link ou ID do Vídeo" hint={videoDetected ? '✓ ID extraído automaticamente' : undefined}>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input value={video} onChange={handleVideoChange} placeholder="https://youtu.be/..." />
              </div>
              <button type="button" onClick={() => { const url = buildVideoUrl(video, plataforma); if (url) window.open(url, '_blank', 'noopener,noreferrer') }}
                disabled={!video}
                className="h-10 w-10 flex items-center justify-center text-blue-400 hover:text-white hover:bg-blue-600 border border-[#323238] hover:border-blue-600 rounded-lg transition-colors shrink-0 disabled:opacity-30 disabled:cursor-not-allowed">
                <ExternalLink size={14} />
              </button>
            </div>
          </FormGroup>
          <FormGroup label="Plataforma">
            <Select value={plataforma} onChange={setPlataforma} options={PLATAFORMAS} />
          </FormGroup>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={!!enabled} onChange={e => setEnabled(e.target.checked ? 1 : 0)} className="accent-[#2563eb] w-4 h-4" />
          <span className="text-sm text-gray-300">Técnica ativa</span>
        </label>
      </div>
    </Modal>
  </>)
}

// ─── AbaTecnicas ──────────────────────────────────────────────────────────────

function AbaTecnicas() {
  const errorModal = useErrorModal()
  const [tecnicas, setTecnicas] = useState([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState(null)
  const [deletando, setDeletando] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [showBiblioteca, setShowBiblioteca] = useState(false)
  const [videoAberto, setVideoAberto] = useState(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const carregar = async () => {
    setLoading(true)
    try { setTecnicas(await listarTodasTecnicas()) }
    catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { carregar() }, [])

  const normalizar = (s = '') => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

  const filtradas = useMemo(() => {
    const q = normalizar(busca)
    return tecnicas.filter(t => !q || normalizar(t.nome).includes(q) || normalizar(t.descricao || '').includes(q))
  }, [tecnicas, busca])

  useEffect(() => { setPage(1) }, [busca])

  const handleSave = (resultado) => {
    setTecnicas(prev => {
      const idx = prev.findIndex(t => t.name === resultado?.name)
      if (idx >= 0) { const a = [...prev]; a[idx] = resultado; return a }
      return [resultado, ...prev]
    })
    setModalOpen(false); setEditando(null)
  }

  const handleDelete = async () => {
    if (!deletando) return
    setDeleting(true)
    try {
      await excluirTecnica(deletando.name)
      setTecnicas(await listarTodasTecnicas())
      setDeletando(null)
    } catch (e) { errorModal.show(e, 'Excluir técnica') }
    finally { setDeleting(false) }
  }

  const columns = [
    {
      label: 'Nome',
      render: (t) => (
        <div>
          <div className="flex items-center gap-2">
            <Zap size={12} className="text-amber-400 shrink-0" />
            <span className="text-white font-medium text-sm">{t.nome}</span>
          </div>
          {t.descricao && (
            <p className="text-gray-500 text-xs mt-0.5 line-clamp-1 ml-[20px]">{t.descricao}</p>
          )}
        </div>
      ),
    },
    {
      label: 'Status',
      headerClass: 'hidden sm:table-cell',
      cellClass: 'hidden sm:table-cell',
      render: (t) => <Badge variant={t.enabled ? 'success' : 'default'} size="sm">{t.enabled ? 'Ativa' : 'Inativa'}</Badge>,
    },
    {
      label: 'Ações',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (t) => (
        <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
          {t.video && (
            <button onClick={() => setVideoAberto({ id: t.video, platform: t['plataforma_do_vídeo'] || 'YouTube', titulo: t.nome })}
              className="h-7 w-7 flex items-center justify-center text-gray-400 hover:text-white border border-[#323238] hover:border-gray-500 rounded-lg transition-colors" title="Visualizar vídeo">
              <Play size={12} />
            </button>
          )}
          <button onClick={() => { setEditando(t); setModalOpen(true) }}
            className="h-7 w-7 flex items-center justify-center text-blue-400 hover:text-white hover:bg-blue-600 border border-[#323238] hover:border-blue-600 rounded-lg transition-colors" title="Editar">
            <Edit size={12} />
          </button>
          <button onClick={() => setDeletando(t)}
            className="h-7 w-7 flex items-center justify-center text-[#850000] hover:text-white border border-[#850000]/30 hover:bg-[#850000] rounded-lg transition-colors" title="Excluir">
            <Trash2 size={12} />
          </button>
        </div>
      ),
    },
  ]

  return (
    <>
      <ListPage
        title="Técnicas Intensificadoras"
        subtitle={`${tecnicas.length} técnica${tecnicas.length !== 1 ? 's' : ''} cadastrada${tecnicas.length !== 1 ? 's' : ''}`}
        actions={
          <>
            <Button variant="secondary" size="sm" icon={RefreshCw} onClick={carregar} loading={loading} />
            <Button variant="secondary" size="sm" icon={BookOpen} onClick={() => setShowBiblioteca(true)}>Explorar Biblioteca</Button>
            <Button variant="primary" size="sm" icon={Plus} onClick={() => { setEditando(null); setModalOpen(true) }}>Nova Técnica</Button>
          </>
        }
        filters={[{
          type: 'search', value: busca,
          onChange: (v) => { setBusca(v); setPage(1) },
          placeholder: 'Buscar técnica...',
        }]}
        loading={loading}
        empty={filtradas.length === 0 && !loading ? {
          title: 'Nenhuma técnica encontrada',
          description: busca ? 'Tente ajustar a busca.' : 'Clique em "Nova Técnica" para começar ou explore a biblioteca.',
        } : null}
      >
        {!loading && filtradas.length > 0 && (
          <DataTable columns={columns} rows={filtradas} rowKey="name"
            page={page} pageSize={pageSize} onPage={setPage} onPageSize={(s) => { setPageSize(s); setPage(1) }}
            onRowClick={(t) => { setEditando(t); setModalOpen(true) }}
          />
        )}
      </ListPage>

      <ExplorarBibliotecaModal
        isOpen={showBiblioteca}
        onClose={() => setShowBiblioteca(false)}
        titulo="Explorar Biblioteca de Técnicas"
        doctype="Tecnica Intensificadora"
        colunas={[
          { label: 'Técnica', render: (r) => <span className="text-white">{r.nome}</span> },
          { label: 'Descrição', headerClass: 'hidden sm:block', cellClass: 'hidden sm:block text-gray-400 text-xs', render: (r) => r.descricao ? <span className="line-clamp-1">{r.descricao}</span> : '—' },
        ]}
        onImportado={() => carregar()}
      />

      {modalOpen && (
        <ModalTecnica
          tecnica={editando}
          onSave={handleSave}
          onClose={() => { setModalOpen(false); setEditando(null) }}
        />
      )}

      {deletando && (
        <Modal isOpen onClose={() => setDeletando(null)} title="Excluir Técnica" size="sm"
          footer={<><Button variant="ghost" onClick={() => setDeletando(null)}>Cancelar</Button><Button variant="danger" onClick={handleDelete} loading={deleting}>Excluir</Button></>}
        >
          <div className="p-4">
            <p className="text-gray-300 text-sm">Tem certeza que deseja excluir <strong className="text-white">{deletando.nome}</strong>?</p>
            <p className="text-gray-500 text-xs mt-1">Esta ação não pode ser desfeita.</p>
          </div>
        </Modal>
      )}

      {errorModal.element}
      <VideoPreviewModal video={videoAberto} onClose={() => setVideoAberto(null)} />
    </>
  )
}

// ─── GerenciarTreino ──────────────────────────────────────────────────────────

export default function GerenciarTreino() {
  const [aba, setAba] = useState('exercicios')
  const errorModal = useErrorModal()
  const [exercicios, setExercicios] = useState([])
  const [grupos, setGrupos] = useState([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroGrupo, setFiltroGrupo] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState(null)
  const [deletando, setDeletando] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [showBiblioteca, setShowBiblioteca] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const debounceRef = useRef(null)
  const sel = useSelection()
  const [confirmLote, setConfirmLote] = useState(false)
  const [excluindoLote, setExcluindoLote] = useState(false)
  const [videoAberto, setVideoAberto] = useState(null)

  const carregar = async () => {
    setLoading(true)
    try {
      const [exs, grps] = await Promise.all([
        listarExercicios({ limit: 1000 }),
        listarGruposMusculares(),
      ])
      setExercicios(exs)
      setGrupos(grps)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { carregar() }, [])

  const handleImportarExcel = async (rows) => {
    const erros = []
    let sucesso = 0
    let ignoradas = 0
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const linhaNum = i + 2 // +2 = header (1) + base 1
      const nome = String(row.nome_do_exercicio || row.nome || '').trim()
      const grupoMuscular = String(row.grupo_muscular || row.grupo || '').trim()
      if (!nome) { ignoradas++; erros.push({ linha: linhaNum, mensagem: 'sem nome_do_exercicio' }); continue }
      if (!grupoMuscular) { ignoradas++; erros.push({ linha: linhaNum, mensagem: `"${nome}": sem grupo_muscular` }); continue }
      const videoRaw = String(row.video || '').trim()
      const { id: videoId, plataforma } = videoRaw ? extractVideoId(videoRaw) : { id: '', plataforma: null }
      try {
        await salvarTreinoExercicio(null, {
          nome_do_exercicio: nome,
          grupo_muscular: grupoMuscular,
          video: videoId || '',
          plataforma_do_vídeo: plataforma || row.plataforma_do_video || row.plataforma || '',
          enabled: 1,
        })
        sucesso++
      } catch (e) {
        erros.push({ linha: linhaNum, mensagem: `"${nome}": ${e.response?.data?.exception || e.message}` })
      }
    }
    await carregar()
    return { sucesso, ignoradas, erros }
  }

  const filtrados = useMemo(() => {
    const q = normalizar(busca)
    return exercicios.filter(e => {
      if (filtroGrupo && e.grupo_muscular !== filtroGrupo) return false
      if (q && !normalizar(e.nome_do_exercicio).includes(q)) return false
      return true
    })
  }, [exercicios, busca, filtroGrupo])

  useEffect(() => { setPage(1) }, [busca, filtroGrupo])

  const handleSave = (resultado) => {
    setExercicios(prev => {
      const idx = prev.findIndex(e => e.name === resultado?.name)
      if (idx >= 0) { const a = [...prev]; a[idx] = resultado; return a }
      return [resultado, ...prev]
    })
    setModalOpen(false)
    setEditando(null)
  }

  const handleDelete = async () => {
    if (!deletando) return
    setDeleting(true)
    try {
      await excluirTreinoExercicio(deletando.name)
      // Recarrega do servidor para confirmar que o delete foi efetivo
      const exs = await listarExercicios({ limit: 1000 })
      setExercicios(exs)
      setDeletando(null)
    } catch (e) {
      errorModal.show(e, 'Excluir exercício')
    } finally { setDeleting(false) }
  }

  const handleExcluirLote = async () => {
    const ids = [...sel.selected]
    if (!ids.length) return
    setExcluindoLote(true)
    try {
      const { fail, erros } = await excluirEmLote(excluirTreinoExercicio, ids)
      const exs = await listarExercicios({ limit: 1000 })
      setExercicios(exs)
      sel.clear()
      setConfirmLote(false)
      if (fail) errorModal.show(erros[0]?.erro || new Error(`${fail} item(ns) não puderam ser excluídos`), `Excluir exercícios (${fail} falhou/falharam)`)
    } catch (e) {
      errorModal.show(e, 'Excluir exercícios em lote')
    } finally { setExcluindoLote(false) }
  }

  const grupoOpts = useMemo(() => [
    { value: '', label: 'Todos os grupos' },
    ...grupos.map(g => ({ value: g, label: g })),
  ], [grupos])

  const intensidadeCount = (ex) => {
    try {
      const r = typeof ex.intensidade_json === 'string'
        ? JSON.parse(ex.intensidade_json)
        : (ex.intensidade_json || [])
      return r.length
    } catch { return 0 }
  }

  const columns = [
    {
      label: 'Nome',
      render: (ex) => (
        <div>
          <span className="text-white font-medium text-sm">{ex.nome_do_exercicio}</span>
          <span className="md:hidden text-gray-500 text-xs ml-2">{ex.grupo_muscular}</span>
        </div>
      ),
    },
    {
      label: 'Grupo Muscular',
      headerClass: 'hidden md:table-cell',
      cellClass: 'hidden md:table-cell',
      render: (ex) => ex.grupo_muscular
        ? <span className="text-gray-300 text-xs">{ex.grupo_muscular}</span>
        : <span className="text-gray-600 text-xs italic">—</span>,
    },
    {
      label: 'Intensidades',
      headerClass: 'hidden lg:table-cell',
      cellClass: 'hidden lg:table-cell',
      render: (ex) => {
        const n = intensidadeCount(ex)
        return n > 0
          ? <span className="text-xs font-mono text-emerald-400">{n} grupo{n !== 1 ? 's' : ''}</span>
          : <span className="text-gray-600 text-xs">—</span>
      },
    },
    {
      label: 'Status',
      headerClass: 'hidden lg:table-cell',
      cellClass: 'hidden lg:table-cell',
      render: (ex) => (
        <Badge variant={ex.enabled ? 'success' : 'default'} size="sm">
          {ex.enabled ? 'Ativo' : 'Inativo'}
        </Badge>
      ),
    },
    {
      label: 'Ações',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (ex) => (
        <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
          {ex.video && (
            <button
              onClick={() => setVideoAberto({ id: ex.video, platform: ex['plataforma_do_vídeo'] || 'YouTube', titulo: ex.nome_do_exercicio })}
              className="h-7 w-7 flex items-center justify-center text-gray-400 hover:text-white border border-[#323238] hover:border-gray-500 rounded-lg transition-colors"
              title="Visualizar vídeo"
            >
              <Play size={12} />
            </button>
          )}
          <button
            onClick={() => { setEditando(ex); setModalOpen(true) }}
            className="h-7 w-7 flex items-center justify-center text-blue-400 hover:text-white hover:bg-blue-600 border border-[#323238] hover:border-blue-600 rounded-lg transition-colors"
            title="Editar"
          >
            <Edit size={12} />
          </button>
          <button
            onClick={() => setDeletando(ex)}
            className="h-7 w-7 flex items-center justify-center text-[#850000] hover:text-white border border-[#850000]/30 hover:bg-[#850000] rounded-lg transition-colors"
            title="Excluir"
          >
            <Trash2 size={12} />
          </button>
        </div>
      ),
    },
  ]

  if (aba === 'tecnicas') {
    return (
      <div>
        <div className="px-6 pt-4 pb-0 border-b border-[#323238]">
          <Tabs
            tabs={[
              { id: 'exercicios', label: 'Exercícios', icon: <span className="text-base">🏋️</span> },
              { id: 'tecnicas', label: 'Técnicas Intensificadoras', icon: <Zap size={14} /> },
            ]}
            active={aba}
            onChange={setAba}
            variant="underline"
          />
        </div>
        <AbaTecnicas />
      </div>
    )
  }

  return (
    <>
      <div className="px-6 pt-4 pb-0 border-b border-[#323238]">
        <Tabs
          tabs={[
            { id: 'exercicios', label: 'Exercícios', icon: <span className="text-base">🏋️</span> },
            { id: 'tecnicas', label: 'Técnicas Intensificadoras', icon: <Zap size={14} /> },
          ]}
          active={aba}
          onChange={setAba}
          variant="underline"
        />
      </div>
      <ListPage
        title="Gerenciar Exercícios"
        subtitle={`${exercicios.length} exercício${exercicios.length !== 1 ? 's' : ''} cadastrado${exercicios.length !== 1 ? 's' : ''}`}
        actions={
          <>
            <BotaoTutoriais videos={TUTORIAIS_EXERCICIOS} />
            {sel.count > 0 && (
              <Button variant="danger" size="sm" icon={Trash2} loading={excluindoLote} onClick={() => setConfirmLote(true)}>
                Excluir {sel.count}
              </Button>
            )}
            <Button variant="secondary" size="sm" icon={RefreshCw} onClick={carregar} loading={loading} />
            <Button variant="secondary" size="sm" icon={BookOpen} onClick={() => setShowBiblioteca(true)}>
              Explorar Biblioteca
            </Button>
            <ImportExcelButton
              label="Importar Exercícios da planilha"
              titulo="Importar exercícios por planilha"
              colunas={[
                { key: 'nome_do_exercicio',   obrigatoria: true, descricao: 'nome completo do exercício', exemplo: 'Supino reto com barra' },
                { key: 'grupo_muscular',      obrigatoria: true, descricao: 'qual grupo (já cadastrado no sistema)', exemplo: 'Peito' },
                { key: 'video',               descricao: 'cole a URL inteira do vídeo (extraímos o ID sozinho)', exemplo: 'https://www.youtube.com/watch?v=abc123' },
                { key: 'plataforma_do_video', descricao: 'opcional — detectamos pela URL', exemplo: 'YouTube' },
              ]}
              onImportar={handleImportarExcel}
              helpText="A coluna video aceita a URL inteira (o sistema extrai o ID automaticamente)."
            />
            <Button variant="primary" size="sm" icon={Plus} onClick={() => { setEditando(null); setModalOpen(true) }}>
              Novo Exercício
            </Button>
          </>
        }
        filters={[
          {
            type: 'search',
            value: busca,
            onChange: (v) => { setBusca(v); setPage(1) },
            placeholder: 'Buscar exercício...',
          },
          {
            type: 'select',
            value: filtroGrupo,
            onChange: (v) => { setFiltroGrupo(v); setPage(1) },
            options: grupoOpts,
            placeholder: 'Grupo muscular',
          },
        ]}
        loading={loading}
        empty={
          filtrados.length === 0 && !loading
            ? {
                title: 'Nenhum exercício encontrado',
                description: busca || filtroGrupo
                  ? 'Tente ajustar os filtros.'
                  : 'Clique em "Novo Exercício" para começar.',
              }
            : null
        }
      >
        {!loading && filtrados.length > 0 && (
          <DataTable
            columns={columns}
            rows={filtrados}
            rowKey="name"
            page={page}
            pageSize={pageSize}
            onPage={setPage}
            onPageSize={(s) => { setPageSize(s); setPage(1) }}
            selectable
            selected={sel.selected}
            onToggle={sel.toggle}
            onTogglePage={sel.togglePage}
            onRowClick={(ex) => { setEditando(ex); setModalOpen(true) }}
          />
        )}
      </ListPage>

      <ExplorarBibliotecaModal
        isOpen={showBiblioteca}
        onClose={() => setShowBiblioteca(false)}
        titulo="Explorar Biblioteca de Exercícios"
        doctype="Treino Exercicio"
        colunas={[
          { label: 'Exercício', render: (r) => <span className="text-white">{r.nome_do_exercicio}</span> },
          { label: 'Grupo', headerClass: 'hidden sm:block', cellClass: 'hidden sm:block text-gray-400 text-xs', render: (r) => r.grupo_muscular || '—' },
        ]}
        onImportado={() => carregar()}
      />

      {modalOpen && (
        <ModalExercicio
          exercicio={editando}
          grupos={grupos}
          exercicios={exercicios}
          onSave={handleSave}
          onClose={() => { setModalOpen(false); setEditando(null) }}
          onVerVideo={setVideoAberto}
        />
      )}

      {deletando && (
        <Modal
          isOpen
          onClose={() => setDeletando(null)}
          title="Excluir Exercício"
          size="sm"
          footer={
            <>
              <Button variant="ghost" onClick={() => setDeletando(null)}>Cancelar</Button>
              <Button variant="danger" onClick={handleDelete} loading={deleting}>Excluir</Button>
            </>
          }
        >
          <div className="p-4">
            <p className="text-gray-300 text-sm">
              Tem certeza que deseja excluir <strong className="text-white">{deletando.nome_do_exercicio}</strong>?
            </p>
            <p className="text-gray-500 text-xs mt-1">Esta ação não pode ser desfeita.</p>
          </div>
        </Modal>
      )}
      {confirmLote && (
        <Modal
          isOpen
          onClose={() => setConfirmLote(false)}
          title="Excluir selecionados"
          size="sm"
          footer={
            <>
              <Button variant="ghost" onClick={() => setConfirmLote(false)}>Cancelar</Button>
              <Button variant="danger" onClick={handleExcluirLote} loading={excluindoLote}>Excluir {sel.count}</Button>
            </>
          }
        >
          <div className="p-4">
            <p className="text-gray-300 text-sm">
              Tem certeza que deseja excluir <strong className="text-white">{sel.count}</strong> exercício{sel.count !== 1 ? 's' : ''}?
            </p>
            <p className="text-gray-500 text-xs mt-1">Esta ação não pode ser desfeita.</p>
          </div>
        </Modal>
      )}
      {errorModal.element}
      <VideoPreviewModal video={videoAberto} onClose={() => setVideoAberto(null)} />
    </>
  )
}
