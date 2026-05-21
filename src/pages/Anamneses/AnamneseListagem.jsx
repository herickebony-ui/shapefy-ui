import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Plus, RefreshCw, ClipboardList, Trash2, Eye, Check,
  Send, FileText, AlertCircle, ChevronRight, User, UserPlus, Link2,
} from 'lucide-react'
import {
  listarAnamneses, excluirAnamnese, buscarAnamnese, marcarEntregueAnamnese,
} from '../../api/anamneses'
import { listarAlunos } from '../../api/alunos'
import { criarNotificacaoAluno } from '../../api/notificacoes'
import {
  Button, Badge, Input, Spinner, EmptyState, DataTable, BotaoAjuda,
} from '../../components/ui'
// JornadaInicial e OnboardingBanner removidos daqui — vivem só no Dashboard
// (rota /), que é a tela inicial pós-login. Aqui o foco é gerenciar as
// anamneses em si.
import { buscarSmart, primeiroNome } from '../../utils/strings'
import VincularAnamneseModal from '../../components/anamnese/VincularAnamneseModal'
import AnamneseViewerModal from '../../components/anamnese/AnamneseViewerModal'

const fmtData = (d) => {
  if (!d) return '—'
  const [y, m, day] = String(d).split(' ')[0].split('-')
  return `${day}/${m}/${y}`
}

// Status válidos do DocType Anamnese (Select no Frappe):
//   "" (vazio = pendente), "Enviado", "Respondido", "Finalizado"
//
// Anamnese é considerada "respondida" se qualquer um destes sinais bater:
// - aluno_preencheu: flag seteado pelo backend quando o aluno envia o form
// - status === 'Respondido': workflow direto
// - status === 'Finalizado': finalizada IS-A respondida (passou pelo estado
//   antes de ser encerrada)
// - entregue: se o profissional marcou entregue, ele só fez isso após ler
//   as respostas — então é necessariamente respondida.
const respondidaAnamnese = (a) =>
  !!a && (a.aluno_preencheu || a.status === 'Respondido' || a.status === 'Finalizado' || a.entregue)

const STATUS_OPTS = [
  { value: '', label: 'Todos' },
  { value: 'sem_anamnese', label: 'Sem anamnese' },
  { value: 'pendente', label: 'Pendentes' },
  { value: 'Enviado', label: 'Enviadas' },
  { value: 'Respondido', label: 'Respondidas' },
  { value: 'Finalizado', label: 'Finalizadas' },
]

const TOPICOS_AJUDA_ANAMNESES = [
  { icon: UserPlus, title: 'Alunos sem anamnese', description: 'Alunos recém-cadastrados que ainda não receberam nenhum questionário aparecem com status "Sem anamnese". A tela abre filtrada nas respondidas — use o filtro de status "Sem anamnese" pra vê-los e clicar em "Vincular".' },
  { icon: Link2,    title: 'Vincular anamnese', description: 'O botão "Vincular Anamnese" no canto superior direito abre um modal pra escolher o aluno + o template e enviar de uma vez. Use também pra anamneses de retorno do mesmo aluno.' },
  { icon: Send,     title: 'Enviar e acompanhar', description: 'Após vincular, o status muda pra "Enviada". Quando o aluno responder, vira "Respondida". Use os filtros pra ver só pendentes ou já entregues.' },
  { icon: Check,    title: 'Marcar entregue', description: 'Sinaliza que você já entregou o plano (dieta/treino) baseado nessa anamnese pro aluno — e dispara automaticamente uma notificação no app dele avisando que o plano está disponível. Serve também como controle interno pra ver quais alunos já receberam.' },
  { icon: Eye,      title: 'Visualizar', description: 'Clique no item da lista ou no ícone de olho pra ver as respostas do aluno. Da tela de visualização você pode também imprimir ou exportar.' },
]

const ENTREGUE_OPTS = [
  { value: '', label: 'Entrega: todos' },
  { value: 'sim', label: 'Apenas entregues' },
  { value: 'nao', label: 'Apenas não entregues' },
]

