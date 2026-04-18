import { useState, useEffect } from 'react'
import { X, User, Salad, Dumbbell, Activity, ClipboardList, BarChart2, Phone, Mail, AtSign, Lock, Ruler, Weight } from 'lucide-react'
import client from '../../api/client'

const TABS = [
  { id: 'perfil', label: 'Perfil', icon: User },
  { id: 'dietas', label: 'Dietas', icon: Salad },
  { id: 'fichas', label: 'Fichas de Treino', icon: Dumbbell },
  { id: 'treinos_realizados', label: 'Treinos Realizados', icon: Activity },
  { id: 'anamnese', label: 'Anamnese', icon: ClipboardList },
  { id: 'avaliacoes', label: 'Avaliações', icon: BarChart2 },
]

export default function DetalheAluno({ alunoId, onClose }) {
  const [aluno, setAluno] = useState(null)
  const [tab, setTab] = useState('perfil')
  const [loading, setLoading] = useState(true)
  const [dietas, setDietas] = useState([])
  const [fichas, setFichas] = useState([])
  const [treinos, setTreinos] = useState([])
  const [anamneses, setAnamneses] = useState([])
  const [avaliacoes, setAvaliacoes] = useState([])

  useEffect(() => {
    if (alunoId) {
      setTab('perfil')
      setAluno(null)
      setDietas([]); setFichas([]); setTreinos([]); setAnamneses([]); setAvaliacoes([])
      fetchAluno()
    }
  }, [alunoId])

  useEffect(() => {
    if (!aluno) return
    if (tab === 'dietas' && !dietas.length) fetchDietas()
    if (tab === 'fichas' && !fichas.length) fetchFichas()
    if (tab === 'treinos_realizados' && !treinos.length) fetchTreinos()
    if (tab === 'anamnese' && !anamneses.length) fetchAnamneses()
    if (tab === 'avaliacoes' && !avaliacoes.length) fetchAvaliacoes()
  }, [tab, aluno])

  async function fetchAluno() {
    setLoading(true)
    try {
      const res = await client.get(`/api/resource/Aluno/${alunoId}`)
      setAluno(res.data.data)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  async function fetchDietas() {
    try {
      const res = await client.get('/api/resource/Dieta', {
        params: {
          fields: JSON.stringify(["name","estrategia","data_inicial","data_final","total_kcal","dias_semana"]),
          filters: JSON.stringify([["aluno","=",alunoId]]),
          limit: 50, order_by: 'creation desc'
        }
      })
      setDietas(res.data.data || [])
    } catch {}
  }

  async function fetchFichas() {
    try {
      const res = await client.get('/api/resource/Ficha', {
        params: {
          fields: JSON.stringify(["name","titulo","creation","status"]),
          filters: JSON.stringify([["aluno","=",alunoId]]),
          limit: 50, order_by: 'creation desc'
        }
      })
      setFichas(res.data.data || [])
    } catch {}
  }

  async function fetchTreinos() {
    try {
      const res = await client.get('/api/resource/Treino%20Realizado', {
        params: {
          fields: JSON.stringify(["name","data","ficha"]),
          filters: JSON.stringify([["aluno","=",alunoId]]),
          limit: 50, order_by: 'creation desc'
        }
      })
      setTreinos(res.data.data || [])
    } catch {}
  }

  async function fetchAnamneses() {
    try {
      const res = await client.get('/api/resource/Anamnese', {
        params: {
          fields: JSON.stringify(["name","titulo","status","date"]),
          filters: JSON.stringify([["aluno","=",alunoId]]),
          limit: 20, order_by: 'creation desc'
        }
      })
      setAnamneses(res.data.data || [])
    } catch {}
  }

  async function fetchAvaliacoes() {
    try {
      const res = await client.get('/api/resource/Avaliacao%20da%20Composicao%20Corporal', {
        params: {
          fields: JSON.stringify(["name","data","peso","altura"]),
          filters: JSON.stringify([["aluno","=",alunoId]]),
          limit: 20, order_by: 'creation desc'
        }
      })
      setAvaliacoes(res.data.data || [])
    } catch {}
  }

  if (!alunoId) return null

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/70 z-40 backdrop-blur-sm flex items-center justify-center"
        onClick={onClose}
      >
        {/* Modal centralizado */}
        <div
          className="bg-[#1a1a1a] border border-[#323238] rounded-2xl w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          {loading ? (
            <div className="flex items-center justify-center py-20 text-gray-500">
              Carregando...
            </div>
          ) : aluno ? (
            <>
              {/* Header */}
              <div className="px-6 py-5 flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-[#850000] flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                  {aluno.nome_completo?.slice(0,2).toUpperCase() || '??'}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-bold text-xl truncate">{aluno.nome_completo}</h3>
                  <p className="text-gray-400 text-sm">{aluno.email}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <button className="px-3 py-1.5 rounded-lg border border-[#850000] text-[#850000] hover:bg-[#850000] hover:text-white text-xs font-medium transition-colors">
                    Excluir Aluno
                  </button>
                  <button
                    onClick={onClose}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-[#323238] transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-[#323238] px-6 overflow-x-auto">
                {TABS.map(t => {
                  const Icon = t.icon
                  const active = tab === t.id
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTab(t.id)}
                      className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                        ${active
                          ? 'border-[#850000] text-white'
                          : 'border-transparent text-gray-500 hover:text-gray-300'
                        }`}
                    >
                      <Icon size={14} />
                      {t.label}
                    </button>
                  )
                })}
              </div>

              {/* Conteúdo */}
              <div className="flex-1 overflow-auto p-6">

                {tab === 'perfil' && (
                  <div className="space-y-4">
                    {/* Card principal */}
                    <div className="bg-[#29292e] border border-[#323238] rounded-xl p-5 flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full bg-[#850000] flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                        {aluno.nome_completo?.slice(0,2).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-bold text-base">{aluno.nome_completo}</p>
                        <p className="text-gray-400 text-sm">{aluno.profissão || 'Profissão não informada'}</p>
                        <div className="flex gap-2 mt-2">
                          {aluno.dieta && <span className="text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">DIETA</span>}
                          {aluno.treino && <span className="text-xs px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">TREINO</span>}
                        </div>
                      </div>
                    </div>

                    {/* Contato e Corpo */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-[#29292e] border border-[#323238] rounded-xl p-4 space-y-3">
                        <p className="text-gray-500 text-xs font-semibold tracking-wider">CONTATO</p>
                        <InfoRow icon={<User size={15} />} label="Profissão" value={aluno.profissão} />
                        <InfoRow icon={<Mail size={15} />} label="E-mail" value={aluno.email} />
                        <InfoRow icon={<Phone size={15} />} label="Telefone" value={aluno.telefone} />
                        <InfoRow icon={<AtSign size={15} />} label="Instagram" value={aluno.instagram} />
                        <InfoRow icon={<Lock size={15} />} label="Senha de Acesso" value={aluno.senha_de_acesso} />
                      </div>
                      <div className="bg-[#29292e] border border-[#323238] rounded-xl p-4 space-y-3">
                        <p className="text-gray-500 text-xs font-semibold tracking-wider">CORPO</p>
                        <InfoRow icon={<User size={15} />} label="Sexo" value={aluno.sexo} />
                        <InfoRow icon={<User size={15} />} label="Idade" value={aluno.age ? `${aluno.age} anos` : null} />
                        <InfoRow icon={<Weight size={15} />} label="Peso" value={aluno.weight ? `${aluno.weight} kg` : null} />
                        <InfoRow icon={<Ruler size={15} />} label="Altura" value={aluno.height ? `${aluno.height} cm` : null} />
                      </div>
                    </div>

                    {aluno.orientacoes_globais && (
                      <div className="bg-[#29292e] border border-[#323238] rounded-xl p-4">
                        <p className="text-gray-500 text-xs font-semibold tracking-wider mb-2">ORIENTAÇÕES GLOBAIS</p>
                        <p className="text-gray-200 text-sm leading-relaxed">{aluno.orientacoes_globais}</p>
                      </div>
                    )}
                  </div>
                )}

                {tab === 'dietas' && (
                  <ListaSimples items={dietas} vazio="Nenhuma dieta vinculada."
                    renderItem={d => (
                      <div key={d.name} className="bg-[#29292e] border border-[#323238] rounded-xl p-4 flex items-start justify-between">
                        <div>
                          <p className="text-white font-medium text-sm">{d.estrategia || d.name}</p>
                          <p className="text-gray-500 text-xs mt-1">{d.dias_semana}</p>
                          {(d.data_inicial || d.data_final) && (
                            <p className="text-gray-600 text-xs mt-1">
                              {d.data_inicial && new Date(d.data_inicial).toLocaleDateString('pt-BR')}
                              {d.data_final && ` → ${new Date(d.data_final).toLocaleDateString('pt-BR')}`}
                            </p>
                          )}
                        </div>
                        {d.total_kcal && (
                          <span className="text-xs px-2 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            {d.total_kcal} kcal
                          </span>
                        )}
                      </div>
                    )}
                  />
                )}

                {tab === 'fichas' && (
                  <ListaSimples items={fichas} vazio="Nenhuma ficha de treino vinculada."
                    renderItem={f => (
                      <div key={f.name} className="bg-[#29292e] border border-[#323238] rounded-xl p-4 flex items-center justify-between">
                        <div>
                          <p className="text-white font-medium text-sm">{f.titulo || f.name}</p>
                          <p className="text-gray-500 text-xs mt-1">{new Date(f.creation).toLocaleDateString('pt-BR')}</p>
                        </div>
                        {f.status && (
                          <span className="text-xs px-2 py-1 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">{f.status}</span>
                        )}
                      </div>
                    )}
                  />
                )}

                {tab === 'treinos_realizados' && (
                  <ListaSimples items={treinos} vazio="Nenhum treino realizado registrado."
                    renderItem={t => (
                      <div key={t.name} className="bg-[#29292e] border border-[#323238] rounded-xl p-4">
                        <p className="text-white font-medium text-sm">
                          {t.data ? new Date(t.data).toLocaleDateString('pt-BR') : t.name}
                        </p>
                        {t.ficha && <p className="text-gray-500 text-xs mt-1">Ficha: {t.ficha}</p>}
                      </div>
                    )}
                  />
                )}

                {tab === 'anamnese' && (
                  <ListaSimples items={anamneses} vazio="Nenhuma anamnese vinculada."
                    renderItem={a => (
                      <div key={a.name} className="bg-[#29292e] border border-[#323238] rounded-xl p-4 flex items-center justify-between">
                        <div>
                          <p className="text-white font-medium text-sm">{a.titulo || a.name}</p>
                          <p className="text-gray-500 text-xs mt-1">{a.date && new Date(a.date).toLocaleDateString('pt-BR')}</p>
                        </div>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${
                          a.status === 'Respondido' ? 'bg-green-500/10 text-green-400 border-green-500/30'
                          : a.status === 'Enviado' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
                          : 'bg-gray-500/10 text-gray-400 border-gray-500/30'
                        }`}>{a.status}</span>
                      </div>
                    )}
                  />
                )}

                {tab === 'avaliacoes' && (
                  <ListaSimples items={avaliacoes} vazio="Nenhuma avaliação corporal registrada."
                    renderItem={a => (
                      <div key={a.name} className="bg-[#29292e] border border-[#323238] rounded-xl p-4">
                        <p className="text-white font-medium text-sm">
                          {a.data ? new Date(a.data).toLocaleDateString('pt-BR') : a.name}
                        </p>
                        <div className="flex gap-4 mt-2">
                          {a.peso && <p className="text-gray-400 text-xs">Peso: <span className="text-white">{a.peso} kg</span></p>}
                          {a.altura && <p className="text-gray-400 text-xs">Altura: <span className="text-white">{a.altura} cm</span></p>}
                        </div>
                      </div>
                    )}
                  />
                )}

              </div>
            </>
          ) : (
            <div className="flex items-center justify-center py-20 text-gray-500">Erro ao carregar.</div>
          )}
        </div>
      </div>
    </>
  )
}

function InfoRow({ icon, label, value }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-gray-600 flex-shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-gray-500 text-xs">{label}</p>
        <p className="text-white text-sm font-medium truncate">{value || '—'}</p>
      </div>
    </div>
  )
}

function ListaSimples({ items, vazio, renderItem }) {
  if (!items.length) return (
    <div className="text-center text-gray-500 py-16 text-sm">{vazio}</div>
  )
  return <div className="space-y-2">{items.map(renderItem)}</div>
}