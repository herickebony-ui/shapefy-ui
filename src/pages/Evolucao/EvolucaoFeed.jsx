import { useState, useEffect, useMemo } from 'react'
import { Activity, Search, Columns, X, ArrowLeft, CheckCircle, Plus } from 'lucide-react'
import { Button, Badge, Spinner, EmptyState, DataTable } from '../../components/ui'
import ListPage from '../../components/templates/ListPage'
import ImagemInterativa from '../Feedbacks/ImagemInterativa'
import RegistrarEvolucaoModal from '../../components/evolucao/RegistrarEvolucaoModal'
import { listarRegistros, buscarRegistro } from '../../api/evolucao'
import { listarAlunosByIds, listarAlunos } from '../../api/alunos'
import { GraficoPeso } from './EvolucaoAluno'
import useErrorModal from '../../hooks/useErrorModal'

// Evolução do Aluno — fonte única (peso + fotos juntos). Mesmo padrão de design
// da tela de Feedbacks Recebidos (ListPage + DataTable + modo comparar). Cada
// linha é um Registro (um ponto no tempo). A comparação mostra peso E fotos.
// Usado global (sidebar) e embutido na aba do aluno (alunoId + embedded).
const FRAPPE_URL = import.meta.env.VITE_FRAPPE_URL || ''

const ORIGEM_BADGE = {
  avaliacao: { label: 'Avaliação', variant: 'purple' },
  feedback:  { label: 'Feedback', variant: 'info' },
  anamnese:  { label: 'Anamnese', variant: 'warning' },
  manual:    { label: 'Manual', variant: 'default' },
}
const fmtData = (d) => {
  if (!d) return '—'
  const [y, m, day] = String(d).split(' ')[0].split('-')
  return `${day}/${m}/${y}`
}
const numBR = (n) => (n == null ? '—' : Number(n).toFixed(1).replace('.', ','))
const PAGE_SIZE = 30
const FEED_LIMIT = 1000 // teto de registros carregados pro feed (paginação é client-side)

