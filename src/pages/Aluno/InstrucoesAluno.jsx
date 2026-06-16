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
            <div className="rounded-[var(--sf-radius-card)] border border-[var(--sf-border-strong)] overflow-hidden divide-y divide-[var(--sf-border-strong)]">
              {instrucoes.map((ins) => (
                <button
                  key={ins.name}
                  onClick={() => navigate(`/aluno/instrucoes/${ins.name}`)}
                  className="w-full flex items-center gap-3 px-4 py-4 text-left bg-[var(--sf-card)] hover:bg-[var(--sf-surface-2)] transition-colors"
                >
                  <div className="h-9 w-9 rounded-xl bg-[var(--sf-surface-2)] border border-[var(--sf-border)] flex items-center justify-center shrink-0">
                    <BookOpen size={16} className="text-[var(--sf-blue-light)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm truncate">{ins.titulo || 'Instrução'}</p>
                    {ins.descricao
                      ? <p className="text-[var(--sf-text-muted)] text-xs mt-0.5 truncate">{ins.descricao}</p>
                      : ins.tipo && <p className="text-[var(--sf-text-muted)] text-xs mt-0.5">{ins.tipo}</p>}
                  </div>
                  <ChevronRight size={16} className="text-[var(--sf-text-muted)] shrink-0" />
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
