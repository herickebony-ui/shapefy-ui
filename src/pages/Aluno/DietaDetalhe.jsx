import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Printer, Apple, Info, Leaf, AlertCircle } from 'lucide-react'
import { Spinner } from '../../components/ui'
import { GlassCard, SectionHeader, ActionButton } from '../../components/aluno'
import { buscarDietaAluno } from '../../api/aluno'
import useErrorModal from '../../hooks/useErrorModal'

const FRAPPE_URL = import.meta.env.VITE_FRAPPE_URL || ''

const fmtQtd = (item) => {
  const w = item.weight
  const u = (item.unit || '').trim()
  if (w === null || w === undefined || w === '') return u || ''
  return u ? `${w} ${u}` : String(w)
}

const linhaSub = (s) => {
  const qtd = fmtQtd(s)
  return qtd ? `${s.food}: ${qtd}` : s.food
}

export default function DietaDetalhe() {
  const { name } = useParams()
  const navigate = useNavigate()
  const errorModal = useErrorModal()
  const errorModalRef = useRef(errorModal)
  useEffect(() => { errorModalRef.current = errorModal }, [errorModal])

  const [data, setData] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    let cancelado = false
    buscarDietaAluno(name)
      .then(res => { if (!cancelado) setData(res) })
      .catch(err => {
        if (cancelado) return
        if (err.response?.status === 403) {
          setErro('Voce nao tem permissao para acessar essa dieta.')
        } else {
          errorModalRef.current.show(err, 'Dieta')
        }
      })
      .finally(() => !cancelado && setCarregando(false))
    return () => { cancelado = true }
  }, [name])

  if (carregando) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-[var(--sf-bg)]">
        {errorModal.element}
        <Spinner />
      </div>
    )
  }

  if (erro) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-6 bg-[var(--sf-bg)]">
        <div className="sf-card flex items-center gap-3 px-5 py-4 max-w-sm w-full">
          <AlertCircle size={18} className="text-[var(--sf-cyan)] shrink-0" />
          <span className="text-[var(--sf-text)] text-sm">{erro}</span>
        </div>
      </div>
    )
  }

  if (!data?.dieta) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-6 bg-[var(--sf-bg)]">
        {errorModal.element}
      </div>
    )
  }

  const { dieta, meals = [] } = data
  const abrirPDF = () => {
    const token = localStorage.getItem('aluno_token') || ''
    const url = `${FRAPPE_URL}/print/dieta?name=${encodeURIComponent(dieta.name)}${token ? `&token=${encodeURIComponent(token)}` : ''}`
    window.open(url, '_blank', 'noopener')
  }

  return (
    <div className="pb-8 bg-[var(--sf-bg)] min-h-full">
      {errorModal.element}

      <div className="px-4 pt-4 pb-3 border-b border-[var(--sf-border)] bg-[var(--sf-bg)]/95 backdrop-blur-sm sticky top-0 z-10 flex items-center gap-3">
        <button
          onClick={() => navigate('/aluno/dietas')}
          title="Voltar"
          className="h-9 w-9 flex items-center justify-center text-gray-400 hover:text-white border border-[var(--sf-border)] hover:border-[var(--sf-border-strong)] rounded-lg transition-colors shrink-0"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-white text-base font-bold truncate">Minha Dieta</h1>
          <p className="text-[var(--sf-text-soft)] text-xs truncate">
            {dieta.strategy || 'Dieta'}
            {dieta.week_days ? ` · ${dieta.week_days}` : ''}
          </p>
        </div>
      </div>

      <div className="px-3 pt-3 space-y-3">
        <ActionButton variant="ghost" fullWidth icon={Printer} onClick={abrirPDF}>
          Baixar PDF da Dieta
        </ActionButton>
        {dieta.obs && (
          <GlassCard as="div" variant="default" className="overflow-hidden">
            <div className="border-l-2 border-[#2563EB] px-4 py-3 bg-[#2563EB]/[0.08] flex items-center gap-2">
              <Info size={14} className="text-[#60A5FA]" />
              <p
                className="text-[#60A5FA] text-xs font-bold uppercase"
                style={{ letterSpacing: '0.18em' }}
              >
                Observações
              </p>
            </div>
            <p className="px-4 py-3 text-gray-300 text-sm leading-relaxed whitespace-pre-line">
              {dieta.obs}
            </p>
          </GlassCard>
        )}

        {dieta.general_description && (
          <GlassCard as="div" variant="default" className="overflow-hidden">
            <div className="border-l-2 border-[#22C55E] px-4 py-3 bg-[#22C55E]/[0.08] flex items-center gap-2">
              <Leaf size={14} className="text-[#4ADE80]" />
              <p
                className="text-[#4ADE80] text-xs font-bold uppercase"
                style={{ letterSpacing: '0.18em' }}
              >
                Orientações gerais
              </p>
            </div>
            <p className="px-4 py-3 text-gray-300 text-sm leading-relaxed whitespace-pre-line">
              {dieta.general_description}
            </p>
          </GlassCard>
        )}

        {meals.length > 0 && (
          <>
            <SectionHeader
              icon={<Apple size={15} />}
              label="Plano de refeições"
            />

            <div className="space-y-3">
              {meals.map(meal => (
                <GlassCard key={meal.index} as="div" className="overflow-hidden">
                  <div className="border-l-2 border-[#2563EB] px-4 py-3 bg-[#2563EB]/[0.08]">
                    <p className="text-white text-sm font-bold">{meal.title}</p>
                  </div>
                  <div className="divide-y divide-[var(--sf-border)]">
                    {(meal.options || []).map(option => (
                      <div key={option.index} className="px-4 py-3 space-y-3">
                        <p
                          className="text-[#38BDF8] text-[11px] font-bold uppercase"
                          style={{ letterSpacing: '0.18em' }}
                        >
                          {option.title}
                        </p>

                        <ul className="space-y-2.5">
                          {(option.groups || []).map((g, i) => {
                            const m = g.main || {}
                            const qtd = fmtQtd(m)
                            const subs = (g.subs || []).map(linhaSub)
                            return (
                              <li key={i} className="text-sm">
                                <div className="flex gap-2 text-white leading-snug">
                                  <span className="text-[#60A5FA] shrink-0">•</span>
                                  <span className="flex-1">
                                    <span className="font-semibold">{m.food}</span>
                                    {qtd && <span>: {qtd}</span>}
                                    {m.medida_caseira && (
                                      <span className="text-[var(--sf-text-muted)]"> ({m.medida_caseira})</span>
                                    )}
                                  </span>
                                </div>
                                {subs.length > 0 && (
                                  <p className="pl-5 mt-1 text-[var(--sf-text-muted)] text-xs leading-relaxed">
                                    {subs.map(s => `ou ${s}`).join(' ')}
                                  </p>
                                )}
                                {m.notes && (
                                  <p className="pl-5 mt-1 text-[var(--sf-text-soft)] text-[11px] italic">
                                    {m.notes}
                                  </p>
                                )}
                              </li>
                            )
                          })}
                        </ul>

                        {option.legend && (
                          <div className="rounded-xl border border-[#F59E0B]/30 bg-[#F59E0B]/[0.08] px-3 py-2 flex gap-2">
                            <span
                              className="text-[#FBBF24] text-[10px] font-bold uppercase shrink-0 pt-0.5"
                              style={{ letterSpacing: '0.18em' }}
                            >
                              Obs
                            </span>
                            <p className="text-gray-300 text-xs leading-relaxed whitespace-pre-line">
                              {option.legend}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </GlassCard>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
