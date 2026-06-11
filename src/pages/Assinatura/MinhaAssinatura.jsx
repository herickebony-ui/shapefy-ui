import { useState, useEffect } from 'react'
import { CreditCard, CheckCircle, XCircle, ArrowRight } from 'lucide-react'
import { buscarAssinatura, buscarPlano, listarFaturas, listarPlanosParaMigracao, iniciarMigracaoPlano } from '../../api/assinatura'
import useAuthStore from '../../store/authStore'
import { Badge, Spinner } from '../../components/ui'
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

const fmtBRL = (v) => `R$ ${Number(v).toFixed(2).replace('.', ',')}`

function TrocarPlano({ planoAtualNome }) {
  const [dados, setDados] = useState(null)
  const [loading, setLoading] = useState(false)
  const [expandido, setExpandido] = useState(false)
  const [selecionado, setSelecionado] = useState(null)
  const [migrando, setMigrando] = useState(false)
  const [erro, setErro] = useState(null)

  const carregar = async () => {
    if (dados) { setExpandido(true); return }
    setLoading(true)
    try {
      const res = await listarPlanosParaMigracao()
      setDados(res)
      setExpandido(true)
    } catch (e) {
      setErro('Erro ao carregar planos.')
    } finally {
      setLoading(false)
    }
  }

  const confirmar = async () => {
    if (!selecionado) return
    setMigrando(true)
    setErro(null)
    try {
      const res = await iniciarMigracaoPlano(selecionado.name)
      if (res?.checkout_url) {
        window.location.href = res.checkout_url
      } else {
        setErro('Não foi possível iniciar a migração.')
        setMigrando(false)
      }
    } catch (e) {
      setErro(e?.response?.data?.exception || 'Erro ao migrar plano.')
      setMigrando(false)
    }
  }

  return (
    <div className="bg-[#29292e] border border-[#323238] rounded-lg overflow-hidden">
      <button
        onClick={() => expandido ? setExpandido(false) : carregar()}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <span className="text-white font-semibold text-sm">Trocar de Plano</span>
        <ArrowRight size={15} className={`text-gray-400 transition-transform ${expandido ? 'rotate-90' : ''}`} />
      </button>

      {expandido && (
        <div className="border-t border-[#323238] px-5 py-4 space-y-3">
          {loading && <p className="text-gray-400 text-sm text-center py-2">Carregando...</p>}

          {!loading && dados?.plans?.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-2">Nenhum outro plano disponível.</p>
          )}

          {!loading && dados?.plans?.map((p) => {
            const isSel = selecionado?.name === p.name
            const upgrade = p.delta > 0
            return (
              <div
                key={p.name}
                onClick={() => !migrando && setSelecionado(isSel ? null : p)}
                className={`rounded-lg border p-4 cursor-pointer transition-colors ${
                  isSel
                    ? 'border-brand bg-brand/10'
                    : 'border-[#3f3f46] hover:border-[#52525b]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-white font-semibold text-sm">{p.nome_do_plano}</span>
                  <span className="text-white font-bold text-sm">{fmtBRL(p.preco)}/mês</span>
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    upgrade ? 'bg-green-500/15 text-green-400' : 'bg-blue-500/15 text-blue-400'
                  }`}>
                    {upgrade ? 'Upgrade' : 'Downgrade'}
                  </span>
                  <span className="text-gray-400 text-xs">
                    1ª cobrança: <span className="text-white font-medium">{fmtBRL(p.primeira_cobranca)}</span>
                    {upgrade && <span className="text-gray-500"> · próximas: {fmtBRL(p.preco)}</span>}
                  </span>
                </div>
              </div>
            )
          })}

          {selecionado && !migrando && (
            <div className="bg-[#1c1c1f] border border-[#323238] rounded-lg p-4 space-y-3">
              <p className="text-white text-sm">
                Migrar de <span className="font-semibold">{planoAtualNome}</span> para{' '}
                <span className="font-semibold">{selecionado.nome_do_plano}</span>
              </p>
              <div className="text-xs text-gray-400 space-y-1">
                <p>Primeira cobrança: <span className="text-white font-semibold">{fmtBRL(selecionado.primeira_cobranca)}</span></p>
                <p>Próximas cobranças: <span className="text-white font-semibold">{fmtBRL(selecionado.preco)}/mês</span></p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={confirmar}
                  className="flex-1 bg-brand text-white text-sm font-semibold py-2 rounded-lg"
                >
                  Confirmar Migração
                </button>
                <button
                  onClick={() => setSelecionado(null)}
                  className="px-4 text-gray-400 text-sm border border-[#3f3f46] rounded-lg"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {migrando && (
            <p className="text-gray-400 text-sm text-center py-2">Processando migração...</p>
          )}

          {erro && <p className="text-red-400 text-xs text-center">{erro}</p>}
        </div>
      )}
    </div>
  )
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

          {/* Trocar de Plano */}
          {assinatura.status?.toLowerCase() === 'ativo' && (
            <TrocarPlano planoAtualNome={assinatura.plano_de_assinatura} />
          )}

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
