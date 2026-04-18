import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Trash2, ChevronRight, X } from 'lucide-react'
import DetalheAluno from './DetalheAluno'
import client from '../../api/client'

const PER_PAGE = 20

export default function HubAlunos() {
    const navigate = useNavigate()
    const [alunos, setAlunos] = useState([])
    const [loading, setLoading] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const [busca, setBusca] = useState('')
    const [page, setPage] = useState(0)
    const [hasMore, setHasMore] = useState(true)
    const [anamnesePorAluno, setAnamnesePorAluno] = useState({})
    const searchTimeout = useRef(null)
    const [alunoSelecionado, setAlunoSelecionado] = useState(null)

    useEffect(() => {
        carregarAlunos(0, '', true)
    }, [])

    async function carregarAlunos(pageNum, search, reset) {
        try {
            if (reset) setLoading(true)
            else setLoadingMore(true)

            const params = {
                fields: JSON.stringify(["name", "nome_completo", "email", "telefone", "foto", "enabled", "dieta", "treino", "creation"]),
                limit: search ? 500 : PER_PAGE,
                limit_start: search ? 0 : pageNum * PER_PAGE,
                order_by: 'creation desc',
            }
            if (search) {
                params.filters = JSON.stringify([["nome_completo", "like", `%${search}%`]])
            }

            const res = await client.get('/api/resource/Aluno', { params })
            const lista = res.data.data || []

            if (reset || search) {
                setAlunos(lista)
                setPage(0)
            } else {
                setAlunos(prev => [...prev, ...lista])
                setPage(pageNum)
            }

            setHasMore(!search && lista.length === PER_PAGE)
            carregarAnamneses(lista.map(a => a.name))
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
            setLoadingMore(false)
        }
    }

    async function carregarAnamneses(ids) {
        if (!ids.length) return
        try {
            const res = await client.get('/api/resource/Anamnese', {
                params: {
                    fields: JSON.stringify(["name", "aluno", "status"]),
                    filters: JSON.stringify([["aluno", "in", ids]]),
                    limit: 200
                }
            })
            const map = {}
            for (const a of res.data.data || []) {
                if (!map[a.aluno]) map[a.aluno] = []
                map[a.aluno].push(a)
            }
            setAnamnesePorAluno(prev => ({ ...prev, ...map }))
        } catch { }
    }

    function onBusca(e) {
        const val = e.target.value
        setBusca(val)
        clearTimeout(searchTimeout.current)
        searchTimeout.current = setTimeout(() => {
            carregarAlunos(0, val, true)
        }, 400)
    }

    async function excluirAluno(name, e) {
        e.stopPropagation()
        if (!confirm('Tem certeza que deseja excluir este aluno?')) return
        try {
            await client.delete(`/api/resource/Aluno/${name}`)
            setAlunos(prev => prev.filter(a => a.name !== name))
        } catch {
            alert('Erro ao excluir. Verifique as permissões.')
        }
    }

    function getAnamnese(alunoId) {
        const lista = anamnesePorAluno[alunoId] || []
        if (!lista.length) return null
        return lista.find(a => a.status === 'Respondido') ? 'respondido'
            : lista.find(a => a.status === 'Enviado') ? 'enviado'
                : 'pendente'
    }

    return (
        <div className="p-8">

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-white text-2xl font-bold">Hub de Alunos</h2>
                    <p className="text-gray-400 text-sm mt-1">
                        Hub central dos seus pacientes · mais recentes primeiro
                        {!loading && <span className="ml-2 text-gray-600">({alunos.length} exibidos)</span>}
                    </p>
                </div>
                <button
                    onClick={() => navigate('/alunos/novo')}
                    className="bg-[#850000] hover:bg-red-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
                >
                    + Novo Aluno
                </button>
            </div>

            {/* Busca */}
            <div className="relative mb-6">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                    value={busca}
                    onChange={onBusca}
                    placeholder="Buscar por nome... (busca em todos os alunos)"
                    className="w-full bg-[#29292e] border border-[#323238] rounded-xl pl-10 pr-10 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#850000] transition-colors"
                />
                {busca && (
                    <button
                        onClick={() => { setBusca(''); carregarAlunos(0, '', true) }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                    >
                        <X size={14} />
                    </button>
                )}
            </div>

            {/* Lista */}
            {loading ? (
                <div className="text-center text-gray-500 py-20">Carregando alunos...</div>
            ) : (
                <div className="space-y-2">
                    {alunos.map(aluno => {
                        const anamnese = getAnamnese(aluno.name)
                        return (
                            <div
                                key={aluno.name}
                                onClick={() => setAlunoSelecionado(aluno.name)}
                                className="bg-[#29292e] border border-[#323238] rounded-xl px-5 py-4 flex items-center gap-4 hover:border-[#850000]/50 hover:bg-[#2f2f34] transition-all cursor-pointer group"
                            >
                                {/* Avatar */}
                                {aluno.foto ? (
                                    <img src={aluno.foto} className="w-10 h-10 rounded-full object-cover flex-shrink-0 border-2 border-[#323238]" />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-[#850000] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                        {aluno.nome_completo?.slice(0, 2).toUpperCase() || '??'}
                                    </div>
                                )}

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-white font-semibold text-sm truncate">
                                        {aluno.nome_completo || aluno.name}
                                    </p>
                                    <p className="text-gray-400 text-xs truncate">{aluno.email}</p>
                                    {aluno.telefone && (
                                        <p className="text-gray-500 text-xs">{aluno.telefone}</p>
                                    )}
                                    <div className="flex gap-1.5 mt-2 flex-wrap">
                                        {aluno.dieta ? (
                                            <span className="text-xs px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">DIETA</span>
                                        ) : null}
                                        {aluno.treino ? (
                                            <span className="text-xs px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20 font-medium">TREINO</span>
                                        ) : null}
                                        {anamnese === 'respondido' && (
                                            <span className="text-xs px-2 py-0.5 rounded-md bg-green-500/10 text-green-400 border border-green-500/20 font-medium">✓ ANAMNESE</span>
                                        )}
                                        {anamnese === 'enviado' && (
                                            <span className="text-xs px-2 py-0.5 rounded-md bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 font-medium">⏳ ANAMNESE</span>
                                        )}
                                    </div>
                                </div>

                                {/* Ações */}
                                <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                                    <button
                                        title="Excluir aluno"
                                        onClick={(e) => excluirAluno(aluno.name, e)}
                                        className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                    >
                                        <Trash2 size={15} />
                                    </button>
                                    <ChevronRight size={16} className="text-gray-600 group-hover:text-gray-400 transition-colors" />
                                </div>
                            </div>
                        )
                    })}

                    {hasMore && !busca && (
                        <button
                            onClick={() => carregarAlunos(page + 1, '', false)}
                            disabled={loadingMore}
                            className="w-full py-3.5 text-gray-400 hover:text-white border border-[#323238] hover:border-[#850000]/40 rounded-xl transition-colors text-sm mt-2 disabled:opacity-50"
                        >
                            {loadingMore ? 'Carregando...' : 'Carregar mais alunos'}
                        </button>
                    )}

                    {alunos.length === 0 && (
                        <div className="text-center text-gray-500 py-16">
                            <p className="text-sm">Nenhum aluno encontrado.</p>
                        </div>
                    )}
                </div>
            )}
            <DetalheAluno
                alunoId={alunoSelecionado}
                onClose={() => setAlunoSelecionado(null)}
            />
        </div>
    )
}