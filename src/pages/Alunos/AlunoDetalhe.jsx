import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, ChevronRight, BarChart2, Plus,
  ClipboardList, Activity, Calendar, Mail, Phone, AtSign,
  Cake,
} from 'lucide-react'

const WhatsAppIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 0 1 8.413 3.488 11.824 11.824 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 0 0 1.51 5.26l.36.572-1 3.648 3.74-.98zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.247-.694.247-1.289.173-1.413z"/>
  </svg>
)
import { buscarAluno } from '../../api/alunos'
import { listarDietas } from '../../api/dietas'
import { listarFichas } from '../../api/fichas'
import { listarAnamneses } from '../../api/anamneses'
import { listarAvaliacoesPorAluno } from '../../api/avaliacoes'
import {
  Button, Badge, Tabs, Spinner, EmptyState,
} from '../../components/ui'
import { TabPerfil, TabAnamnese, TabLista } from './AlunoModal'

const FRAPPE_URL = import.meta.env.VITE_FRAPPE_URL || ''

const fmtData = (d) => {
  if (!d) return '—'
  const [y, m, day] = String(d).split(' ')[0].split('-')
  return `${day}/${m}/${y}`
}

const calcularIdade = (dataIso) => {
  if (!dataIso) return null
  const ymd = String(dataIso).split(' ')[0]
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null
  const nasc = new Date(`${ymd}T00:00:00`)
  const hoje = new Date()
  let anos = hoje.getFullYear() - nasc.getFullYear()
  const m = hoje.getMonth() - nasc.getMonth()
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) anos--
  return anos >= 0 && anos < 150 ? anos : null
}

const TABS = [
  { id: 'perfil',     label: 'Perfil',              icon: ClipboardList },
  { id: 'dietas',     label: 'Dietas',              icon: ClipboardList },
  { id: 'treinos',    label: 'Treinos',             icon: Activity },
  { id: 'anamnese',   label: 'Anamnese',            icon: ClipboardList },
  { id: 'composicao', label: 'Composição Corporal', icon: BarChart2 },
]

