import { useState, useEffect } from 'react'
import { CreditCard, Calendar, CheckCircle, XCircle } from 'lucide-react'
import { buscarAssinatura, buscarPlano, listarFaturas } from '../../api/assinatura'
import useAuthStore from '../../store/authStore'
import { Badge, Spinner, EmptyState } from '../../components/ui'
import ListPage from '../../components/templates/ListPage'

const fmtDate = (d) => {
  if (!d) return '—'
  const [y, m, day] = String(d).split('-')
  return `${day}/${m}/${y}`
}

const StatusBadge = ({ status }) => {
  if (!status) return null
  const ativo = status.toLowerCase() === 'ativo' || status.toLowerCase() === 'active'
  return <Badge variant={ativo ? 'success' : 'danger'}>{status}</Badge>
}

const FATURA_STATUS_VARIANT = { pago: 'success', pendente: 'warning', recusado: 'danger' }

const FaturaStatusBadge = ({ status }) => {
  if (!status) return null
  const variant = FATURA_STATUS_VARIANT[status.toLowerCase()] || 'default'
  return <Badge variant={variant}>{status}</Badge>
}

export default function MinhaAssinatura() {
  const user = useAuthStore((s) => s.user)
  const [loading, setLoading] = useState(true)
  const [assinatura, setAssinatura] = useState(null)
  const [plano, setPlano] = useState(null)
  const [faturas, setFaturas] = useState([])

  useEffect(() => {
    const carregar = async () => {
      setLoading(true)
      try {
        const sub = await buscarAssinatura()
        setAssinatura(sub)
        if (sub?.plano_de_assinatura) {
          const [p, f] = await Promise.all([
            buscarPlano(sub.plano_de_assinatura),
            listarFaturas(sub.name).catch(() => []),
          ])
          setPlano(p)
          setFaturas(f)
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    carregar()
  }, [])

  return (
    <ListPage
      title="Minha Assinatura"
      subtitle="Informações do seu plano ativo"
      loading={loading}
      empty={!loading && !assinatura ? {
        title: 'Nenhuma assinatura encontrada',
        description: 'Entre em contato com o suporte para mais informações.',
      } : null}
    >
      {!loading && assinatura && (
        <div className="px-4 md:px-6 pb-6 space-y-4">
          {/* Card principal */}
          <div className="bg-[#29292e] border border-[#323238] rounded-lg overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-brand to-[#a00000] px-5 py-4">
              <p className="text-white/80 text-xs font-medium uppercase tracking-wide">Conta</p>
              <p className="text-white font-bold text-base mt-0.5 truncate">{user}</p>
            </div>

            {/* Info grid */}
            <div className="p-5 grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-500 text-xs">Plano</p>
                <p className="text-white font-semibold text-sm mt-0.5">
                  {assinatura.plano_de_assinatura || '—'}
                </p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Status</p>
                <div className="mt-0.5">
                  <StatusBadge status={assinatura.status} />
                </div>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Data de Início</p>
                <p className="text-white text-sm mt-0.5">{fmtDate(assinatura.valido_de)}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Data de Expiração</p>
                <p className="text-white text-sm mt-0.5">{fmtDate(assinatura.valido_ate)}</p>
              </div>
              {plano?.limite_de_alunos_ativos != null && (
                <div className="col-span-2">
                  <p className="text-gray-500 text-xs">Limite de Alunos Ativos</p>
                  <p className="text-white font-semibold text-sm mt-0.5">{plano.limite_de_alunos_ativos}</p>
                </div>
              )}
            </div>

            {/* Características do plano */}
            {plano && (
              <div className="border-t border-[#323238] px-5 py-4">
                <p className="text-white font-semibold text-sm mb-3">Características do Plano</p>
                <div className="flex flex-wrap gap-4">
                  {[
                    { key: 'dieta', label: 'Dieta' },
                    { key: 'treino', label: 'Treino' },
                    { key: 'feedback', label: 'Feedback' },
                    { key: 'anamnese', label: 'Anamnese' },
                  ].map(({ key, label }) => {
                    if (plano[key] == null) return null
                    const ativo = plano[key] === 1 || plano[key] === true
                    return (
                      <div key={key} className="flex items-center gap-1.5">
                        {ativo
                          ? <CheckCircle size={14} className="text-green-400" />
                          : <XCircle size={14} className="text-gray-600" />
                        }
                        <span className={`text-sm ${ativo ? 'text-white' : 'text-gray-600'}`}>{label}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Faturas */}
          <div className="bg-[#29292e] border border-[#323238] rounded-lg">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-[#323238]">
              <CreditCard size={15} className="text-gray-400" />
              <p className="text-white font-semibold text-sm">Faturas</p>
            </div>
            {faturas.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-6">
                Nenhuma fatura encontrada para esta assinatura.
              </p>
            ) : (
              <div className="divide-y divide-[#323238]">
                {faturas.map((f) => (
                  <div key={f.name} className="flex items-center justify-between px-5 py-3 gap-3">
                    <div className="min-w-0">
                      <p className="text-white text-sm font-medium truncate">
                        {f.id_da_transacao || f.name}
                      </p>
                      <p className="text-gray-500 text-xs mt-0.5">
                        {fmtDate(f.data_da_transacao)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {f.montante != null && (
                        <span className="text-white text-sm font-semibold tabular-nums">
                          R$ {Number(f.montante).toFixed(2).replace('.', ',')}
                        </span>
                      )}
                      <FaturaStatusBadge status={f.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </ListPage>
  )
}
