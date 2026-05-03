import { useEffect, useMemo, useState } from 'react'
import { Search, RefreshCcw } from 'lucide-react'
import { Modal, Button, Spinner, EmptyState } from '../../components/ui'
import { renovarContrato } from '../../api/contratosAluno'
import { formatCurrency, formatDateBr, normalizeDate, smartSearch } from './utils'

export default function RenovarContratoModal({
  isOpen, onClose, contratos, alunosMap, onSuccess,
}) {
  const [query, setQuery] = useState('')
  const [selecionado, setSelecionado] = useState(null)
  const [renovando, setRenovando] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      setQuery('')
      setSelecionado(null)
      setRenovando(false)
    }
  }, [isOpen])

  // Pega o contrato mais recente (data_fim mais recente) por aluno
  const contratosPorAluno = useMemo(() => {
    const map = new Map()
    contratos.forEach((c) => {
      if (!c.aluno) return
      const cur = map.get(c.aluno)
      const cFim = normalizeDate(c.data_fim) || ''
      const curFim = cur ? normalizeDate(cur.data_fim) || '' : ''
      if (!cur || cFim > curFim) map.set(c.aluno, c)
    })
    return [...map.values()]
  }, [contratos])

  const candidatos = useMemo(() => {
    const q = (query || '').trim()
    return contratosPorAluno
      .map((c) => ({
        contrato: c,
        nome: alunosMap[c.aluno]?.nome_completo || c.aluno,
      }))
      .filter((row) => !q || smartSearch(row.nome, q))
      .sort((a, b) => a.nome.localeCompare(b.nome))
      .slice(0, 30)
  }, [contratosPorAluno, alunosMap, query])

  const renovar = async () => {
    if (!selecionado) return
    setRenovando(true)
    try {
      const r = await renovarContrato(selecionado.name)
      onSuccess?.(r?.name)
      onClose()
      if (r?.name) alert(`Renovação criada: ${r.name}`)
    } catch (e) {
      alert('Erro ao renovar: ' + (e.response?.data?.exception || e.message))
    } finally {
      setRenovando(false)
    }
  }

  if (!isOpen) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Renovar contrato"
      subtitle="Selecione o contrato anterior — o backend cria um novo com continuidade perfeita"
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={renovando}>Cancelar</Button>
          <Button
            variant="primary"
            icon={RefreshCcw}
            onClick={renovar}
            loading={renovando}
            disabled={!selecionado}
          >
            Renovar
          </Button>
        </>
      }
    >
      <div className="p-4 space-y-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar aluno..."
            className="w-full h-10 pl-9 pr-3 bg-[#1a1a1a] border border-[#323238] text-white rounded-lg text-sm outline-none focus:border-[#2563eb]/60 placeholder-gray-600"
          />
        </div>

        {candidatos.length === 0 ? (
          <div className="py-8">
            <EmptyState
              title="Nenhum contrato encontrado"
              description={query ? `Sem resultados para "${query}"` : 'Não há contratos pra renovar.'}
            />
          </div>
        ) : (
          <div className="max-h-72 overflow-y-auto border border-[#323238] rounded-xl bg-[#1a1a1a]">
            {candidatos.map(({ contrato: c, nome }) => {
              const sel = selecionado?.name === c.name
              return (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setSelecionado(c)}
                  className={`w-full text-left p-3 border-b border-[#323238] last:border-0 transition-colors ${
                    sel ? 'bg-blue-500/10 border-blue-500/30' : 'hover:bg-[#222226]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-bold text-white text-sm truncate">{nome}</div>
                      <div className="text-[10px] text-gray-500 mt-0.5">
                        {c.name} · {c.nome_plano_snapshot || c.plano} · {c.rotulo_variacao || ''}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[10px] text-gray-400">Vence em</div>
                      <div className="text-sm font-semibold text-white">{formatDateBr(c.data_fim)}</div>
                      <div className="text-[10px] text-gray-500 font-mono">{formatCurrency(c.valor_liquido_total)}</div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </Modal>
  )
}