// Comparação de Registros — mesmo visual da comparação de feedbacks: tabela
// datas × (peso + slots), fotos via ImagemInterativa, com gráfico de peso no topo.
function RegistroComparacao({ registros, pontosPeso = [], nome, onVoltar }) {
  const [verTodosPesos, setVerTodosPesos] = useState(registros.length < 2)
  const slotMap = new Map()
  registros.forEach(r => (r.fotos || []).forEach(f => {
    if (f.slot_id) slotMap.set(f.slot_id, { slot_id: f.slot_id, rotulo: f.rotulo || '—', ordem: f.ordem ?? 999 })
  }))
  const slots = [...slotMap.values()].sort((a, b) => (a.ordem || 0) - (b.ordem || 0))
  const temPeso = registros.some(r => r.peso != null)
  const pontosSelecionados = registros.filter(r => r.peso != null).map(r => ({ data: r.data, peso: r.peso }))
  const pontosGrafico = verTodosPesos ? pontosPeso : pontosSelecionados
  const temTodos = pontosPeso.length > pontosSelecionados.length
  const urlSlot = (r, sid) => (r.fotos || []).find(x => x.slot_id === sid)?.url || null

  return (
    <div className="w-full h-full flex flex-col bg-[#0a0a0a] text-white animate-in fade-in duration-300">
      <div className="shrink-0 bg-[#0a0a0a]/95 backdrop-blur-md z-20 border-b border-[#323238] px-6 py-3 flex items-center justify-between">
        <button onClick={onVoltar} className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-wide">
          <ArrowLeft size={16} /> Voltar
        </button>
        <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">{nome} · {registros.length} registros</span>
      </div>
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="max-w-7xl mx-auto space-y-4">
          {pontosPeso.length >= 2 && (
            <div className="bg-[#1a1a1a] rounded-lg border border-[#323238] p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  Peso ao longo do tempo{verTodosPesos ? ' · todos os registros' : ' · selecionados'}
                </h3>
                {temTodos && (
                  <Button variant="ghost" size="xs" onClick={() => setVerTodosPesos(v => !v)}>
                    {verTodosPesos ? 'Só selecionados' : 'Comparar todos os pesos'}
                  </Button>
                )}
              </div>
              <GraficoPeso pontos={pontosGrafico} />
            </div>
          )}
          <div className="bg-[#1a1a1a] rounded-lg border border-[#323238] overflow-x-auto">
            <table className="w-full text-left border-collapse table-fixed">
              <thead>
                <tr className="bg-[#0a0a0a] border-b border-[#323238]">
                  <th className="p-2 md:p-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider sticky left-0 bg-[#0a0a0a] z-10 min-w-[120px] md:w-40">Data</th>
                  {registros.map((r, i) => (
                    <th key={i} className="p-2 md:p-3 text-[10px] font-bold text-white uppercase tracking-wider text-center min-w-[140px] md:min-w-[200px]">{fmtData(r.data)}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#323238]/40">
                {temPeso && (
                  <tr className="hover:bg-white/5">
                    <td className="p-2 md:p-3 sticky left-0 bg-[#1a1a1a] z-10"><span className="text-white text-xs font-bold">Peso</span></td>
                    {registros.map((r, i) => (
                      <td key={i} className="p-2 md:p-3 text-center">
                        {r.peso != null ? <span className="text-white text-sm font-bold">{numBR(r.peso)} <span className="text-gray-500 text-xs">kg</span></span> : <span className="text-gray-600 text-xs">—</span>}
                      </td>
                    ))}
                  </tr>
                )}
                {slots.map(slot => (
                  <tr key={slot.slot_id} className="hover:bg-white/5">
                    <td className="p-2 md:p-3 sticky left-0 bg-[#1a1a1a] z-10"><span className="text-[#93C5FD] text-[10px] font-bold uppercase tracking-wider">{slot.rotulo}</span></td>
                    {registros.map((r, i) => {
                      const url = urlSlot(r, slot.slot_id)
                      return (
                        <td key={i} className="p-0 text-center align-top">
                          {url ? (
                            <ImagemInterativa src={`${FRAPPE_URL}${encodeURI(url)}`} feedbackId={r.name} idx={`reg_${slot.slot_id}`} />
                          ) : (
                            <span className="text-gray-600 text-xs">—</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function EvolucaoFeed({ alunoId = null, alunoNome = '', embedded = false }) {
  const [registros, setRegistros] = useState([])
  const [nomes, setNomes] = useState({})
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroOrigem, setFiltroOrigem] = useState('')
  const [modoComparar, setModoComparar] = useState(false)
  const [selecionados, setSelecionados] = useState([])
  const [comparando, setComparando] = useState(null)
  const [pontosTodos, setPontosTodos] = useState([])
  const [loadingCmp, setLoadingCmp] = useState(false)
  const [page, setPage] = useState(1)
  const [showRegistrar, setShowRegistrar] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [buscaDebounced, setBuscaDebounced] = useState('')
  const errorModal = useErrorModal()

  // Debounce da busca: a busca dispara reload server-side (não filtra só o que
  // já estava carregado — senão o teto do feed esconde registros antigos do aluno).
  useEffect(() => {
    const t = setTimeout(() => setBuscaDebounced(busca.trim()), 400)
    return () => clearTimeout(t)
  }, [busca])

  useEffect(() => {
    let cancelado = false
    setLoading(true)
    const carregar = async () => {
      try {
        let regs
        if (alunoId) {
          // Embutido na aba do aluno: todos os registros desse aluno.
          regs = await listarRegistros({ aluno: alunoId, limit: FEED_LIMIT })
        } else if (buscaDebounced) {
          // Busca global por nome: resolve os alunos no servidor e traz TODOS os
          // registros deles — sem depender da janela de recentes do feed.
          const { list: al } = await listarAlunos({ search: buscaDebounced, limit: 50 })
          const ids = al.map(a => a.name)
          if (!ids.length) {
            regs = []
          } else {
            regs = await listarRegistros({ alunos: ids, limit: FEED_LIMIT })
            if (!cancelado) { const m = {}; al.forEach(a => { m[a.name] = a.nome_completo }); setNomes(prev => ({ ...prev, ...m })) }
          }
        } else {
          // Feed global sem busca: registros mais recentes de todos os alunos.
          regs = await listarRegistros({ limit: FEED_LIMIT })
        }
        if (cancelado) return
        setRegistros(regs)
        if (!alunoId && !buscaDebounced) {
          const ids = [...new Set(regs.map(r => r.aluno).filter(Boolean))]
          if (ids.length) {
            const al = await listarAlunosByIds(ids).catch(() => [])
            if (!cancelado) { const m = {}; al.forEach(a => { m[a.name] = a.nome_completo }); setNomes(m) }
          }
        }
      } catch (e) {
        if (!cancelado) errorModal.show(e, 'Carregar evolução')
      } finally {
        if (!cancelado) setLoading(false)
      }
    }
    carregar()
    return () => { cancelado = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alunoId, refreshKey, buscaDebounced])

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase()
    return registros.filter(r =>
      (!q || (nomes[r.aluno] || '').toLowerCase().includes(q)) &&
      (!filtroOrigem || r.origem === filtroOrigem)
    )
  }, [registros, nomes, busca, filtroOrigem])

  // Reseta pra primeira página sempre que o conjunto filtrado muda.
  useEffect(() => { setPage(1) }, [busca, filtroOrigem, alunoId])

  // Só compara registros do MESMO aluno.
  const alunoSel = selecionados.length ? selecionados[0].aluno : null
  const toggleSelecionado = (row) => {
    setSelecionados(prev => {
      if (prev.find(x => x.name === row.name)) return prev.filter(x => x.name !== row.name)
      if (prev.length >= 3) return prev
      if (prev.length && row.aluno !== alunoSel) return prev
      return [...prev, row]
    })
    setModoComparar(true)
  }

  // Compara os 3 registros mais recentes do aluno (registros já vêm em data desc).
  const compararUltimos3 = (row) => {
    const doAluno = registros.filter(r => r.aluno === row.aluno)
    if (doAluno.length < 2) return
    iniciarComparacao(doAluno.slice(0, 3))
  }

  const iniciarComparacao = async (lista) => {
    if (lista.length < 2) return
    setLoadingCmp(true)
    try {
      const docs = await Promise.all(lista.map(r => buscarRegistro(r.name)))
      docs.sort((a, b) => (a.data || '').localeCompare(b.data || ''))
      setComparando(docs)
    } catch (e) {
      errorModal.show(e, 'Comparar')
    } finally {
      setLoadingCmp(false)
    }
  }

  // Ao comparar/visualizar, busca a série COMPLETA de pesos do aluno (não só os do
  // feed misto, que vem capado por limit) — assim "comparar todos" mostra a curva toda.
  useEffect(() => {
    if (!comparando) { setPontosTodos([]); return }
    const aluno = comparando[0]?.aluno
    if (!aluno) return
    let cancel = false
    listarRegistros({ aluno, limit: 500 })
      .then(regs => {
        if (cancel) return
        const pts = regs
          .filter(r => r.peso != null)
          .map(r => ({ data: r.data, peso: r.peso }))
          .sort((a, b) => (a.data || '').localeCompare(b.data || ''))
        setPontosTodos(pts)
      })
      .catch(() => {})
    return () => { cancel = true }
  }, [comparando])

  // Clique na linha: visualiza um único registro (fotos + peso, com gráfico completo).
  const viewRegistro = async (row) => {
    setLoadingCmp(true)
    try {
      const doc = await buscarRegistro(row.name)
      setComparando([doc])
    } catch (e) {
      errorModal.show(e, 'Visualizar')
    } finally {
      setLoadingCmp(false)
    }
  }

  if (comparando) {
    const nome = nomes[comparando[0]?.aluno] || comparando[0]?.aluno || ''
    const alunoCmp = comparando[0]?.aluno
    const pontosLocais = registros
      .filter(r => r.aluno === alunoCmp && r.peso != null)
      .map(r => ({ data: r.data, peso: r.peso }))
      .sort((a, b) => (a.data || '').localeCompare(b.data || ''))
    const pontosPeso = pontosTodos.length ? pontosTodos : pontosLocais
    return (
      <RegistroComparacao
        registros={comparando}
        pontosPeso={pontosPeso}
        nome={nome}
        onVoltar={() => { setComparando(null); setSelecionados([]); setModoComparar(false) }}
      />
    )
  }

  const columns = [
    {
      label: 'Ações', headerClass: 'w-20 text-center', cellClass: 'text-center',
      render: (row) => (
        <div className="flex items-center justify-center gap-1.5" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => compararUltimos3(row)}
            title="Comparar 3 últimos deste aluno"
            className="h-7 w-7 flex items-center justify-center text-gray-400 hover:text-white border border-[#323238] hover:border-gray-500 rounded-lg transition-colors relative group"
          >
            <Columns size={12} />
            <span className="absolute -top-1.5 -right-1.5 bg-[#2563eb] text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">3</span>
          </button>
          <button
            onClick={() => toggleSelecionado(row)}
            title="Selecionar para comparar"
            className={`h-7 w-7 flex items-center justify-center border rounded-lg transition-colors ${
              selecionados.find(x => x.name === row.name)
                ? 'text-[#2563eb] border-[#2563eb]/40 bg-[#2563eb]/10'
                : 'text-gray-500 border-[#323238] hover:border-gray-500 hover:text-white'
            }`}
          >
            <CheckCircle size={12} />
          </button>
        </div>
      ),
    },
    ...(!alunoId ? [{
      label: 'Aluno',
      render: (row) => <span className="text-white text-sm font-medium">{nomes[row.aluno] || row.aluno}</span>,
    }] : []),
    {
      label: 'Origem',
      render: (row) => { const b = ORIGEM_BADGE[row.origem] || ORIGEM_BADGE.manual; return <Badge variant={b.variant} size="sm">{b.label}</Badge> },
    },
    {
      label: 'Data',
      render: (row) => <span className="text-gray-400 text-xs">{fmtData(row.data)}</span>,
    },
    {
      label: 'Peso', headerClass: 'text-center', cellClass: 'text-center',
      render: (row) => row.peso != null ? <span className="text-white text-sm font-semibold">{numBR(row.peso)} kg</span> : <span className="text-gray-600 text-xs">—</span>,
    },
  ]

  const toolbar = !modoComparar ? (
    <div className="flex items-center gap-2">
      <Button variant="primary" size="sm" icon={Plus} onClick={() => setShowRegistrar(true)}>Registrar evolução</Button>
      <Button variant="secondary" size="sm" icon={Columns} onClick={() => setModoComparar(true)}>Comparar</Button>
    </div>
  ) : (
    <div className="flex items-center gap-2">
      <span className="text-xs text-blue-300 font-bold">{selecionados.length} selecionado(s)</span>
      <Button variant="info" size="sm" icon={Columns} loading={loadingCmp} onClick={() => iniciarComparacao(selecionados)} disabled={selecionados.length < 2}>
        Comparar ({selecionados.length})
      </Button>
      <Button variant="danger" size="sm" onClick={() => { setModoComparar(false); setSelecionados([]) }}><X size={14} /></Button>
    </div>
  )

  const tabela = loading ? (
    <div className="flex justify-center py-16"><Spinner /></div>
  ) : filtrados.length === 0 ? (
    <EmptyState icon={Activity} title="Sem registros de evolução" description="Os registros aparecem quando o aluno responde feedback/anamnese (com fotos/peso) ou você cria uma avaliação." />
  ) : (
    <DataTable
      columns={columns}
      rows={filtrados}
      rowKey="name"
      onRowClick={viewRegistro}
      page={page}
      pageSize={busca ? (filtrados.length || 1) : PAGE_SIZE}
      onPage={busca ? undefined : setPage}
    />
  )

  const registrarModal = showRegistrar && (
    <RegistrarEvolucaoModal
      alunoId={alunoId}
      alunoNome={alunoNome}
      onClose={() => setShowRegistrar(false)}
      onCriado={() => setRefreshKey(k => k + 1)}
    />
  )

  // Embutido na aba do aluno: sem o chrome do ListPage.
  if (embedded) {
    return (
      <div className="space-y-3">
        {errorModal.element}
        {registrarModal}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="text-gray-500 text-xs">Selecione 2–3 registros pra comparar peso e fotos.</p>
          {toolbar}
        </div>
        {tabela}
      </div>
    )
  }

  return (
    <>
      {errorModal.element}
      {registrarModal}
      <ListPage
        title="Evolução do Aluno"
        subtitle={`Peso e fotos dos seus alunos · ${filtrados.length} registro(s)`}
        actions={toolbar}
        filters={[
          { type: 'search', value: busca, onChange: setBusca, placeholder: 'Buscar aluno...', icon: Search },
          { type: 'select', value: filtroOrigem, onChange: setFiltroOrigem, options: [
            { value: '', label: 'Todas as origens' },
            { value: 'avaliacao', label: 'Avaliação' },
            { value: 'feedback', label: 'Feedback' },
            { value: 'anamnese', label: 'Anamnese' },
            { value: 'manual', label: 'Manual' },
          ] },
        ]}
        loading={loading}
        empty={filtrados.length === 0 && !loading ? { title: 'Sem registros de evolução', description: 'Aparecem quando há feedback/anamnese/avaliação do aluno.' } : null}
      >
        {tabela}
      </ListPage>
    </>
  )
}
