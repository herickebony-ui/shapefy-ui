import { useState, useEffect, useMemo } from 'react'
import { Plus, Edit, Trash2, RefreshCw, BookOpen, ExternalLink } from 'lucide-react'
import {
  listarAerobicos, salvarAerobico, excluirAerobico, toggleAerobico,
} from '../../api/fichas'
import {
  Button, FormGroup, Input, Select, Modal, DataTable, Badge,
  ImportExcelButton, BotaoTutoriais,
} from '../../components/ui'
import { TUTORIAIS_EXERCICIOS } from '../../data/tutoriais'
import ListPage from '../../components/templates/ListPage'
import ExplorarBibliotecaModal from '../../components/ExplorarBibliotecaModal'
import { extractVideoId } from '../../utils/video'
import useErrorModal from '../../hooks/useErrorModal'
import useSelection from '../../hooks/useSelection'
import { excluirEmLote } from '../../utils/bulk'

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

// ─── ModalAerobico ────────────────────────────────────────────────────────────

const ModalAerobico = ({ aerobico, onSave, onClose }) => {
  const isEdit = !!aerobico?.name
  const [saving, setSaving] = useState(false)
  const errorModal = useErrorModal()
  const [nome, setNome] = useState(aerobico?.exercicio_aerobico || '')
  const [video, setVideo] = useState(aerobico?.video || '')
  const [plataforma, setPlataforma] = useState(aerobico?.['plataforma_do_vídeo'] || 'YouTube')
  const [enabled, setEnabled] = useState(aerobico?.enabled ?? 1)
  const [videoDetected, setVideoDetected] = useState(false)

  const handleVideoChange = (v) => {
    const info = extractVideoInfo(v)
    if (info) { setVideo(info.id); setPlataforma(info.platform); setVideoDetected(true) }
    else { setVideo(v); setVideoDetected(false) }
  }

  const handleSave = async () => {
    if (!nome.trim()) {
      errorModal.show({
        type: 'mandatory',
        title: 'Campo obrigatório',
        messages: ['Nome do exercício é obrigatório.'],
        statusCode: 0,
      }, isEdit ? 'Salvar aeróbico' : 'Criar aeróbico')
      return
    }
    setSaving(true)
    try {
      const payload = {
        exercicio_aerobico: nome.trim(),
        video,
        'plataforma_do_vídeo': plataforma,
        enabled,
      }
      const resultado = await salvarAerobico(isEdit ? aerobico.name : null, payload)
      onSave(resultado)
    } catch (e) {
      errorModal.show(e, isEdit ? 'Salvar aeróbico' : 'Criar aeróbico')
    } finally { setSaving(false) }
  }

  return (<>
    {errorModal.element}
    <Modal
      isOpen
      onClose={onClose}
      title={isEdit ? 'Editar Aeróbico' : 'Novo Aeróbico'}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={handleSave} loading={saving}>Salvar</Button>
        </>
      }
    >
      <div className="p-4 space-y-4">
        <FormGroup label="Nome do Exercício Aeróbico" required>
          <Input value={nome} onChange={setNome} placeholder="Ex: Esteira, Bike, Polichinelo..." />
        </FormGroup>

        <div className="grid grid-cols-2 gap-4">
          <FormGroup
            label="Link ou ID do Vídeo"
            hint={videoDetected ? '✓ ID extraído automaticamente' : 'Cole o link ou o código do vídeo'}
          >
            <div className="flex gap-2">
              <div className="flex-1">
                <Input value={video} onChange={handleVideoChange} placeholder="https://youtu.be/... ou código" />
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
      </div>
    </Modal>
  </>)
}

// ─── GerenciarAerobicos ───────────────────────────────────────────────────────

