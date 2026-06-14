import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, Images, Search, ChevronRight } from 'lucide-react'
import { Spinner, Input, EmptyState } from '../../components/ui'
import { listarAlunos } from '../../api/alunos'
import useErrorModal from '../../hooks/useErrorModal'

// Telas de "Acompanhamento": Peso do Aluno e Fotos do Aluno. Cada uma lista os
// alunos do profissional; ao clicar, abre a evolução (só peso ou só fotos) do aluno.
const CONFIG = {
  peso:  { titulo: 'Peso do Aluno',  sub: 'Escolha um aluno para ver a evolução de peso',  icon: TrendingUp, base: '/evolucao/peso' },
  fotos: { titulo: 'Fotos do Aluno', sub: 'Escolha um aluno para comparar as fotos',        icon: Images,     base: '/evolucao/fotos' },
}

export default function EvolucaoListaAlunos({ mode = 'peso' }) {
  const cfg = CONFIG[mode] || CONFIG.peso
  const Icon = cfg.icon
  const navigate = useNavigate()
  const [alunos, setAlunos] = useState([])
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(true)
  const errorModal = useErrorModal()
  const debounceRef = useRef()

  const carregar = (search = '') => {
    setLoading(true)
    listarAlunos({ search, enabled: 1, limit: 50 })
      .then(({ list }) => setAlunos(list || []))
      .catch((e) => errorModal.show(e, 'Carregar alunos'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { carregar() }, [])

  const onBusca = (v) => {
    setBusca(v)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => carregar(v), 400)
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
      {errorModal.element}
      <div>
        <h1 className="flex items-center gap-2 text-white text-lg font-bold"><Icon size={18} className="text-[#2563eb]" /> {cfg.titulo}</h1>
        <p className="text-gray-500 text-xs mt-0.5">{cfg.sub}</p>
      </div>

      <Input value={busca} onChange={onBusca} placeholder="Buscar aluno pelo nome..." icon={Search} />

      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : alunos.length === 0 ? (
        <EmptyState icon={Icon} title="Nenhum aluno encontrado" description="Ajuste a busca ou cadastre alunos." />
      ) : (
        <div className="space-y-1.5">
          {alunos.map((a) => (
            <button
              key={a.name}
              onClick={() => navigate(`${cfg.base}/${encodeURIComponent(a.name)}`)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-[#1a1a1a] border border-[#323238] hover:border-[#2563eb]/60 hover:bg-[#1e1e22] text-left transition-colors"
            >
              <span className="h-9 w-9 rounded-full bg-[#2563eb]/15 border border-[#2563eb]/30 flex items-center justify-center text-[#60A5FA] text-xs font-bold shrink-0">
                {(a.nome_completo || '?').trim().charAt(0).toUpperCase()}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-semibold truncate">{a.nome_completo}</p>
                {a.email && <p className="text-gray-500 text-xs truncate">{a.email}</p>}
              </div>
              <ChevronRight size={16} className="text-gray-600 shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
