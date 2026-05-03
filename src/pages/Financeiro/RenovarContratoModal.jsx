import { useEffect, useMemo, useState } from 'react'
import { Search, RefreshCcw, ChevronLeft } from 'lucide-react'
import { Modal, Button, EmptyState, FormGroup, Input, Select, Textarea } from '../../components/ui'
import { renovarContrato } from '../../api/contratosAluno'
import { formatCurrency, formatDateBr, normalizeDate, smartSearch } from './utils'

export default function RenovarContratoModal({
  isOpen, onClose, contratos, planos = [], alunosMap, onSuccess,
  contratoPreSelecionado = null,
}) {
  const [query, setQuery] = useState('')
  const [selecionado, setSelecionado] = useState(null)
  const [renovando, setRenovando] = useState(false)

  // Overrides editáveis aplicados na renovação (só vão se preenchidos)
  const [overrides, setOverrides] = useState({
    plano: '',
    valor_liquido_total: '',
    data_pagamento_principal: '',
    observacoes: '',
  })

  useEffect(() => {
    if (!isOpen) {
      setQuery('')
      setSelecionado(null)
      setRenovando(false)
      setOverrides({ plano: '', valor_liquido_total: '', data_pagamento_principal: '', observacoes: '' })
    } else if (contratoPreSelecionado) {
      // Quando vem de "Renovar este contrato" do banner do Novo pagamento
      setSelecionado(contratoPreSelecionado)
    }
  }, [isOpen, contratoPreSelecionado])

  // Quando seleciona um contrato, pré-preenche os campos editáveis
  // com os valores atuais (assim user só muda o que precisar).
  useEffect(() => {
    if (!selecionado) return
    setOverrides({
      plano: selecionado.plano || '',
      valor_liquido_total: selecionado.valor_liquido_total != null ? String(selecionado.valor_liquido_total) : '',
      data_pagamento_principal: '',
      observacoes: '',
    })
  }, [selecionado])

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

  const planoOptions = useMemo(
    () => [
      { value: '', label: '— manter o mesmo —' },
      ...planos.map((p) => ({ value: p.name, label: p.nome_plano || p.name })),
    ],
    [planos],
  )

  const renovar = async () => {
    if (!selecionado) return
    setRenovando(true)
    try {
      // Monta dados_opcionais só com o que mudou
      const dadosOpcionais = {}
      if (overrides.plano && overrides.plano !== selecionado.plano) {
        dadosOpcionais.plano = overrides.plano
      }
      const valorAtual = parseFloat(selecionado.valor_liquido_total) || 0
      const valorNovo = parseFloat(overrides.valor_liquido_total) || 0
      if (overrides.valor_liquido_total !== '' && valorNovo !== valorAtual) {
        dadosOpcionais.valor_liquido_total = valorNovo
      }
      if (overrides.data_pagamento_principal) {
        dadosOpcionais.data_pagamento_principal = overrides.data_pagamento_principal
      }
      if (overrides.observacoes) {
        dadosOpcionais.observacoes = overrides.observacoes
      }
      const r = await renovarContrato(selecionado.name, dadosOpcionais)
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

  const valorAtualNum = parseFloat(selecionado?.valor_liquido_total) || 0
  const valorNovoNum = parseFloat(overrides.valor_liquido_total) || 0
  const valorMudou = overrides.valor_liquido_total !== '' && valorNovoNum !== valorAtualNum

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Renovar contrato"
      subtitle={selecionado
        ? 'Ajuste plano/valor/observação se quiser — o que ficar igual será replicado'
        : 'Escolha o contrato anterior'}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={renovando}>Cancelar</Button>
          {selecionado && (
            <Button variant="secondary" icon={ChevronLeft}
              onClick={() => setSelecionado(null)} disabled={renovando}>
              Voltar
            </Button>
          )}
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
        {!selecionado ? (
          <>
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
                {candidatos.map(({ contrato: c, nome }) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => setSelecionado(c)}
                    className="w-full text-left p-3 border-b border-[#323238] last:border-0 transition-colors hover:bg-[#222226]"
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
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {/* Resumo do contrato selecionado */}
            <div className="bg-[#111113] border border-[#323238] rounded-xl px-3 py-2">
              <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">Renovando</div>
              <div className="font-bold text-white text-sm">
                {alunosMap[selecionado.aluno]?.nome_completo || selecionado.aluno}
              </div>
              <div className="text-[11px] text-gray-400 mt-0.5">
                {selecionado.name} · {selecionado.nome_plano_snapshot || selecionado.plano}
                {' · venceu '}
                {formatDateBr(selecionado.data_fim)}
                {' · '}
                <span className="font-mono text-gray-300">{formatCurrency(selecionado.valor_liquido_total)}</span>
              </div>
            </div>

            {/* Overrides */}
            <FormGroup label="Plano" hint="Deixe vazio para manter o mesmo">
              <Select
                value={overrides.plano}
                onChange={(v) => setOverrides((p) => ({ ...p, plano: v }))}
                options={planoOptions}
              />
            </FormGroup>

            <div className="grid grid-cols-2 gap-3">
              <FormGroup label="Valor líquido" hint={valorMudou ? `Era ${formatCurrency(valorAtualNum)}` : 'R$'}>
                <Input
                  type="number"
                  value={overrides.valor_liquido_total}
                  onChange={(v) => setOverrides((p) => ({ ...p, valor_liquido_total: v }))}
                  placeholder="0,00"
                />
              </FormGroup>
              <FormGroup label="Data de pagamento" hint="Opcional — vazio = não pago ainda">
                <Input
                  type="date"
                  value={overrides.data_pagamento_principal}
                  onChange={(v) => setOverrides((p) => ({ ...p, data_pagamento_principal: v }))}
                />
              </FormGroup>
            </div>

            <FormGroup label="Observações" hint="Opcional">
              <Textarea
                rows={2}
                value={overrides.observacoes}
                onChange={(v) => setOverrides((p) => ({ ...p, observacoes: v }))}
                placeholder="Notas sobre essa renovação..."
              />
            </FormGroup>
          </>
        )}
      </div>
    </Modal>
  )
}