export default function GerenciarAerobicos() {
  const errorModal = useErrorModal()
  const [showBiblioteca, setShowBiblioteca] = useState(false)
  const [aerobicos, setAerobicos] = useState([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState(null)
  const [deletando, setDeletando] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const sel = useSelection()
  const [confirmLote, setConfirmLote] = useState(false)
  const [excluindoLote, setExcluindoLote] = useState(false)

  const carregar = async () => {
    setLoading(true)
    try {
      const data = await listarAerobicos({ limit: 1000, gerenciar: true })
      setAerobicos(data)
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
      const linhaNum = i + 2
      const nome = String(row.exercicio_aerobico || row.nome || row.exercicio || '').trim()
      if (!nome) { ignoradas++; erros.push({ linha: linhaNum, mensagem: 'sem exercicio_aerobico' }); continue }
      const videoRaw = String(row.video || '').trim()
      const { id: videoId, plataforma } = videoRaw ? extractVideoId(videoRaw) : { id: '', plataforma: null }
      try {
        await salvarAerobico(null, {
          exercicio_aerobico: nome,
          video: videoId || '',
          'plataforma_do_vídeo': plataforma || row.plataforma_do_video || row.plataforma || '',
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
    const q = busca.toLowerCase().trim()
    if (!q) return aerobicos
    return aerobicos.filter(a =>
      (a.exercicio_aerobico || '').toLowerCase().includes(q)
    )
  }, [aerobicos, busca])

  useEffect(() => { setPage(1) }, [busca])

  const handleSave = (resultado) => {
    setAerobicos(prev => {
      const idx = prev.findIndex(a => a.name === resultado?.name)
      if (idx >= 0) { const arr = [...prev]; arr[idx] = resultado; return arr }
      return [resultado, ...prev]
    })
    setModalOpen(false)
    setEditando(null)
  }

  const handleToggle = async (row) => {
    const novo = row.enabled ? 0 : 1
    setAerobicos(prev => prev.map(a => a.name === row.name ? { ...a, enabled: novo } : a))
    try {
      await toggleAerobico(row.name, novo)
    } catch (e) {
      console.error(e)
      setAerobicos(prev => prev.map(a => a.name === row.name ? { ...a, enabled: row.enabled } : a))
    }
  }

  const handleDelete = async () => {
    if (!deletando) return
    setDeleting(true)
    try {
      await excluirAerobico(deletando.name)
      const data = await listarAerobicos({ limit: 1000, gerenciar: true })
      setAerobicos(data)
      setDeletando(null)
    } catch (e) {
      errorModal.show(e, 'Excluir aeróbico')
    } finally { setDeleting(false) }
  }

  const handleExcluirLote = async () => {
    const ids = [...sel.selected]
    if (!ids.length) return
    setExcluindoLote(true)
    try {
      const { fail, erros } = await excluirEmLote(excluirAerobico, ids)
      const data = await listarAerobicos({ limit: 1000, gerenciar: true })
      setAerobicos(data)
      sel.clear()
      setConfirmLote(false)
      if (fail) errorModal.show(erros[0]?.erro || new Error(`${fail} item(ns) não puderam ser excluídos`), `Excluir aeróbicos (${fail} falhou/falharam)`)
    } catch (e) {
      errorModal.show(e, 'Excluir aeróbicos em lote')
    } finally { setExcluindoLote(false) }
  }

  const columns = [
    {
      label: 'Nome',
      render: (row) => (
        <span className="text-white font-medium text-sm">{row.exercicio_aerobico || row.name}</span>
      ),
    },
    {
      label: 'Vídeo',
      headerClass: 'hidden md:table-cell',
      cellClass: 'hidden md:table-cell',
      render: (row) => row.video
        ? <span className="text-gray-400 text-xs font-mono truncate max-w-[160px] block">{row['plataforma_do_vídeo'] || 'YouTube'} · {row.video}</span>
        : <span className="text-gray-600 text-xs">—</span>,
    },
    {
      label: 'Status',
      headerClass: 'hidden lg:table-cell',
      cellClass: 'hidden lg:table-cell',
      render: (row) => (
        <Badge variant={row.enabled ? 'success' : 'default'} size="sm">
          {row.enabled ? 'Ativo' : 'Inativo'}
        </Badge>
      ),
    },
    {
      label: 'Ações',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => handleToggle(row)}
            title={row.enabled ? 'Desativar' : 'Ativar'}
            className={`h-7 w-7 flex items-center justify-center border rounded-lg transition-colors
              ${row.enabled
                ? 'text-green-400 border-green-500/30 hover:bg-green-700 hover:border-green-700 hover:text-white'
                : 'text-gray-500 border-[#323238] hover:border-gray-500 hover:text-white'
              }`}
          >
            {row.enabled ? '●' : '○'}
          </button>
          <button
            onClick={() => { setEditando(row); setModalOpen(true) }}
            className="h-7 w-7 flex items-center justify-center text-blue-400 hover:text-white hover:bg-blue-600 border border-[#323238] hover:border-blue-600 rounded-lg transition-colors"
            title="Editar"
          >
            <Edit size={12} />
          </button>
          <button
            onClick={() => setDeletando(row)}
            className="h-7 w-7 flex items-center justify-center text-[#850000] hover:text-white border border-[#850000]/30 hover:bg-[#850000] rounded-lg transition-colors"
            title="Excluir"
          >
            <Trash2 size={12} />
          </button>
        </div>
      ),
    },
  ]

  return (
    <>
      <ListPage
        title="Gerenciar Aeróbicos"
        subtitle={`${aerobicos.length} exercício${aerobicos.length !== 1 ? 's' : ''} cadastrado${aerobicos.length !== 1 ? 's' : ''}`}
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
              label="Importar Aeróbicos da planilha"
              titulo="Importar aeróbicos por planilha"
              colunas={[
                { key: 'exercicio_aerobico',  obrigatoria: true, descricao: 'nome completo do aeróbico', exemplo: 'Caminhada na esteira' },
                { key: 'video',               descricao: 'cole a URL inteira do vídeo (extraímos o ID sozinho)', exemplo: 'https://www.youtube.com/watch?v=abc123' },
                { key: 'plataforma_do_video', descricao: 'opcional — detectamos pela URL', exemplo: 'YouTube' },
              ]}
              onImportar={handleImportarExcel}
              helpText="A coluna video aceita a URL inteira (o sistema extrai o ID automaticamente)."
            />
            <Button variant="primary" size="sm" icon={Plus} onClick={() => { setEditando(null); setModalOpen(true) }}>
              Novo Aeróbico
            </Button>
          </>
        }
        filters={[
          {
            type: 'search',
            value: busca,
            onChange: (v) => { setBusca(v); setPage(1) },
            placeholder: 'Buscar exercício aeróbico...',
          },
        ]}
        loading={loading}
        empty={
          filtrados.length === 0 && !loading
            ? {
                title: 'Nenhum aeróbico encontrado',
                description: busca ? 'Tente ajustar a busca.' : 'Clique em "Novo Aeróbico" para começar.',
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
          />
        )}
      </ListPage>

      {modalOpen && (
        <ModalAerobico
          aerobico={editando}
          onSave={handleSave}
          onClose={() => { setModalOpen(false); setEditando(null) }}
        />
      )}

      <ExplorarBibliotecaModal
        isOpen={showBiblioteca}
        onClose={() => setShowBiblioteca(false)}
        titulo="Explorar Biblioteca de Aeróbicos"
        doctype="Exercicio Aerobico"
        colunas={[
          { label: 'Exercício', render: (r) => <span className="text-white">{r.exercicio_aerobico}</span> },
        ]}
        onImportado={() => carregar()}
      />

      {deletando && (
        <Modal
          isOpen
          onClose={() => setDeletando(null)}
          title="Excluir Aeróbico"
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
              Tem certeza que deseja excluir <strong className="text-white">{deletando.exercicio_aerobico}</strong>?
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
              Tem certeza que deseja excluir <strong className="text-white">{sel.count}</strong> aeróbico{sel.count !== 1 ? 's' : ''}?
            </p>
            <p className="text-gray-500 text-xs mt-1">Esta ação não pode ser desfeita.</p>
          </div>
        </Modal>
      )}
      {errorModal.element}
    </>
  )
}
