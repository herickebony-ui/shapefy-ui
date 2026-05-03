import { useCallback, useEffect, useMemo, useState } from 'react'
import { Modal, Spinner, EmptyState, Button } from '../../components/ui'
import { listarContratos, buscarContrato } from '../../api/contratosAluno'
import PlanoBadge from '../../components/financeiro/PlanoBadge'
import StatusAlunoBadge from '../../components/financeiro/StatusAlunoBadge'
import { formatCurrency, formatDateBr, normalizeDate } from './utils'

export default function HistoricoAlunoModal({
  isOpen, alunoId, alunoNome, planos = [], onClose,
}) {
  const [loading, setLoading] = useState(false)
  const [contratos, setContratos] = useState([])
  const [parcelasPorContrato, setParcelasPorContrato] = useState({})

  const carregar = useCallback(async () => {
    if (!alunoId) return
    setLoading(true)
    try {
      const res = await listarContratos({ aluno: alunoId, limit: 100 })
      const list = (res.list || []).sort((a, b) =>
        (normalizeDate(b.data_fim) || '').localeCompare(normalizeDate(a.data_fim) || '')
      )
      setContratos(list)
      // busca parcelas para os 5 contratos mais recentes (otimização)
      const top = list.slice(0, 5)
      const detalhes = await Promise.all(
        top.map((c) => buscarContrato(c.name).catch(() => null))
      )
      const map = {}
      detalhes.forEach((d, i) => { if (d) map[top[i].name] = d.parcelas || [] })
      setParcelasPorContrato(map)
    } catch (e) {
      alert('Erro ao carregar histórico: ' + (e.response?.data?.exception || e.message))
    } finally {
      setLoading(false)
    }
  }, [alunoId])

  useEffect(() => {
    if (isOpen && alunoId) carregar()
    if (!isOpen) {
      setContratos([])
      setParcelasPorContrato({})
    }
  }, [isOpen, alunoId, carregar])

  const planosByName = useMemo(() => {
    const m = {}
    planos.forEach((p) => { m[p.name] = p })
    return m
  }, [planos])

  const totais = useMemo(() => {
    let totalPago = 0
    let totalContratos = 0
    contratos.forEach((c) => {
      totalContratos += parseFloat(c.valor_liquido_total) || 0
      const parcelas = parcelasPorContrato[c.name] || []
      parcelas.forEach((p) => {
        if (p.data_pagamento) totalPago += parseFloat(p.valor_parcela) || 0
      })
    })
    return { totalPago, totalContratos }
  }, [contratos, parcelasPorContrato])

  if (!isOpen) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={alunoNome || 'Histórico'}
      subtitle="LTV e contratos do aluno"
      size="2xl"
      footer={<Button variant="ghost" onClick={onClose}>Fechar</Button>}
    >
      {loading ? (
        <div className="flex items-center justify-center py-16"><Spinner /></div>
      ) : !contratos.length ? (
        <div className="py-12">
          <EmptyState title="Nenhum contrato" description="Esse aluno não tem contratos." />
        </div>
      ) : (
        <div className="p-4 space-y-4">
          {/* totais */}
          <div className="grid grid-cols-3 gap-3">
            <Box label="Total contratado">
              <span className="font-mono text-sm font-bold text-white">{formatCurrency(totais.totalContratos)}</span>
            </Box>
            <Box label="Total pago">
              <span className="font-mono text-sm font-bold text-green-400">{formatCurrency(totais.totalPago)}</span>
            </Box>
            <Box label="Status atual">
              <StatusAlunoBadge alunoId={alunoId} size="md" />
            </Box>
          </div>

          {/* lista de contratos */}
          <div className="border border-[#323238] rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#323238] bg-[#111113]">
                  <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-500">Contrato</th>
                  <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-500">Plano</th>
                  <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-500">Vigência</th>
                  <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-gray-500">Valor</th>
                  <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-500">Pago</th>
                </tr>
              </thead>
              <tbody>
                {contratos.map((c, i) => {
                  const cor = planosByName[c.plano]?.cor || 'slate'
                  const parcelas = parcelasPorContrato[c.name]
                  const pagoLocal = (parcelas || []).reduce((acc, p) => p.data_pagamento ? acc + (parseFloat(p.valor_parcela) || 0) : acc, 0)
                  return (
                    <tr key={c.name} className={`border-b border-[#323238] last:border-0 ${i % 2 === 0 ? 'bg-[#1a1a1a]' : 'bg-[#1e1e22]'}`}>
                      <td className="px-3 py-2.5 text-[11px] text-white font-bold whitespace-nowrap">
                        {c.name}
                        {c.renovacao_de && <div className="text-[9px] text-blue-400 font-normal">renov. de {c.renovacao_de}</div>}
                      </td>
                      <td className="px-3 py-2.5">
                        <PlanoBadge nome={c.nome_plano_snapshot || c.plano} cor={cor} />
                        <div className="text-[10px] text-gray-500 mt-0.5">{c.modalidade} · {c.rotulo_variacao}</div>
                      </td>
                      <td className="px-3 py-2.5 text-[11px] text-gray-300">
                        {formatDateBr(c.data_inicio)}
                        <div className="text-[10px] text-gray-500">até {formatDateBr(c.data_fim)}</div>
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-[12px] font-semibold text-white">
                        {formatCurrency(c.valor_liquido_total)}
                      </td>
                      <td className="px-3 py-2.5 text-[11px]">
                        {parcelas ? (
                          <span className="text-green-400 font-bold">{formatCurrency(pagoLocal)}</span>
                        ) : (
                          <span className="text-gray-500">…</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {contratos.length > 5 && (
            <p className="text-[10px] text-gray-500 italic">
              * Total pago calculado apenas sobre os 5 contratos mais recentes.
            </p>
          )}
        </div>
      )}
    </Modal>
  )
}

function Box({ label, children }) {
  return (
    <div className="bg-[#1a1a1a] border border-[#323238] rounded-xl px-3 py-2">
      <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">{label}</div>
      {children}
    </div>
  )
}
