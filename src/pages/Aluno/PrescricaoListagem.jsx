import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Calendar, ChevronRight, Pill } from 'lucide-react'
import { Spinner } from '../../components/ui'
import { AlunoCard, SectionHeader } from '../../components/aluno'
import { listarPrescricoesAluno } from '../../api/aluno'
import useErrorModal from '../../hooks/useErrorModal'

const fmtDataBR = (d) => {
  if (!d) return ''
  const partes = String(d).split(/[T ]/)[0].split('-')
  return `${partes[2]}/${partes[1]}/${partes[0]}`
}

const primeiraLinha = (texto) => {
  if (!texto) return 'Emitida pelo profissional'
  const linha = String(texto).split('\n').map(s => s.trim()).find(Boolean)
  return linha || 'Emitida pelo profissional'
}

function BadgeStatus({ ativa }) {
  return ativa ? (
    <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md bg-green-500/15 border border-green-500/40 text-green-400">
      Ativa
    </span>
  ) : (
    <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md bg-gray-500/15 border border-gray-500/40 text-gray-400">
      Expirada
    </span>
  )
}

export default function PrescricaoListagem() {
  const navigate = useNavigate()
  const errorModal = useErrorModal()
  const errorModalRef = useRef(errorModal)
  useEffect(() => { errorModalRef.current = errorModal }, [errorModal])

  const [prescricoes, setPrescricoes] = useState([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    let cancelado = false
    listarPrescricoesAluno()
      .then(list => { if (!cancelado) setPrescricoes(list) })
      .catch(err => !cancelado && errorModalRef.current.show(err, 'Prescrições'))
      .finally(() => !cancelado && setCarregando(false))
    return () => { cancelado = true }
  }, [])

  return (
    <div className="pb-8 bg-[#050507] min-h-full">
      {errorModal.element}

      <div className="px-4 pt-4 pb-3 border-b border-[#1c1c22] bg-[#050507]/95 backdrop-blur-sm sticky top-0 z-10 flex items-center gap-3">
        <button
          onClick={() => navigate('/aluno')}
          title="Voltar"
          className="h-9 w-9 flex items-center justify-center text-gray-400 hover:text-white border border-[#1f1f24] hover:border-[#2563eb] rounded-lg transition-colors shrink-0"
        >
          <ArrowLeft size={16} />
        </button>
        <h1 className="text-white text-base font-bold">Prescrições</h1>
      </div>

      <div className="px-4 pt-4">
        <SectionHeader
          icon={<Pill size={15} />}
          label="Suas prescrições"
        />

        {carregando ? (
          <div className="h-32 flex items-center justify-center"><Spinner /></div>
        ) : prescricoes.length === 0 ? (
          <AlunoCard as="div" className="px-4 py-6 flex flex-col items-center text-center">
            <Pill size={28} className="text-gray-700 mb-2" />
            <p className="text-gray-500 text-sm">Você ainda não tem prescrições.</p>
          </AlunoCard>
        ) : (
          <div className="flex flex-col gap-3">
            {prescricoes.map(p => (
              <AlunoCard
                key={p.name}
                as="button"
                onClick={() => navigate(`/aluno/prescricoes/${p.name}`)}
                className="px-4 py-4 flex items-center gap-4 text-left w-full"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-white text-sm font-bold">Prescrição</span>
                    <BadgeStatus ativa={!!p.ativa} />
                  </div>
                  <p className="text-gray-400 text-xs leading-relaxed line-clamp-2">
                    {primeiraLinha(p.description)}
                  </p>
                  <p className="text-gray-500 text-[11px] mt-2 flex items-center gap-1.5">
                    <Calendar size={11} />
                    {fmtDataBR(p.date)}
                  </p>
                </div>
                <ChevronRight size={18} className="text-gray-600 shrink-0" />
              </AlunoCard>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
