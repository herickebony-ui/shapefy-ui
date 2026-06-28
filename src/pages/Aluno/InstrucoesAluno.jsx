import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, BookOpen, AlertCircle, ChevronRight } from 'lucide-react'
import { Spinner } from '../../components/ui'
import { GlassCard, SectionHeader, AlertCard } from '../../components/aluno'
import { buscarInstrucoesAluno } from '../../api/aluno'

export default function InstrucoesAluno() {
  const navigate = useNavigate()
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)
  const [instrucoes, setInstrucoes] = useState([])

  useEffect(() => {
    let vivo = true
    buscarInstrucoesAluno()
      .then((lista) => { if (vivo) setInstrucoes(Array.isArray(lista) ? lista : []) })
      .catch((e) => { if (vivo) setErro(e?.message || 'Erro ao carregar instruções') })
      .finally(() => { if (vivo) setCarregando(false) })
    return () => { vivo = false }
  }, [])

  return (
    <div className="pb-8 bg-[var(--sf-bg)] min-h-full">
      <div className="px-4 pt-4 pb-3 border-b border-[var(--sf-border)] bg-[var(--sf-bg)]/95 backdrop-blur-sm sticky top-0 z-10 flex items-center gap-3">
        <button
          onClick={() => navigate('/aluno')}
          title="Voltar"
          className="h-9 w-9 flex items-center justify-center text-gray-400 hover:text-white border border-[var(--sf-border)] hover:border-[var(--sf-border-strong)] rounded-lg transition-colors shrink-0"
        >
          <ArrowLeft size={16} />
        </button>
        <h1 className="text-white text-base font-bold">Instruções iniciais</h1>
      </div>

      <div className="px-4 pt-4">
        {carregando ? (
          <div className="h-40 flex items-center justify-center"><Spinner /></div>
        ) : erro ? (
          <AlertCard variant="danger" titulo={erro} icon={<AlertCircle size={18} />} />
        ) : instrucoes.length === 0 ? (
          <GlassCard as="div" className="px-4 py-8 flex flex-col items-center text-center">
            <BookOpen size={26} className="text-[var(--sf-text-muted)] mb-2" />
            <p className="text-[var(--sf-text-soft)] text-sm">Nenhuma instrução disponível no momento.</p>
          </GlassCard>
        ) : (
          <>
            <SectionHeader icon={<BookOpen size={15} />} label="Suas instruções" />
            <div className="flex flex-col gap-3">
              {instrucoes.map((ins) => (
                <GlassCard
                  key={ins.name}
                  as="button"
                  onClick={() => navigate(`/aluno/instrucoes/${ins.name}`)}
                  className="px-4 py-4 flex items-start gap-3"
                >
                  <div className="w-11 h-11 rounded-xl border border-[var(--sf-border-strong)] bg-[var(--sf-surface-2)] flex items-center justify-center text-[#60A5FA] shrink-0 shadow-[0_0_10px_rgba(37,99,235,0.25)]">
                    <BookOpen size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-bold truncate">{ins.titulo || 'Instrução'}</p>
                    {(ins.descricao || ins.tipo) && (
                      <p className="text-[var(--sf-text-muted)] text-xs mt-1 truncate">
                        {ins.descricao || ins.tipo}
                      </p>
                    )}
                  </div>
                  <ChevronRight size={16} className="text-[var(--sf-text-soft)] shrink-0 mt-1" />
                </GlassCard>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