export default function AlunoDetalhe() {
  const navigate = useNavigate()
  const { id } = useParams()

  const [aluno, setAluno] = useState(null)
  const [loadingAluno, setLoadingAluno] = useState(true)
  const [erroAluno, setErroAluno] = useState(null)

  const [abaAtiva, setAbaAtiva] = useState('perfil')

  const [dietas, setDietas] = useState([])
  const [loadingDietas, setLoadingDietas] = useState(false)
  const [dietasCarregadas, setDietasCarregadas] = useState(false)

  const [fichas, setFichas] = useState([])
  const [loadingFichas, setLoadingFichas] = useState(false)
  const [fichasCarregadas, setFichasCarregadas] = useState(false)

  const [anamneses, setAnamneses] = useState([])
  const [loadingAnamneses, setLoadingAnamneses] = useState(false)

  const [avaliacoes, setAvaliacoes] = useState([])
  const [loadingAvaliacoes, setLoadingAvaliacoes] = useState(false)
  const [avaliacoesCarregadas, setAvaliacoesCarregadas] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoadingAluno(true)
    setErroAluno(null)
    buscarAluno(id)
      .then(a => {
        if (!a) setErroAluno('Aluno não encontrado ou sem permissão')
        setAluno(a)
      })
      .catch(e => { console.error(e); setErroAluno('Erro ao carregar aluno') })
      .finally(() => setLoadingAluno(false))

    setLoadingAnamneses(true)
    listarAnamneses({ alunoId: id, limit: 50 })
      .then(r => setAnamneses(r.list))
      .catch(console.error)
      .finally(() => setLoadingAnamneses(false))
  }, [id])

  useEffect(() => {
    if (!id) return
    if (abaAtiva === 'dietas' && !dietasCarregadas) {
      setLoadingDietas(true)
      listarDietas({ alunoId: id, limit: 50 })
        .then(r => { setDietas(r.list); setDietasCarregadas(true) })
        .catch(console.error)
        .finally(() => setLoadingDietas(false))
    }
    if (abaAtiva === 'treinos' && !fichasCarregadas) {
      setLoadingFichas(true)
      listarFichas({ aluno: id, limit: 50 })
        .then(r => { setFichas(r.list); setFichasCarregadas(true) })
        .catch(console.error)
        .finally(() => setLoadingFichas(false))
    }
    if (abaAtiva === 'composicao' && !avaliacoesCarregadas) {
      setLoadingAvaliacoes(true)
      listarAvaliacoesPorAluno(id)
        .then(list => {
          setAvaliacoes([...list].sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''))))
          setAvaliacoesCarregadas(true)
        })
        .catch(console.error)
        .finally(() => setLoadingAvaliacoes(false))
    }
  }, [abaAtiva, id, dietasCarregadas, fichasCarregadas, avaliacoesCarregadas])

  if (loadingAluno) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner />
      </div>
    )
  }

  if (erroAluno || !aluno) {
    return (
      <div className="p-8">
        <EmptyState
          icon={BarChart2}
          title={erroAluno || 'Aluno não encontrado'}
          description="Volte para a lista e tente novamente"
        />
        <div className="flex justify-center mt-4">
          <Button variant="secondary" icon={ArrowLeft} onClick={() => navigate('/')}>
            Voltar para alunos
          </Button>
        </div>
      </div>
    )
  }

  const idade = calcularIdade(aluno.data_nascimento) ?? aluno.age ?? null
  const iniciais = (aluno.nome_completo || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0])
    .join('')
    .toUpperCase()

  const telefone = (aluno.telefone || '').replace(/\D/g, '')
  const whatsHref = telefone ? `https://wa.me/${telefone.length <= 11 ? '55' + telefone : telefone}` : null

  return (
    <div className="text-white">
      {/* Header sticky */}
      <div className="sticky top-0 z-40 bg-[#1a1a1a]/95 backdrop-blur border-b border-[#323238]">
        <div className="max-w-screen-xl mx-auto px-4 md:px-8 py-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-gray-500 hover:text-white text-xs font-bold uppercase tracking-wide transition-colors mb-3"
          >
            <ArrowLeft size={14} /> Voltar
          </button>

          <div className="flex flex-col md:flex-row md:items-center gap-4">
            {/* Avatar + nome */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {aluno.foto ? (
                <img
                  src={`${FRAPPE_URL}${aluno.foto}`}
                  alt={aluno.nome_completo}
                  className="w-14 h-14 rounded-full object-cover border-2 border-[#323238] shrink-0"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-[#2563eb] flex items-center justify-center text-white font-bold text-lg shrink-0">
                  {iniciais}
                </div>
              )}
              <div className="min-w-0">
                <h1 className="text-white text-lg md:text-xl font-bold truncate">{aluno.nome_completo}</h1>
                <div className="flex items-center gap-3 text-gray-500 text-xs mt-0.5 flex-wrap">
                  {aluno.email && (
                    <span className="flex items-center gap-1 truncate"><Mail size={11} />{aluno.email}</span>
                  )}
                  {aluno.telefone && (
                    <span className="flex items-center gap-1"><Phone size={11} />{aluno.telefone}</span>
                  )}
                  {idade != null && (
                    <span className="flex items-center gap-1"><Cake size={11} />{idade} anos</span>
                  )}
                </div>
              </div>
            </div>

            {/* Badges + ações */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={aluno.enabled ? 'success' : 'default'} size="sm">
                {aluno.enabled ? 'Ativo' : 'Inativo'}
              </Badge>
              {aluno.dieta ? <Badge variant="info" size="sm">Dieta</Badge> : null}
              {aluno.treino ? <Badge variant="purple" size="sm">Treino</Badge> : null}
              {aluno.plan_end && (
                <Badge
                  variant={aluno.plan_end < new Date().toISOString().slice(0, 10) ? 'danger' : 'default'}
                  size="sm"
                >
                  Plano até {fmtData(aluno.plan_end)}
                </Badge>
              )}

              <div className="flex items-center gap-1 ml-1">
                {whatsHref && (
                  <a
                    href={whatsHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Abrir WhatsApp"
                    className="h-9 w-9 flex items-center justify-center text-green-400 hover:text-white hover:bg-green-600 border border-[#323238] hover:border-green-600 rounded-lg transition-colors"
                  >
                    <WhatsAppIcon size={14} />
                  </a>
                )}
                {aluno.instagram && (
                  <a
                    href={`https://instagram.com/${aluno.instagram.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Abrir Instagram"
                    className="h-9 w-9 flex items-center justify-center text-pink-400 hover:text-white hover:bg-pink-600 border border-[#323238] hover:border-pink-600 rounded-lg transition-colors"
                  >
                    <AtSign size={14} />
                  </a>
                )}
                <button
                  onClick={() => navigate(`/cronograma-feedbacks/aluno/${encodeURIComponent(id)}`)}
                  title="Cronograma de feedbacks"
                  className="h-9 w-9 flex items-center justify-center text-[#2563eb] hover:text-white hover:bg-[#2563eb] border border-[#323238] hover:border-[#2563eb] rounded-lg transition-colors"
                >
                  <Calendar size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-3 -mb-px">
            <Tabs
              tabs={TABS.map(t => ({ id: t.id, label: t.label }))}
              active={abaAtiva}
              onChange={setAbaAtiva}
              variant="underline"
            />
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="max-w-screen-xl mx-auto px-4 md:px-8 py-6">
        {abaAtiva === 'perfil' && (
          <TabPerfil aluno={aluno} alunoId={id} />
        )}

        {abaAtiva === 'dietas' && (
          loadingDietas ? <div className="flex justify-center py-12"><Spinner /></div>
            : dietas.length === 0 && dietasCarregadas
              ? <EmptyState icon={BarChart2} title="Sem dietas" description="Nenhuma dieta vinculada a este aluno" />
              : <TabLista
                  itens={dietas}
                  renderItem={(d) => (
                    <>
                      <div>
                        <p className="text-white text-sm font-medium">{d.strategy || '—'}</p>
                        <p className="text-gray-500 text-xs">{fmtData(d.date)} → {fmtData(d.final_date)}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        {d.total_calories > 0 && <span className="text-xs text-orange-400 font-bold">{d.total_calories} kcal</span>}
                        <ChevronRight size={16} className="text-gray-600" />
                      </div>
                    </>
                  )}
                  onClick={(d) => navigate(`/dietas/${d.name}`)}
                />
        )}

        {abaAtiva === 'treinos' && (
          loadingFichas ? <div className="flex justify-center py-12"><Spinner /></div>
            : fichas.length === 0 && fichasCarregadas
              ? <EmptyState icon={BarChart2} title="Sem treinos" description="Nenhuma ficha vinculada a este aluno" />
              : <TabLista
                  itens={fichas}
                  renderItem={(f) => (
                    <>
                      <div>
                        <p className="text-white text-sm font-medium">{f.objetivo || '—'}</p>
                        <p className="text-gray-500 text-xs">{f.nivel || ''} · {fmtData(f.data_de_inicio)} → {fmtData(f.data_de_fim)}</p>
                      </div>
                      <ChevronRight size={16} className="text-gray-600" />
                    </>
                  )}
                  onClick={(f) => navigate(`/fichas/${f.name}`)}
                />
        )}

        {abaAtiva === 'anamnese' && (
          <TabAnamnese
            anamneses={anamneses}
            loading={loadingAnamneses}
            alunoId={id}
            onRecarregar={() => {
              setLoadingAnamneses(true)
              listarAnamneses({ alunoId: id, limit: 50 })
                .then(r => setAnamneses(r.list))
                .catch(console.error)
                .finally(() => setLoadingAnamneses(false))
            }}
          />
        )}

        {abaAtiva === 'composicao' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">
                {avaliacoes.length} avaliaç{avaliacoes.length === 1 ? 'ão' : 'ões'}
              </p>
              <div className="flex items-center gap-2">
                {avaliacoes.length > 0 && (
                  <Button
                    variant="secondary"
                    size="xs"
                    icon={BarChart2}
                    onClick={() => navigate('/avaliacoes', { state: { aluno: { aluno: id, nome_completo: aluno.nome_completo } } })}
                  >
                    Comparar
                  </Button>
                )}
                <Button
                  variant="primary"
                  size="xs"
                  icon={Plus}
                  onClick={() => navigate('/avaliacoes/nova', { state: { aluno: { aluno: id, nome_completo: aluno.nome_completo } } })}
                >
                  Nova Avaliação
                </Button>
              </div>
            </div>

            {loadingAvaliacoes ? (
              <div className="flex justify-center py-12"><Spinner /></div>
            ) : avaliacoes.length === 0 && avaliacoesCarregadas ? (
              <EmptyState
                icon={BarChart2}
                title="Sem avaliações"
                description="Nenhuma avaliação de composição corporal cadastrada para este aluno"
              />
            ) : (
              <div className="border border-[#323238] rounded-lg overflow-hidden divide-y divide-[#323238]/50">
                {avaliacoes.map(av => (
                  <button
                    key={av.name}
                    onClick={() => navigate('/avaliacoes', { state: { aluno: { aluno: av.aluno, nome_completo: av.nome_completo } } })}
                    className="w-full text-left px-3 py-2.5 hover:bg-white/5 transition-colors flex items-center gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-semibold">{fmtData(av.date)}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        {av.weight > 0 && <span className="text-gray-500 text-[10px] font-mono">{Number(av.weight).toFixed(1)} kg</span>}
                        {av.bmi > 0 && <span className="text-gray-500 text-[10px] font-mono">IMC {Number(av.bmi).toFixed(1)}</span>}
                        {av.lean_mass > 0 && <span className="text-emerald-400/80 text-[10px] font-mono">MM {Number(av.lean_mass).toFixed(1)}</span>}
                        {av.fat_mass > 0 && <span className="text-orange-400/80 text-[10px] font-mono">MG {Number(av.fat_mass).toFixed(1)}</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {av.jp7_body_fat > 0 ? (
                        <>
                          <p className="text-[#2563eb] text-sm font-bold">{Number(av.jp7_body_fat).toFixed(1)}%</p>
                          <p className="text-gray-600 text-[9px] uppercase tracking-wider">JP7</p>
                        </>
                      ) : (
                        <span className="text-gray-600 text-[10px]">—</span>
                      )}
                    </div>
                    <ChevronRight size={14} className="text-gray-600 shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
