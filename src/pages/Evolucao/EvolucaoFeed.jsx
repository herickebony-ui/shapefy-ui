import { useState, useEffect, useMemo } from 'react'
import { Activity, Search, Columns, X, ArrowLeft, CheckCircle, Plus, Image as ImageIcon, LineChart as LineChartIcon, ChevronLeft, ChevronRight, Pencil, Check, Trash2 } from 'lucide-react'
import { Button, Badge, Spinner, EmptyState, DataTable } from '../../components/ui'
import ListPage from '../../components/templates/ListPage'
import ImagemInterativa from '../Feedbacks/ImagemInterativa'
import RegistrarEvolucaoModal from '../../components/evolucao/RegistrarEvolucaoModal'
import { listarRegistros, listarRegistrosFeed, buscarRegistro, salvarRegistro, excluirRegistro } from '../../api/evolucao'
import { listarAlunosByIds, listarAlunos } from '../../api/alunos'
import { listarConjuntos } from '../../api/conjuntos'
import { GraficoPeso } from './EvolucaoAluno'
import useErrorModal from '../../hooks/useErrorModal'

// Evolução do Aluno — fonte única (peso + fotos juntos). Mesmo padrão de design
// da tela de Feedbacks Recebidos (ListPage + DataTable + modo comparar). Cada
// linha é um Registro (um ponto no tempo). A comparação mostra peso E fotos.
// Usado global (sidebar) e embutido na aba do aluno (alunoId + embedded).
const FRAPPE_URL = import.meta.env.VITE_FRAPPE_URL || ''

const ORIGEM_BADGE = {
  avaliacao: { label: 'Avaliação Corporal', variant: 'purple' },
  feedback:  { label: 'Feedback', variant: 'info' },
  anamnese:  { label: 'Anamnese', variant: 'warning' },
  manual:    { label: 'Manual', variant: 'default' },
}
const fmtData = (d) => {
  if (!d) return '—'
  const [y, m, day] = String(d).split(' ')[0].split('-')
  return `${day}/${m}/${(y || '').slice(2)}`
}
const numBR = (n) => (n == null ? '—' : Number(n).toFixed(1).replace('.', ','))
const PAGE_SIZE = 30
const FEED_LIMIT = 1000 // teto de registros carregados pro feed (paginação é client-side)