export default function AnamneseListagem() {
  const [lista, setLista] = useState([])
  const [alunos, setAlunos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [busca, setBusca] = useState('')
  const [query, setQuery] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [filtroEntregue, setFiltroEntregue] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const [modalVincular, setModalVincular] = useState(false)
  const [alunoPreVincular, setAlunoPreVincular] = useState(null)
  const [anamneseAberta, setAnamneseAberta] = useState(null)
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false)
  const [excluindoId, setExcluindoId] = useState(null)

  useEffect(() => {
    const t = setTimeout(() => { setQuery(busca); setPage(1) }, 400)
    return () => clearTimeout(t)
  }, [busca])

  useEffect(() => { setPage(1) }, [filtroStatus, filtroEntregue])

  const carregar = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [{ list }, alunosRes] = await Promise.all([
        listarAnamneses({ limit: 200 }),
        listarAlunos({ limit: 500 }).catch(() => ({ list: [] })),
      ])
      setLista(list)
      setAlunos(alunosRes?.list || [])
    } catch (e) { setError(e.message || 'Erro ao carregar anamneses') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  // Linhas sintéticas pra alunos que ainda não têm nenhuma anamnese vinculada.
  // Mostra com status "Sem anamnese" no topo da lista pra o profissional não
  // esquecer de mandar a anamnese inicial pra alunos novos.
  const linhasSemAnamnese = useMemo(() => {
    if (!alunos.length) return []
    const idsComAnamnese = new Set(lista.map(a => a.aluno).filter(Boolean))
    return alunos
      .filter(al => !idsComAnamnese.has(al.name))
      .map(al => ({
        name: `__sem_anamnese__${al.name}`,
        aluno: al.name,
        nome_completo: al.nome_completo,
        titulo: null,
        date: al.creation,
        creation: al.creation,
        status: 'sem_anamnese',
        entregue: false,
        _semAnamnese: true,
        _alunoData: al,
      }))
  }, [lista, alunos])

  // Linha do tempo única (mais recente no topo): respondidas usam data_resposta;
  // não respondidas e alunos sem anamnese caem no creation. Assim quem respondeu
  // por último sobe pro topo, sem deslocar as pendentes da ordem por cadastro.
  const listaCompleta = useMemo(() => {
    const todos = [...linhasSemAnamnese, ...lista]
    return todos.sort((a, b) => {
      const cA = a.data_resposta || a.creation || a.date || ''
      const cB = b.data_resposta || b.creation || b.date || ''
      return String(cB).localeCompare(String(cA))
    })
  }, [linhasSemAnamnese, lista])

  const listaFiltrada = useMemo(() => {
    return listaCompleta.filter(a => {
      if (query && !buscarSmart([a.nome_completo, a.titulo, a.aluno], query)) return false
      const respondida = respondidaAnamnese(a)
      if (filtroStatus) {
        if (filtroStatus === 'pendente') {
          if (respondida || a.status === 'Enviado' || a._semAnamnese) return false
        } else if (filtroStatus === 'sem_anamnese') {
          if (!a._semAnamnese) return false
        } else if (filtroStatus === 'Respondido') {
          if (!respondida) return false
        } else if (filtroStatus === 'Enviado') {
          // Enviada de fato (não respondeu ainda)
          if (respondida || a.status !== 'Enviado') return false
        } else if (a.status !== filtroStatus) return false
      }
      if (a._semAnamnese && filtroStatus !== 'sem_anamnese' && filtroStatus !== '') return false
      if (filtroEntregue === 'sim' && !a.entregue) return false
      if (filtroEntregue === 'nao' && (a.entregue || a._semAnamnese)) return false
      return true
    })
  }, [listaCompleta, query, filtroStatus, filtroEntregue])

  const abrirAnamnese = async (a) => {
    if (a._semAnamnese) {
      setAlunoPreVincular(a._alunoData)
      setModalVincular(true)
      return
    }
    setCarregandoDetalhe(true)
    try {
      const doc = await buscarAnamnese(a.name)
      setAnamneseAberta(doc)
    } catch (e) {
      console.error(e)
      alert('Erro ao carregar anamnese.')
    } finally { setCarregandoDetalhe(false) }
  }

  const abrirVincularPraAluno = (aluno) => {
    setAlunoPreVincular(aluno)
    setModalVincular(true)
  }

  const handleMarcarEntregue = (a) => {
    const anterior = { entregue: a.entregue, data_entrega: a.data_entrega }
    const novoEntregue = a.entregue ? 0 : 1
    setLista(prev => prev.map(x => x.name === a.name
      ? { ...x, entregue: novoEntregue, data_entrega: novoEntregue ? new Date().toISOString() : null }
      : x))
    marcarEntregueAnamnese(a.name, !!novoEntregue)
      .then(() => {
        // Quando o profissional marca como entregue (não desmarca), notifica
        // o aluno no app que o plano está disponível. Falha silenciosa: não
        // bloqueia a marcação se a notificação não criar.
        if (novoEntregue && a.aluno) {
          const primeiro = primeiroNome(a.nome_completo)
          const titulo = primeiro
            ? `Seu plano está disponível! ${primeiro}!`
            : 'Seu plano está disponível!'
          criarNotificacaoAluno({
            aluno: a.aluno,
            titulo,
            descricao: 'Acesse o app para conferir seu planejamento.',
          }).catch(err => console.error('Erro ao criar notificação:', err))
        }
      })
      .catch(e => {
        console.error(e)
        setLista(prev => prev.map(x => x.name === a.name ? { ...x, ...anterior } : x))
        alert('Erro ao atualizar entrega. Verifique se o campo "entregue" existe no DocType Anamnese.')
      })
  }

  const handleExcluir = async (a) => {
    const msg = respondidaAnamnese(a)
      ? `Esta anamnese já foi respondida pelo aluno. Tem certeza que deseja excluir "${a.titulo || a.name}"?`
      : `Excluir "${a.titulo || a.name}"?`
    if (!window.confirm(msg)) return
    setExcluindoId(a.name)
    try {
      await excluirAnamnese(a.name)
      const { list } = await listarAnamneses({ limit: 200 })
      setLista(list)
    } catch (e) {
      console.error(e)
      alert('Erro ao excluir anamnese.')
    } finally { setExcluindoId(null) }
  }

  const columns = [
    {
      label: 'Aluno',
      headerClass: 'min-w-[170px]',
      render: (a) => (
        <div className="min-w-0">
          <p className="text-white text-sm font-medium truncate">
            {a.nome_completo || <span className="text-gray-600 italic">sem aluno</span>}
          </p>
          {a.aluno && (
            <p className="text-gray-500 text-xs flex items-center gap-1 truncate">
              <User size={10} />{a.aluno}
            </p>
          )}
        </div>
      ),
    },
    {
      label: 'Anamnese',
      headerClass: 'min-w-[220px]',
      render: (a) => (
        a._semAnamnese
          ? <p className="text-gray-500 text-xs font-medium italic">— sem anamnese vinculada —</p>
          : <p className="text-gray-300 text-xs font-medium truncate">{a.titulo || a.name}</p>
      ),
    },
    {
      label: 'Status',
      headerClass: 'w-40 text-center',
      cellClass: 'text-center',
      render: (a) => {
        if (a._semAnamnese) return <Badge variant="default" size="sm" className="whitespace-nowrap">Sem anamnese</Badge>
        if (a.status === 'Finalizado') return <Badge variant="info" size="sm">Finalizada</Badge>
        if (respondidaAnamnese(a)) return <Badge variant="success" size="sm">Respondida</Badge>
        if (a.status === 'Enviado') return <Badge variant="warning" size="sm">Enviada</Badge>
        return <Badge variant="default" size="sm">Pendente</Badge>
      },
    },
    {
      label: 'Criada em',
      headerClass: 'w-28 text-center whitespace-nowrap',
      cellClass: 'text-center',
      render: (a) => <span className="text-gray-400 text-xs">{fmtData(a.date)}</span>,
    },
    {
      label: 'Respondida em',
      headerClass: 'w-32 text-center whitespace-nowrap',
      cellClass: 'text-center',
      render: (a) => (
        a.data_resposta
          ? <span className="text-green-300/90 text-xs">{fmtData(a.data_resposta)}</span>
          : <span className="text-gray-700 text-xs">—</span>
      ),
    },
    {
      label: 'Entrega',
      headerClass: 'w-44 text-center',
      cellClass: 'text-center',
      render: (a) => {
        if (a._semAnamnese) return <span className="text-gray-700 text-[10px]">—</span>
        return (
          <div onClick={e => e.stopPropagation()} className="flex justify-center">
            {a.entregue ? (
              <button
                onClick={() => handleMarcarEntregue(a)}
                title={a.data_entrega ? `Entregue em ${fmtData(a.data_entrega)}` : 'Entregue'}
                className="h-7 px-3 flex items-center gap-1.5 text-green-300 bg-green-500/10 border border-green-500/30 hover:border-green-500/60 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-colors disabled:opacity-40"
              >
                <Check size={11} /> Entregue
              </button>
            ) : (
              <button
                onClick={() => handleMarcarEntregue(a)}
                title="Marcar como entregue ao aluno"
                className="h-7 px-3 flex items-center gap-1.5 text-gray-400 hover:text-white border border-[#323238] hover:bg-green-700 hover:border-green-700 rounded-lg text-[11px] font-medium transition-colors disabled:opacity-40"
              >
                <Check size={11} /> Marcar entregue
              </button>
            )}
          </div>
        )
      },
    },
    {
      label: 'Ações',
      headerClass: 'w-32 text-center',
      cellClass: 'text-center',
      render: (a) => {
        if (a._semAnamnese) {
          return (
            <div className="flex items-center justify-center" onClick={e => e.stopPropagation()}>
              <button
                onClick={() => abrirVincularPraAluno(a._alunoData)}
                title="Vincular anamnese a este aluno"
                className="h-7 px-3 flex items-center gap-1.5 text-gray-300 hover:text-white border border-[#323238] hover:bg-blue-600 hover:border-blue-600 rounded-lg text-[11px] font-medium transition-colors whitespace-nowrap"
              >
                <Link2 size={11} /> Vincular
              </button>
            </div>
          )
        }
        return (
          <div className="flex items-center justify-center gap-1.5" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => abrirAnamnese(a)}
              title="Ver / editar"
              className="h-7 w-7 flex items-center justify-center text-gray-400 hover:text-white border border-[#323238] hover:border-gray-500 rounded-lg transition-colors"
            >
              <Eye size={12} />
            </button>
            <button
              onClick={() => handleExcluir(a)}
              disabled={excluindoId === a.name}
              title="Excluir"
              className="h-7 w-7 flex items-center justify-center text-[#2563eb] hover:text-white border border-[#2563eb]/30 hover:bg-[#2563eb] rounded-lg transition-colors disabled:opacity-40"
            >
              <Trash2 size={12} />
            </button>
          </div>
        )
      },
    },
    {
      label: '',
      headerClass: 'w-10',
      render: () => <ChevronRight size={15} className="text-gray-600 group-hover:text-gray-300 transition-colors" />,
    },
  ]

  const temFiltroAtivo = !!(filtroStatus || filtroEntregue)

  return (
    <div className="p-8 text-white">
      <div className="max-w-screen-xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Anamneses</h1>
            <p className="text-gray-400 text-sm mt-1">
              Vincule, envie e acompanhe anamneses dos seus alunos
            </p>
          </div>
          <div className="flex items-center gap-2">
            <BotaoAjuda
              title="Como funciona a Gestão de Anamneses"
              subtitle="Guia rápido desta tela"
              topicos={TOPICOS_AJUDA_ANAMNESES}
            />
            <Button
              variant="secondary"
              size="sm"
              icon={RefreshCw}
              onClick={carregar}
              loading={loading}
              title="Atualizar"
            />
            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={() => { setAlunoPreVincular(null); setModalVincular(true) }}
            >
              Vincular Anamnese
            </Button>
          </div>
        </div>


        {/* Filtros */}
        <div className="flex flex-wrap gap-2 mb-6">
          <div className="flex-1 min-w-[220px] max-w-md">
            <Input
              value={busca}
              onChange={setBusca}
              placeholder="Buscar por aluno, título ou ID..."
              icon={({ size }) => <ClipboardList size={size} />}
            />
          </div>
          <select
            value={filtroStatus}
            onChange={e => setFiltroStatus(e.target.value)}
            className="h-10 px-3 bg-[#1a1a1a] border border-[#323238] text-white rounded-lg text-sm outline-none focus:border-[#2563eb]/60 transition-colors"
          >
            {STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select
            value={filtroEntregue}
            onChange={e => setFiltroEntregue(e.target.value)}
            className="h-10 px-3 bg-[#1a1a1a] border border-[#323238] text-white rounded-lg text-sm outline-none focus:border-[#2563eb]/60 transition-colors"
          >
            {ENTREGUE_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {temFiltroAtivo && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setFiltroStatus(''); setFiltroEntregue('') }}
            >
              Limpar
            </Button>
          )}
        </div>

        {/* Conteúdo */}
        {error ? (
          <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
            <AlertCircle size={18} className="shrink-0" />
            <div>
              <p className="font-medium text-sm">Erro ao carregar anamneses</p>
              <p className="text-xs mt-0.5 opacity-80">{error}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={carregar} className="ml-auto">
              Tentar novamente
            </Button>
          </div>
        ) : loading ? (
          <div className="bg-[#29292e] border border-[#323238] rounded-lg overflow-hidden">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-14 border-b border-[#323238] animate-pulse" />
            ))}
          </div>
        ) : listaFiltrada.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={query || temFiltroAtivo ? 'Nenhuma anamnese encontrada' : 'Nenhuma anamnese vinculada'}
            description={
              query || temFiltroAtivo
                ? 'Ajuste a busca ou os filtros'
                : 'Clique em "Vincular Anamnese" para começar'
            }
          />
        ) : (
          <DataTable
            columns={columns}
            rows={listaFiltrada}
            rowKey="name"
            onRowClick={abrirAnamnese}
            page={page}
            pageSize={pageSize}
            onPage={setPage}
            onPageSize={(s) => { setPageSize(s); setPage(1) }}
            mobileCard={(a) => {
              if (a._semAnamnese) {
                return (
                  <div className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="min-w-0">
                        <p className="text-white text-sm font-medium truncate">
                          {a.nome_completo || <span className="text-gray-600 italic">sem aluno</span>}
                        </p>
                        {a.aluno && (
                          <p className="text-gray-500 text-[11px] truncate">{a.aluno}</p>
                        )}
                      </div>
                      <Badge variant="default" size="sm" className="whitespace-nowrap shrink-0">Sem anamnese</Badge>
                    </div>
                    <button
                      onClick={() => abrirVincularPraAluno(a._alunoData)}
                      className="w-full h-10 flex items-center justify-center gap-2 text-gray-300 hover:text-white border border-[#323238] hover:bg-blue-600 hover:border-blue-600 rounded-lg text-xs font-medium transition-colors"
                    >
                      <Link2 size={13} /> Vincular anamnese
                    </button>
                  </div>
                )
              }
              const statusBadge = a.status === 'Finalizado' ? <Badge variant="info" size="sm">Finalizada</Badge>
                : respondidaAnamnese(a) ? <Badge variant="success" size="sm">Respondida</Badge>
                : a.status === 'Enviado' ? <Badge variant="warning" size="sm">Enviada</Badge>
                : <Badge variant="default" size="sm">Pendente</Badge>
              return (
                <div className="px-3 py-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <p className="text-white text-sm font-medium truncate">
                        {a.nome_completo || <span className="text-gray-600 italic">sem aluno</span>}
                      </p>
                      <p className="text-gray-400 text-[11px] truncate">{a.titulo || a.name}</p>
                      <p className="text-gray-600 text-[10px]">
                        Criada {fmtData(a.date)}
                        {a.data_resposta && (
                          <> · <span className="text-green-300/80">Respondida {fmtData(a.data_resposta)}</span></>
                        )}
                      </p>
                    </div>
                    <div className="shrink-0">{statusBadge}</div>
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#323238]/60" onClick={(e) => e.stopPropagation()}>
                    {a.entregue ? (
                      <button
                        onClick={() => handleMarcarEntregue(a)}
                        className="h-9 px-3 flex items-center gap-1.5 text-green-300 bg-green-500/10 border border-green-500/30 rounded-lg text-[11px] font-bold uppercase tracking-wider"
                      >
                        <Check size={12} /> Entregue
                      </button>
                    ) : (
                      <button
                        onClick={() => handleMarcarEntregue(a)}
                        className="h-9 px-3 flex items-center gap-1.5 text-gray-400 hover:text-white border border-[#323238] rounded-lg text-[11px] font-medium"
                      >
                        <Check size={12} /> Marcar entregue
                      </button>
                    )}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => abrirAnamnese(a)}
                        className="h-9 w-9 flex items-center justify-center text-gray-400 hover:text-white border border-[#323238] rounded-lg"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={() => handleExcluir(a)}
                        disabled={excluindoId === a.name}
                        className="h-9 w-9 flex items-center justify-center text-[#2563eb] hover:text-white border border-[#2563eb]/30 hover:bg-[#2563eb] rounded-lg disabled:opacity-40"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            }}
          />
        )}
      </div>

      {modalVincular && (
        <VincularAnamneseModal
          alunoPreSelecionado={alunoPreVincular}
          onClose={() => { setModalVincular(false); setAlunoPreVincular(null) }}
          onVinculada={() => { carregar() }}
        />
      )}

      {carregandoDetalhe && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60">
          <Spinner />
        </div>
      )}

      {anamneseAberta && (
        <AnamneseViewerModal
          anamnese={anamneseAberta}
          onClose={() => setAnamneseAberta(null)}
          onAtualizada={carregar}
        />
      )}
    </div>
  )
}
