import { useCallback, useEffect, useMemo, useState } from 'react'
import { RefreshCw, FileText } from 'lucide-react'
import { Modal, Button, Spinner, EmptyState } from '../../components/ui'
import { listarAuditorias } from '../../api/auditoriaFinanceira'
import { ACOES_AUDITORIA } from './constants'
import { formatCurrency, formatDateBr } from './utils'

const ACAO_LABEL = {
  CRIOU_CONTRATO: 'Criou contrato',
  EDITOU_CONTRATO: 'Editou contrato',
  EXCLUIU_CONTRATO: 'Excluiu contrato',
  DEU_BAIXA_PARCELA: 'Baixa de parcela',
  REMOVEU_BAIXA_PARCELA: 'Removeu baixa',
  RENOVOU_CONTRATO: 'Renovou contrato',
  CRIOU_PLANO: 'Criou plano',
  EDITOU_PLANO: 'Editou plano',
  EXCLUIU_PLANO: 'Excluiu plano',
}

const ACAO_COLOR = {
  CRIOU_CONTRATO: 'text-green-400 bg-green-500/10 border-green-500/20',
  EDITOU_CONTRATO: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  EXCLUIU_CONTRATO: 'text-red-400 bg-red-500/10 border-red-500/20',
  DEU_BAIXA_PARCELA: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  REMOVEU_BAIXA_PARCELA: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  RENOVOU_CONTRATO: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  CRIOU_PLANO: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
  EDITOU_PLANO: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  EXCLUIU_PLANO: 'text-red-400 bg-red-500/10 border-red-500/20',
}

export default function AuditoriaModal({ isOpen, onClose, alunosMap = {} }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)
  const [filtroAcao, setFiltroAcao] = useState('')

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const res = await listarAuditorias({ acao: filtroAcao, limit: 200 })
      setLogs(res || [])
    } catch (e) {
      alert('Erro ao carregar auditoria: ' + (e.response?.data?.exception || e.message))
    } finally {
      setLoading(false)
    }
  }, [filtroAcao])

  useEffect(() => {
    if (isOpen) carregar()
    if (!isOpen) setLogs([])
  }, [isOpen, carregar])

  const formatDateTime = (v) => {
    if (!v) return '—'
    const d = new Date(v)
    if (isNaN(d.getTime())) return v
    return d.toLocaleString('pt-BR')
  }

  if (!isOpen) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Auditoria"
      subtitle="Log read-only de todas as ações (gerado pelo backend)"
      size="2xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Fechar</Button>
          <Button variant="secondary" icon={RefreshCw} onClick={carregar} loading={loading}>
            Atualizar
          </Button>
        </>
      }
    >
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <select
            value={filtroAcao}
            onChange={(e) => setFiltroAcao(e.target.value)}
            className="h-10 px-3 bg-[#1a1a1a] border border-[#323238] text-white rounded-lg text-sm outline-none focus:border-[#2563eb]/60"
          >
            <option value="">Todas as ações</option>
            {ACOES_AUDITORIA.map((a) => (
              <option key={a} value={a}>{ACAO_LABEL[a] || a}</option>
            ))}
          </select>
          <div className="text-[11px] text-gray-500 ml-auto">
            {logs.length} registro{logs.length !== 1 ? 's' : ''}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12"><Spinner /></div>
        ) : !logs.length ? (
          <div className="py-8">
            <EmptyState
              icon={FileText}
              title="Sem auditorias"
              description="Nenhum registro encontrado pra esses filtros."
            />
          </div>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto border border-[#323238] rounded-xl bg-[#1a1a1a]">
            <table className="w-full">
              <thead className="sticky top-0 bg-[#111113] border-b border-[#323238]">
                <tr>
                  <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-500">Data/Hora</th>
                  <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-500">Ação</th>
                  <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-500">Aluno</th>
                  <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-500">Plano</th>
                  <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-gray-500">Valor</th>
                  <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-500">Detalhe</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l, i) => {
                  const acaoCls = ACAO_COLOR[l.acao] || 'text-gray-400 bg-gray-500/10 border-gray-500/20'
                  const aluno = alunosMap[l.aluno]?.nome_completo || l.nome_aluno_snapshot || l.aluno || '—'
                  return (
                    <tr key={l.name || i} className={`border-b border-[#323238] last:border-0 ${i % 2 === 0 ? 'bg-[#1a1a1a]' : 'bg-[#1e1e22]'}`}>
                      <td className="px-3 py-2 text-[11px] text-gray-400 font-mono whitespace-nowrap">
                        {formatDateTime(l.data_hora)}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${acaoCls}`}>
                          {ACAO_LABEL[l.acao] || l.acao}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-[12px] text-white font-medium truncate max-w-[180px]">{aluno}</td>
                      <td className="px-3 py-2 text-[12px] text-gray-300 truncate max-w-[160px]">{l.nome_plano_snapshot || '—'}</td>
                      <td className="px-3 py-2 text-right text-[12px] font-mono text-white">
                        {l.valor ? formatCurrency(l.valor) : '—'}
                      </td>
                      <td className="px-3 py-2 text-[11px] text-gray-400 italic max-w-[260px] truncate">
                        {l.nota || (l.quem ? `por ${l.quem}` : '—')}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Modal>
  )
}
