import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CheckCircle2, Eraser, Edit2, Trash2, Pause, Play, RefreshCcw, AlertTriangle, Clock,
} from 'lucide-react'
import { Modal, Button, Spinner, EmptyState } from '../../components/ui'
import {
  buscarContrato, darBaixaParcela, removerBaixaParcela, pausarContrato,
  retomarContrato, renovarContrato, excluirContrato,
} from '../../api/contratosAluno'
import { invalidateStatusCache } from '../../hooks/useStatusAluno'
import PlanoBadge from '../../components/financeiro/PlanoBadge'
import {
  formatCurrency, formatDateBr, getTodayISO, normalizeDate,
} from './utils'

export default function ContratoDetalheModal({
  isOpen, contratoId, alunoNome, planos = [], onClose, onMutate, onEditar,
}) {
  const [loading, setLoading] = useState(false)
  const [contrato, setContrato] = useState(null)
  const [acaoPendente, setAcaoPendente] = useState('')

  const carregar = useCallback(async () => {
    if (!contratoId) return
    setLoading(true)
    try {
      const c = await buscarContrato(contratoId)
      setContrato(c)
    } catch (e) {
      alert('Erro ao carregar contrato: ' + (e.response?.data?.exception || e.message))
      onClose()
    } finally {
      setLoading(false)
    }
  }, [contratoId, onClose])

  useEffect(() => {
    if (isOpen && contratoId) carregar()
    if (!isOpen) setContrato(null)
  }, [isOpen, contratoId, carregar])

  const planoCor = useMemo(() => {
    if (!contrato?.plano) return 'slate'
    const p = planos.find((x) => x.name === contrato.plano)
    return p?.cor || 'slate'
  }, [contrato, planos])

  const todayISO = getTodayISO()

  const totalPago = useMemo(() => {
    if (!contrato?.parcelas) return 0
    return contrato.parcelas.reduce((acc, p) => p.data_pagamento ? acc + (parseFloat(p.valor_parcela) || 0) : acc, 0)
  }, [contrato])

  const totalContrato = useMemo(() => parseFloat(contrato?.valor_liquido_total) || 0, [contrato])

  const baixarParcela = async (numero) => {
    setAcaoPendente(`baixa-${numero}`)
    try {
      await darBaixaParcela(contratoId, numero, todayISO)
      invalidateStatusCache(contrato?.aluno)
      await carregar()
      onMutate?.()
    } catch (e) {
      alert('Erro ao baixar parcela: ' + (e.response?.data?.exception || e.message))
    } finally {
      setAcaoPendente('')
    }
  }

  const removerBaixa = async (numero) => {
    if (!window.confirm(`Remover baixa da parcela ${numero}?`)) return
    setAcaoPendente(`remover-${numero}`)
    try {
      await removerBaixaParcela(contratoId, numero)
      invalidateStatusCache(contrato?.aluno)
      await carregar()
      onMutate?.()
    } catch (e) {
      alert('Erro ao remover baixa: ' + (e.response?.data?.exception || e.message))
    } finally {
      setAcaoPendente('')
    }
  }

  const pausar = async () => {
    setAcaoPendente('pausar')
    try {
      await pausarContrato(contratoId)
      invalidateStatusCache(contrato?.aluno)
      await carregar()
      onMutate?.()
    } catch (e) {
      alert('Erro ao pausar: ' + (e.response?.data?.exception || e.message))
    } finally {
      setAcaoPendente('')
    }
  }

  const retomar = async () => {
    setAcaoPendente('retomar')
    try {
      await retomarContrato(contratoId)
      invalidateStatusCache(contrato?.aluno)
      await carregar()
      onMutate?.()
    } catch (e) {
      alert('Erro ao retomar: ' + (e.response?.data?.exception || e.message))
    } finally {
      setAcaoPendente('')
    }
  }

  const renovar = async () => {
    if (!window.confirm('Criar contrato de renovação com continuidade perfeita?')) return
    setAcaoPendente('renovar')
    try {
      const r = await renovarContrato(contratoId)
      invalidateStatusCache(contrato?.aluno)
      onMutate?.()
      onClose()
      if (r?.name) alert(`Renovação criada: ${r.name}`)
    } catch (e) {
      alert('Erro ao renovar: ' + (e.response?.data?.exception || e.message))
    } finally {
      setAcaoPendente('')
    }
  }

  const excluir = async () => {
    if (!window.confirm('Excluir contrato?\n\nEssa ação remove todas as parcelas e atualiza o espelho do aluno.')) return
    setAcaoPendente('excluir')
    try {
      await excluirContrato(contratoId)
      invalidateStatusCache(contrato?.aluno)
      onMutate?.()
      onClose()
    } catch (e) {
      alert('Erro ao excluir: ' + (e.response?.data?.exception || e.message))
    } finally {
      setAcaoPendente('')
    }
  }

  if (!isOpen) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={contrato?.name || contratoId}
      subtitle={alunoNome || ''}
      size="2xl"
      footer={
        contrato ? (
          <>
            <Button variant="ghost" onClick={onClose}>Fechar</Button>
            <Button
              variant="danger"
              icon={Trash2}
              onClick={excluir}
              loading={acaoPendente === 'excluir'}
            >
              Excluir
            </Button>
            {contrato.status_manual === 'Pausado' ? (
              <Button variant="success" icon={Play} onClick={retomar} loading={acaoPendente === 'retomar'}>
                Retomar
              </Button>
            ) : (
              <Button variant="secondary" icon={Pause} onClick={pausar} loading={acaoPendente === 'pausar'}>
                Pausar
              </Button>
            )}
            <Button variant="info" icon={RefreshCcw} onClick={renovar} loading={acaoPendente === 'renovar'}>
              Renovar
            </Button>
            <Button variant="primary" icon={Edit2} onClick={() => onEditar?.(contrato, alunoNome)}>
              Editar
            </Button>
          </>
        ) : null
      }
    >
      {loading ? (
        <div className="flex items-center justify-center py-16"><Spinner /></div>
      ) : !contrato ? (
        <div className="py-12">
          <EmptyState title="Contrato não encontrado" />
        </div>
      ) : (
        <div className="p-4 md:p-5 space-y-5">
          {/* header info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <InfoBox label="Plano">
              <PlanoBadge nome={contrato.nome_plano_snapshot || contrato.plano} cor={planoCor} />
              <div className="text-[10px] text-gray-500 mt-1">{contrato.rotulo_variacao}</div>
            </InfoBox>
            <InfoBox label="Modalidade">
              <div className="text-white font-semibold text-sm">{contrato.modalidade}</div>
              <div className="text-[10px] text-gray-500 mt-1">{contrato.metodo_pagamento}</div>
            </InfoBox>
            <InfoBox label={normalizeDate(contrato.data_inicio) ? 'Vigência' : 'Pagamento'}>
              {normalizeDate(contrato.data_inicio) ? (
                <>
                  <div className="text-white text-sm font-semibold">{formatDateBr(contrato.data_inicio)}</div>
                  <div className="text-[10px] text-gray-500">até {formatDateBr(contrato.data_fim)}</div>
                </>
              ) : (
                <>
                  <div className="text-white text-sm font-semibold">{formatDateBr(contrato.data_pagamento_principal)}</div>
                  <div className="text-[10px] text-blue-400">Não iniciado</div>
                </>
              )}
            </InfoBox>
            <InfoBox label="Valor líquido">
              <div className="font-mono font-bold text-white text-sm">{formatCurrency(totalContrato)}</div>
              <div className="text-[10px] text-green-400 mt-1">Pago: {formatCurrency(totalPago)}</div>
            </InfoBox>
          </div>

          {contrato.status_manual === 'Pausado' && (
            <div className="bg-gray-500/10 border border-gray-500/30 rounded-xl px-3 py-2 flex items-center gap-2">
              <Pause size={14} className="text-gray-400" />
              <span className="text-gray-300 text-xs">Contrato pausado. Status calculado é "Pausado".</span>
            </div>
          )}

          {!normalizeDate(contrato.data_inicio) && normalizeDate(contrato.data_pagamento_principal) && (
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl px-3 py-2 flex items-start gap-2">
              <Clock size={14} className="text-blue-400 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-blue-300 text-xs font-bold mb-0.5">Pago e não iniciado</p>
                <p className="text-blue-200/70 text-[11px]">
                  Pagamento registrado em <strong>{formatDateBr(contrato.data_pagamento_principal)}</strong>. Edite o contrato e preencha "Data início" para ativar — a data fim é calculada automaticamente.
                </p>
              </div>
              <Button
                variant="info"
                size="xs"
                icon={Play}
                onClick={() => onEditar?.(contrato, alunoNome)}
              >
                Ativar
              </Button>
            </div>
          )}

          {contrato.renovacao_de && (
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl px-3 py-2 flex items-center gap-2">
              <RefreshCcw size={14} className="text-blue-400" />
              <span className="text-blue-300 text-xs">
                Renovação de <strong>{contrato.renovacao_de}</strong>
              </span>
            </div>
          )}

          {contrato.observacoes && (
            <div className="bg-[#1a1a1a] border border-[#323238] rounded-xl px-3 py-2">
              <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Observações</div>
              <p className="text-gray-300 text-xs whitespace-pre-line">{contrato.observacoes}</p>
            </div>
          )}

          {/* parcelas */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-white font-bold text-sm">
                Parcelas ({contrato.parcelas?.length || 0})
              </h4>
              <div className="text-[11px] text-gray-500">
                Edição via baixa/remoção de baixa
              </div>
            </div>
            {!contrato.parcelas?.length ? (
              <p className="text-gray-500 text-xs italic">Nenhuma parcela.</p>
            ) : (
              <div className="border border-[#323238] rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#323238] bg-[#111113]">
                      <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-500">#</th>
                      <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-500">Vencimento</th>
                      <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-gray-500">Valor</th>
                      <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-500">Pagamento</th>
                      <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-gray-500">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contrato.parcelas.map((p, i) => {
                      const venc = normalizeDate(p.data_vencimento)
                      const pago = !!p.data_pagamento
                      const atrasada = !pago && venc && venc < todayISO
                      return (
                        <tr
                          key={p.numero_parcela ?? i}
                          className={`border-b border-[#323238] last:border-0 ${
                            i % 2 === 0 ? 'bg-[#1a1a1a]' : 'bg-[#1e1e22]'
                          }`}
                        >
                          <td className="px-3 py-2.5 text-white font-bold text-xs">{p.numero_parcela}</td>
                          <td className="px-3 py-2.5 text-gray-300 text-xs">
                            {formatDateBr(p.data_vencimento)}
                            {atrasada && (
                              <span className="ml-2 inline-flex items-center gap-1 text-[10px] text-yellow-400">
                                <AlertTriangle size={10} /> Atrasada
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono font-semibold text-white text-xs">
                            {formatCurrency(p.valor_parcela)}
                          </td>
                          <td className="px-3 py-2.5 text-xs">
                            {pago ? (
                              <span className="text-green-400 font-bold inline-flex items-center gap-1">
                                <CheckCircle2 size={11} /> {formatDateBr(p.data_pagamento)}
                              </span>
                            ) : (
                              <span className="text-gray-500">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            {pago ? (
                              <button
                                onClick={() => removerBaixa(p.numero_parcela)}
                                disabled={acaoPendente === `remover-${p.numero_parcela}`}
                                title="Remover baixa"
                                className="h-7 w-7 inline-flex items-center justify-center text-gray-400 hover:text-white border border-[#323238] hover:border-gray-500 rounded-lg transition-colors disabled:opacity-40"
                              >
                                <Eraser size={12} />
                              </button>
                            ) : (
                              <button
                                onClick={() => baixarParcela(p.numero_parcela)}
                                disabled={acaoPendente === `baixa-${p.numero_parcela}`}
                                title="Dar baixa hoje"
                                className="h-7 w-7 inline-flex items-center justify-center text-green-400 hover:text-white hover:bg-green-700 border border-green-500/30 hover:border-green-700 rounded-lg transition-colors disabled:opacity-40"
                              >
                                <CheckCircle2 size={12} />
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}

function InfoBox({ label, children }) {
  return (
    <div className="bg-[#1a1a1a] border border-[#323238] rounded-xl px-3 py-2">
      <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">{label}</div>
      {children}
    </div>
  )
}