// Comparação de Registros — mesmo visual da comparação de feedbacks: tabela
// datas × (peso + slots), fotos via ImagemInterativa, com gráfico de peso no topo.
function RegistroComparacao({ registros, todosRegistros, pontosPeso = [], nome, onVoltar, onPesoSalvo }) {
  const listaEdicao = (todosRegistros && todosRegistros.length) ? todosRegistros : registros
  const [verTodosPesos, setVerTodosPesos] = useState(registros.length < 2)
  const [mostrarEdicao, setMostrarEdicao] = useState(false)
  const [editId, setEditId] = useState(null)
  const [pesoInput, setPesoInput] = useState('')
  const [dataInput, setDataInput] = useState('')
  const [salvando, setSalvando] = useState(false)
  // Rótulo/ordem de cada slot (os tópicos da coluna esquerda) prevalece do registro
  // MAIS RECENTE — itera do mais novo pro mais antigo e não sobrescreve.
  const slotMap = new Map()
  ;[...registros].sort((a, b) => (b.data || '').localeCompare(a.data || '')).forEach(r => (r.fotos || []).forEach(f => {
    if (f.slot_id && !slotMap.has(f.slot_id)) slotMap.set(f.slot_id, { slot_id: f.slot_id, rotulo: f.rotulo || '—', ordem: f.ordem ?? 999 })
  }))
  const slots = [...slotMap.values()].sort((a, b) => (a.ordem || 0) - (b.ordem || 0))
  const temPeso = true // sempre mostra a linha de Peso (pra poder editar/adicionar)
  const pontosSelecionados = registros.filter(r => r.peso != null && r.peso > 0).map(r => ({ data: r.data, peso: r.peso }))
  const pontosGrafico = verTodosPesos ? pontosPeso : pontosSelecionados
  const temTodos = pontosPeso.length > pontosSelecionados.length
  const urlSlot = (r, sid) => (r.fotos || []).find(x => x.slot_id === sid)?.url || null

  // Edita peso (peso_revisado=1) e/ou a data (campo `data`, manual). O display
  // sempre usa `data`, nunca `modified` — então editar peso não muda a data.
  const abrirEdicao = (r) => {
    setPesoInput(r.peso != null && r.peso > 0 ? String(r.peso).replace('.', ',') : '')
    setDataInput(String(r.data || '').split(' ')[0])
    setEditId(r.name)
  }
  const salvarEdit = async (regName) => {
    const p = parseFloat(String(pesoInput).replace(',', '.'))
    const payload = {}
    if (pesoInput !== '' ) {
      if (!(p >= 20 && p <= 400)) { return } // peso inválido: não salva
      payload.peso = p
    }
    if (dataInput) payload.data = dataInput
    if (!payload.peso && !payload.data) { setEditId(null); return }
    setSalvando(true)
    try {
      await onPesoSalvo?.(regName, payload)
      setEditId(null)
    } finally {
      setSalvando(false)
    }
  }

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
          <div className="bg-[#1a1a1a] rounded-lg border border-[#323238] p-4">
            <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
              <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                Peso ao longo do tempo{verTodosPesos ? ' · todos os registros' : ' · selecionados'}
              </h3>
              <div className="flex items-center gap-2">
                {temTodos && (
                  <Button variant="ghost" size="xs" onClick={() => setVerTodosPesos(v => !v)}>
                    {verTodosPesos ? 'Só selecionados' : 'Comparar todos os pesos'}
                  </Button>
                )}
                <Button variant={mostrarEdicao ? 'info' : 'ghost'} size="xs" icon={Pencil} onClick={() => setMostrarEdicao(v => !v)}>
                  Editar peso
                </Button>
              </div>
            </div>
            <GraficoPeso pontos={pontosGrafico} />
            {mostrarEdicao && (
              <div className="mt-4 pt-4 border-t border-[#323238]">
                <p className="text-gray-500 text-[10px] uppercase tracking-wider font-bold mb-2">Editar data e peso · {listaEdicao.length} registro(s)</p>
                <div className="space-y-1 max-h-80 overflow-auto pr-1">
                  {[...listaEdicao].sort((a, b) => (b.data || '').localeCompare(a.data || '')).map((r) => (
                    <div key={r.name} className="flex items-center justify-between gap-3 px-2 py-1.5 rounded hover:bg-white/5">
                      {editId === r.name ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <input
                            type="date" value={dataInput}
                            onChange={e => setDataInput(e.target.value)}
                            className="h-8 px-2 bg-[#29292e] border border-[#2563eb]/60 text-white rounded-lg text-xs outline-none"
                          />
                          <input
                            type="number" step="0.1" autoFocus value={pesoInput}
                            onChange={e => setPesoInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') salvarEdit(r.name); if (e.key === 'Escape') setEditId(null) }}
                            placeholder="kg"
                            className="w-20 h-8 px-2 bg-[#29292e] border border-[#2563eb]/60 text-white rounded-lg text-sm outline-none text-center"
                          />
                          <button onClick={() => salvarEdit(r.name)} disabled={salvando} title="Salvar"
                            className="h-8 w-8 flex items-center justify-center text-green-400 hover:text-white border border-green-500/30 hover:bg-green-700 rounded-lg transition-colors">
                            {salvando ? <span className="w-3 h-3 border-2 border-green-400 border-t-transparent rounded-full animate-spin" /> : <Check size={14} />}
                          </button>
                          <button onClick={() => setEditId(null)} title="Cancelar"
                            className="h-8 w-8 flex items-center justify-center text-gray-400 hover:text-white border border-[#323238] rounded-lg transition-colors">
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="text-gray-300 text-xs font-medium w-24 shrink-0">{fmtData(r.data)}</span>
                          <button onClick={() => abrirEdicao(r)} className="flex items-center gap-2 text-sm group">
                            {r.peso != null && r.peso > 0
                              ? <span className="text-white font-semibold">{numBR(r.peso)} kg</span>
                              : <span className="text-gray-600 italic">sem peso</span>}
                            <Pencil size={12} className="text-gray-600 group-hover:text-[#2563eb] transition-colors" />
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
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
                        {r.peso != null && r.peso > 0
                          ? <span className="text-white text-sm font-bold">{numBR(r.peso)} <span className="text-gray-500 text-xs">kg</span></span>
                          : <span className="text-gray-600 text-xs italic">sem peso</span>}
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

// Tela de PESO de um aluno: gráfico de evolução + lista editável (data + peso),
// sem fotos. Acessada pelo modo "Peso". Editar NÃO mexe na data (só se editar a data).
function PesoDetalhe({ aluno, nome, onVoltar }) {
  const [regs, setRegs] = useState([])
  const [loading, setLoading] = useState(true)
  const [editId, setEditId] = useState(null)
  const [pesoInput, setPesoInput] = useState('')
  const [dataInput, setDataInput] = useState('')
  const [salvando, setSalvando] = useState(false)
  const errorModal = useErrorModal()

  useEffect(() => {
    let cancel = false
    setLoading(true)
    listarRegistros({ aluno, limit: 500 })
      .then(rs => { if (!cancel) setRegs([...rs].sort((a, b) => (b.data || '').localeCompare(a.data || ''))) })
      .catch(e => !cancel && errorModal.show(e, 'Carregar peso'))
      .finally(() => !cancel && setLoading(false))
    return () => { cancel = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aluno])

  const pontos = regs
    .filter(r => r.peso != null && r.peso > 0)
    .map(r => ({ data: r.data, peso: r.peso }))
    .sort((a, b) => (a.data || '').localeCompare(b.data || ''))

  const abrir = (r) => {
    setPesoInput(r.peso != null && r.peso > 0 ? String(r.peso).replace('.', ',') : '')
    setDataInput(String(r.data || '').split(' ')[0])
    setEditId(r.name)
  }
  const salvar = async (r) => {
    const p = parseFloat(String(pesoInput).replace(',', '.'))
    const payload = {}
    if (pesoInput !== '') { if (!(p >= 20 && p <= 400)) return; payload.peso = p }
    if (dataInput) payload.data = dataInput
    if (!payload.peso && !payload.data) { setEditId(null); return }
    setSalvando(true)
    try {
      await salvarRegistro(r.name, { ...payload, peso_revisado: 1 })
      setRegs(rs => rs.map(x => x.name === r.name ? { ...x, ...payload } : x)
        .sort((a, b) => (b.data || '').localeCompare(a.data || '')))
      setEditId(null)
    } catch (e) {
      errorModal.show(e, 'Editar peso')
    } finally {
      setSalvando(false)
    }
  }
  const excluir = async (r) => {
    if (!window.confirm(`Excluir o registro de ${fmtData(r.data)} (foto + peso)? Não dá pra desfazer.`)) return
    try {
      await excluirRegistro(r.name)
      setRegs(rs => rs.filter(x => x.name !== r.name))
    } catch (e) {
      errorModal.show(e, 'Excluir registro')
    }
  }

  return (
    <div className="w-full h-full flex flex-col bg-[#0a0a0a] text-white animate-in fade-in duration-300">
      {errorModal.element}
      <div className="shrink-0 bg-[#0a0a0a]/95 backdrop-blur-md z-20 border-b border-[#323238] px-6 py-3 flex items-center justify-between">
        <button onClick={onVoltar} className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-wide">
          <ArrowLeft size={16} /> Voltar
        </button>
        <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">{nome} · Peso</span>
      </div>
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="max-w-3xl mx-auto space-y-4">
          {loading ? (
            <div className="flex justify-center py-16"><Spinner /></div>
          ) : (
            <>
              <div className="bg-[#1a1a1a] rounded-lg border border-[#323238] p-4">
                <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">Evolução de peso</h3>
                <GraficoPeso pontos={pontos} />
              </div>
              <div className="bg-[#1a1a1a] rounded-lg border border-[#323238] p-4">
                <p className="text-gray-500 text-[10px] uppercase tracking-wider font-bold mb-2">Editar data e peso · {regs.length} registro(s)</p>
                <div className="space-y-1 max-h-[28rem] overflow-auto pr-1">
                  {regs.map((r) => (
                    <div key={r.name} className="flex items-center justify-between gap-3 px-2 py-1.5 rounded hover:bg-white/5">
                      {editId === r.name ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <input type="date" value={dataInput} onChange={e => setDataInput(e.target.value)}
                            className="h-8 px-2 bg-[#29292e] border border-[#2563eb]/60 text-white rounded-lg text-xs outline-none" />
                          <input type="number" step="0.1" autoFocus value={pesoInput} onChange={e => setPesoInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') salvar(r); if (e.key === 'Escape') setEditId(null) }}
                            placeholder="kg"
                            className="w-20 h-8 px-2 bg-[#29292e] border border-[#2563eb]/60 text-white rounded-lg text-sm outline-none text-center" />
                          <button onClick={() => salvar(r)} disabled={salvando} title="Salvar"
                            className="h-8 w-8 flex items-center justify-center text-green-400 hover:text-white border border-green-500/30 hover:bg-green-700 rounded-lg transition-colors">
                            {salvando ? <span className="w-3 h-3 border-2 border-green-400 border-t-transparent rounded-full animate-spin" /> : <Check size={14} />}
                          </button>
                          <button onClick={() => setEditId(null)} title="Cancelar"
                            className="h-8 w-8 flex items-center justify-center text-gray-400 hover:text-white border border-[#323238] rounded-lg transition-colors">
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="text-gray-300 text-xs font-medium w-24 shrink-0">{fmtData(r.data)}</span>
                          <div className="flex items-center gap-3">
                            <button onClick={() => abrir(r)} className="flex items-center gap-2 text-sm group">
                              {r.peso != null && r.peso > 0
                                ? <span className="text-white font-semibold">{numBR(r.peso)} kg</span>
                                : <span className="text-gray-600 italic">sem peso</span>}
                              <Pencil size={12} className="text-gray-600 group-hover:text-[#2563eb] transition-colors" />
                            </button>
                            <button onClick={() => excluir(r)} title="Excluir registro (foto + peso)"
                              className="h-6 w-6 flex items-center justify-center text-gray-600 hover:text-red-400 transition-colors">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
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
  const [filtroConjunto, setFiltroConjunto] = useState('')
  const [conjuntos, setConjuntos] = useState([])
  const [modoComparar, setModoComparar] = useState(false)
  const [selecionados, setSelecionados] = useState([])
  const [comparando, setComparando] = useState(null)
  const [pesoAluno, setPesoAluno] = useState(null) // {aluno, nome} — detalhe de peso (modo Peso)
  const [pontosTodos, setPontosTodos] = useState([])
  const [registrosDoAluno, setRegistrosDoAluno] = useState([])
  const [loadingCmp, setLoadingCmp] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [showRegistrar, setShowRegistrar] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [buscaDebounced, setBuscaDebounced] = useState('')
  const errorModal = useErrorModal()

  // Feed global sem busca: pagina do servidor (não carrega tudo). Com busca ou
  // embutido por aluno: puxa todos os registros do(s) aluno(s) de uma vez.
  const serverPaged = !alunoId && !buscaDebounced

  // Debounce da busca: dispara reload server-side (resolve os alunos no servidor),
  // não filtra só o que já estava carregado.
  useEffect(() => {
    const t = setTimeout(() => setBuscaDebounced(busca.trim()), 400)
    return () => clearTimeout(t)
  }, [busca])

  // Conjuntos do profissional pro filtro "Padrão de fotos".
  useEffect(() => {
    listarConjuntos({ limit: 100 }).then(({ list }) => setConjuntos(list || [])).catch(() => {})
  }, [])

  // Volta pra página 1 ao trocar escopo (busca/origem/conjunto/aluno).
  useEffect(() => { setPage(1) }, [buscaDebounced, filtroOrigem, filtroConjunto, alunoId])

  useEffect(() => {
    let cancelado = false
    setLoading(true)
    const carregar = async () => {
      try {
        let regs, more = false
        if (alunoId) {
          const r = await listarRegistrosFeed({ aluno: alunoId, origem: filtroOrigem, conjunto: filtroConjunto, conteudo: 'foto', limit: FEED_LIMIT })
          regs = r.registros
        } else if (buscaDebounced) {
          const { list: al } = await listarAlunos({ search: buscaDebounced, limit: 50 })
          const ids = al.map(a => a.name)
          if (!ids.length) {
            regs = []
          } else {
            const r = await listarRegistrosFeed({ alunos: ids, origem: filtroOrigem, conjunto: filtroConjunto, conteudo: 'foto', limit: FEED_LIMIT })
            regs = r.registros
            if (!cancelado) { const m = {}; al.forEach(a => { m[a.name] = a.nome_completo }); setNomes(prev => ({ ...prev, ...m })) }
          }
        } else {
          const r = await listarRegistrosFeed({ origem: filtroOrigem, conjunto: filtroConjunto, conteudo: 'foto', limit: PAGE_SIZE, limitStart: (page - 1) * PAGE_SIZE })
          regs = r.registros
          more = r.hasMore
        }
        if (cancelado) return
        setRegistros(regs)
        setHasMore(serverPaged && more)
        // nomes dos alunos da página (feed/embutido)
        if (!buscaDebounced && !alunoId) {
          const ids = [...new Set(regs.map(r => r.aluno).filter(Boolean))]
          if (ids.length) {
            const al = await listarAlunosByIds(ids).catch(() => [])
            if (!cancelado) { const m = {}; al.forEach(a => { m[a.name] = a.nome_completo }); setNomes(prev => ({ ...prev, ...m })) }
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
  }, [alunoId, refreshKey, buscaDebounced, filtroOrigem, filtroConjunto, page])

  // origem/busca/modo já filtrados no servidor; aqui só o nome (transitório do debounce)
  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase()
    if (!q) return registros
    return registros.filter(r => (nomes[r.aluno] || '').toLowerCase().includes(q))
  }, [registros, nomes, busca])

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
    if (!comparando) { setPontosTodos([]); setRegistrosDoAluno([]); return }
    const aluno = comparando[0]?.aluno
    if (!aluno) return
    let cancel = false
    listarRegistros({ aluno, limit: 500 })
      .then(regs => {
        if (cancel) return
        setRegistrosDoAluno(regs) // histórico completo (com name) pro "Editar peso"
        const pts = regs
          .filter(r => r.peso != null && r.peso > 0)
          .map(r => ({ data: r.data, peso: r.peso }))
          .sort((a, b) => (a.data || '').localeCompare(b.data || ''))
        setPontosTodos(pts)
      })
      .catch(() => {})
    return () => { cancel = true }
  }, [comparando])

  // Clique na linha: compara fotos+peso do registro.
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

  if (pesoAluno) {
    return <PesoDetalhe aluno={pesoAluno.aluno} nome={pesoAluno.nome} onVoltar={() => setPesoAluno(null)} />
  }

  if (comparando) {
    const nome = nomes[comparando[0]?.aluno] || comparando[0]?.aluno || ''
    const alunoCmp = comparando[0]?.aluno
    const pontosLocais = registros
      .filter(r => r.aluno === alunoCmp && r.peso != null && r.peso > 0)
      .map(r => ({ data: r.data, peso: r.peso }))
      .sort((a, b) => (a.data || '').localeCompare(b.data || ''))
    const pontosPeso = pontosTodos.length ? pontosTodos : pontosLocais
    // "Editar peso" lista TODO o histórico do aluno (com name). Fallback: comparados.
    const todosRegistros = registrosDoAluno.length ? registrosDoAluno : comparando
    // payload: { data?, peso? }. salva no campo `data` (manual) e/ou peso.
    const onPesoSalvo = async (regName, payload) => {
      try {
        await salvarRegistro(regName, { ...payload, peso_revisado: 1 })
        const upd = (r) => r.name === regName
          ? { ...r, ...(payload.data ? { data: payload.data } : {}), ...(payload.peso != null ? { peso: payload.peso } : {}) }
          : r
        setComparando(cs => cs.map(upd))
        setRegistros(rs => rs.map(upd))
        const baseAluno = (registrosDoAluno.length ? registrosDoAluno : comparando).map(upd)
        setRegistrosDoAluno(baseAluno)
        setPontosTodos(
          baseAluno
            .filter(r => r.peso != null && r.peso > 0)
            .map(r => ({ data: r.data, peso: r.peso }))
            .sort((a, b) => (a.data || '').localeCompare(b.data || ''))
        )
      } catch (e) {
        errorModal.show(e, 'Editar registro')
      }
    }
    return (
      <RegistroComparacao
        registros={comparando}
        todosRegistros={todosRegistros}
        pontosPeso={pontosPeso}
        nome={nome}
        onVoltar={() => { setComparando(null); setSelecionados([]); setModoComparar(false) }}
        onPesoSalvo={onPesoSalvo}
      />
    )
  }

  const excluirLinha = async (row) => {
    if (!window.confirm(`Excluir o registro de ${fmtData(row.data)} (foto + peso) deste aluno? Não dá pra desfazer.`)) return
    try {
      await excluirRegistro(row.name)
      setRegistros(rs => rs.filter(r => r.name !== row.name))
      setRefreshKey(k => k + 1)
    } catch (e) {
      errorModal.show(e, 'Excluir registro')
    }
  }

  const columns = [
    {
      label: 'Ações', headerClass: 'w-36 text-center', cellClass: 'text-center',
      render: (row) => (
        <div className="flex items-center justify-center gap-1.5" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => compararUltimos3(row)}
            title="Comparar 3 últimas fotos deste aluno"
            className="h-7 w-7 flex items-center justify-center text-gray-400 hover:text-white border border-[#323238] hover:border-gray-500 rounded-lg transition-colors relative group"
          >
            <Columns size={12} />
            <span className="absolute -top-1.5 -right-1.5 bg-[#2563eb] text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">3</span>
          </button>
          <button
            onClick={() => setPesoAluno({ aluno: row.aluno, nome: nomes[row.aluno] || row.aluno })}
            title="Ver evolução de peso deste aluno"
            className="h-7 w-7 flex items-center justify-center text-gray-400 hover:text-white border border-[#323238] hover:border-[#2563eb] rounded-lg transition-colors"
          >
            <LineChartIcon size={12} />
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
          <button
            onClick={() => excluirLinha(row)}
            title="Excluir registro (foto + peso)"
            className="h-7 w-7 flex items-center justify-center text-[#2563eb] hover:text-white border border-[#2563eb]/30 hover:bg-[#2563eb] rounded-lg transition-colors"
          >
            <Trash2 size={12} />
          </button>
        </div>
      ),
    },
    ...(!alunoId ? [{
      label: 'Aluno',
      render: (row) => <span className="text-white text-sm font-medium">{nomes[row.aluno] || row.aluno}</span>,
    }] : []),
    {
      label: 'Formulário',
      render: (row) => {
        const b = ORIGEM_BADGE[row.origem] || ORIGEM_BADGE.manual
        const nome = row.fonte || (row.origem === 'avaliacao' ? 'Avaliação Corporal' : b.label)
        return <Badge variant={b.variant} size="sm">{nome}</Badge>
      },
    },
    {
      label: 'Padrão de fotos',
      render: (row) => row.conjunto
        ? <Badge variant="purple" size="sm">{row.conjunto}</Badge>
        : <span className="text-gray-600 text-xs">—</span>,
    },
    {
      label: 'Data',
      render: (row) => <span className="text-gray-400 text-xs">{fmtData(row.data)}</span>,
    },
    {
      label: 'Peso', headerClass: 'text-center', cellClass: 'text-center',
      render: (row) => row.peso != null && row.peso > 0 ? <span className="text-white text-sm font-semibold">{numBR(row.peso)} kg</span> : <span className="text-gray-600 text-xs">—</span>,
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
    <EmptyState icon={ImageIcon} title="Sem registros com foto" description="Aparecem aqui os registros que têm foto (feedback, avaliação inicial/postural, conjunto). O peso você vê no botão de peso ou abrindo o registro." />
  ) : (
    <>
      <DataTable
        columns={columns}
        rows={filtrados}
        rowKey="name"
        onRowClick={viewRegistro}
        // Feed paginado: rows já é a página do servidor → mostra tudo (page 1 interno).
        // Busca/embutido: pagina no client.
        page={serverPaged ? 1 : page}
        pageSize={serverPaged || busca ? (filtrados.length || 1) : PAGE_SIZE}
        onPage={serverPaged || busca ? undefined : setPage}
      />
      {serverPaged && (filtrados.length > 0) && (
        <div className="flex items-center justify-between mt-3 px-1">
          <Button variant="secondary" size="sm" icon={ChevronLeft} disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Anterior</Button>
          <span className="text-xs text-gray-500 font-medium">Página {page}</span>
          <Button variant="secondary" size="sm" iconRight={ChevronRight} disabled={!hasMore} onClick={() => setPage(p => p + 1)}>Próxima</Button>
        </div>
      )}
    </>
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
          <p className="text-gray-500 text-xs">Selecione 2–3 registros pra comparar fotos. Use o ícone de peso pra ver a evolução de peso.</p>
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
        subtitle="Fotos dos seus alunos · busque um nome pra ver todo o histórico"
        actions={toolbar}
        filters={[
          { type: 'search', value: busca, onChange: setBusca, placeholder: 'Buscar aluno...', icon: Search },
          { type: 'select', value: filtroOrigem, onChange: setFiltroOrigem, placeholder: 'Todas as origens', options: [
            { value: 'avaliacao', label: 'Avaliação Corporal' },
            { value: 'feedback', label: 'Feedback' },
            { value: 'anamnese', label: 'Anamnese' },
            { value: 'manual', label: 'Manual' },
          ] },
          { type: 'select', value: filtroConjunto, onChange: setFiltroConjunto, placeholder: 'Todos os padrões de fotos', options: conjuntos.map(c => ({ value: c.name, label: c.titulo })) },
        ]}
        loading={false}
        empty={null}
      >
        {tabela}
      </ListPage>
    </>
  )
}
