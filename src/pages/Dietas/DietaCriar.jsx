import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Search, X, UserPlus } from 'lucide-react'
import { criarDieta } from '../../api/dietas'
import { listarAlunos } from '../../api/alunos'
import { Card, Button, PageHeader, Spinner } from '../../components/ui'
import { tw } from '../../styles/tokens'

const ESTRATEGIAS = [
  '01 — Dieta Linear',
  '02 — Dieta Cíclica',
  '03 — Dieta Low Carb',
  '04 — Dieta Cetogênica',
  '05 — Dieta Mediterrânea',
  '06 — Dieta Vegana',
]

const DIAS_SEMANA = [
  'Todos os dias',
  'Dias de treino',
  'Dias de descanso',
  'Segunda a Sexta',
  'Final de semana',
]

export default function DietaCriar() {
  const navigate = useNavigate()
  const [aluno, setAluno] = useState(null)
  const [buscaAluno, setBuscaAluno] = useState('')
  const [sugestoes, setSugestoes] = useState([])
  const [loadingAlunos, setLoadingAlunos] = useState(false)
  const [strategy, setStrategy] = useState('')
  const [weekDays, setWeekDays] = useState('Todos os dias')
  const [date, setDate] = useState('')
  const [finalDate, setFinalDate] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const buscaTimeout = useRef(null)

  useEffect(() => {
    clearTimeout(buscaTimeout.current)
    if (buscaAluno.length < 2) { setSugestoes([]); return }
    buscaTimeout.current = setTimeout(async () => {
      setLoadingAlunos(true)
      try {
        const res = await listarAlunos({ search: buscaAluno, limit: 8 })
        setSugestoes(res.list)
      } catch {} finally { setLoadingAlunos(false) }
    }, 400)
  }, [buscaAluno])

  async function handleCriar() {
    if (!aluno) { setErro('Selecione um aluno.'); return }
    setSalvando(true)
    setErro('')
    try {
      const nova = await criarDieta({
        aluno: aluno.name,
        strategy,
        week_days: weekDays,
        date: date || undefined,
        final_date: finalDate || undefined,
      })
      navigate(`/dietas/${nova.name}`)
    } catch (err) {
      setErro('Erro ao criar dieta. Tente novamente.')
      console.error(err)
    } finally { setSalvando(false) }
  }

  return (
    <div className="p-8 max-w-xl">
      <button onClick={() => navigate('/dietas')} className={`flex items-center gap-2 ${tw.meta} hover:text-white transition-colors text-sm mb-5`}>
        <ArrowLeft size={16} /> Voltar para Dietas
      </button>

      <PageHeader
        title="Nova Dieta"
        description="Preencha os dados básicos para criar a dieta"
      />

      <Card className="p-6 mt-6 space-y-5">

        {/* Busca de aluno */}
        <div className="relative">
          <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1.5">
            Aluno <span className="text-[#850000]">*</span>
          </p>
          {aluno ? (
            <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-[#1a1a1a] border border-[#850000]/40">
              <span className="text-white text-sm">{aluno.nome_completo}</span>
              <button onClick={() => { setAluno(null); setBuscaAluno('') }} className="text-gray-500 hover:text-red-400 transition-colors">
                <X size={14} />
              </button>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  value={buscaAluno}
                  onChange={e => setBuscaAluno(e.target.value)}
                  placeholder="Buscar aluno pelo nome..."
                  className={`${tw.input} pl-9`}
                />
                {loadingAlunos && <Spinner size={14} className="absolute right-3 top-1/2 -translate-y-1/2" />}
              </div>
              {sugestoes.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-[#29292e] border border-[#323238] rounded-lg overflow-hidden shadow-xl">
                  {sugestoes.map(a => (
                    <button key={a.name} onClick={() => { setAluno(a); setSugestoes([]) }}
                      className="w-full text-left px-3 py-2.5 hover:bg-[#323238] text-sm text-white transition-colors border-b border-[#323238] last:border-0">
                      <p className="font-medium">{a.nome_completo}</p>
                      {a.email && <p className="text-gray-500 text-xs">{a.email}</p>}
                    </button>
                  ))}
                </div>
              )}
              {buscaAluno.length >= 2 && !loadingAlunos && sugestoes.length === 0 && (
                <p className="text-gray-600 text-xs mt-1">Nenhum aluno encontrado.</p>
              )}
            </>
          )}
        </div>

        {/* Estratégia */}
        <div>
          <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1.5">Estratégia</p>
          <select
            value={strategy}
            onChange={e => setStrategy(e.target.value)}
            className={`${tw.input} appearance-none`}
          >
            <option value="">Selecionar estratégia...</option>
            {ESTRATEGIAS.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>

        {/* Dias da semana */}
        <div>
          <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1.5">Dias da Semana</p>
          <select
            value={weekDays}
            onChange={e => setWeekDays(e.target.value)}
            className={`${tw.input} appearance-none`}
          >
            {DIAS_SEMANA.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        {/* Datas */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1.5">Data Inicial</p>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className={tw.input} />
          </div>
          <div>
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1.5">Data Final</p>
            <input type="date" value={finalDate} onChange={e => setFinalDate(e.target.value)} className={tw.input} />
          </div>
        </div>

        {erro && <p className="text-red-400 text-sm">{erro}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={() => navigate('/dietas')}>Cancelar</Button>
          <Button variant="primary" icon={UserPlus} onClick={handleCriar} loading={salvando}>
            Criar Dieta
          </Button>
        </div>
      </Card>
    </div>
  )
}
