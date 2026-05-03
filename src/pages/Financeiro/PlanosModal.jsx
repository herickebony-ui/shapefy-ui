import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Trash2, Edit2, X, Save, ChevronRight, ToggleLeft, ToggleRight, Equal } from 'lucide-react'
import { Modal, Button, FormGroup, Input, Spinner, EmptyState } from '../../components/ui'
import { ALLOWED_COLORS, COLOR_DOT } from './constants'
import { buscarPlano, criarPlano, salvarPlano, excluirPlano } from '../../api/planosShapefy'
import { formatCurrency } from './utils'

const VARIACAO_VAZIA = {
  duracao_meses: 1,
  rotulo: 'Mensal',
  valor_bruto_a_vista: 0,
  valor_liquido_a_vista: 0,
  valor_bruto_a_prazo: 0,
  valor_liquido_a_prazo: 0,
}

export default function PlanosModal({ isOpen, onClose, planos, onMutate }) {
  const [view, setView] = useState('list') // 'list' | 'form'
  const [editing, setEditing] = useState(null) // null = criar, objeto = editar
  const [formData, setFormData] = useState(null)
  const [loadingDetalhe, setLoadingDetalhe] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [excluindo, setExcluindo] = useState('')

  useEffect(() => {
    if (!isOpen) {
      setView('list')
      setEditing(null)
      setFormData(null)
    }
  }, [isOpen])

  const abrirNovo = () => {
    setEditing(null)
    setFormData({
      nome_plano: '',
      cor: 'blue',
      ativo: 1,
      variacoes: [{ ...VARIACAO_VAZIA }],
    })
    setView('form')
  }

  const abrirEditar = useCallback(async (plano) => {
    setLoadingDetalhe(true)
    setEditing(plano)
    try {
      const detalhe = await buscarPlano(plano.name)
      setFormData({
        nome_plano: detalhe.nome_plano || '',
        cor: detalhe.cor || 'slate',
        ativo: detalhe.ativo ? 1 : 0,
        variacoes: (detalhe.variacoes || []).map((v) => ({
          name: v.name,
          duracao_meses: v.duracao_meses || 1,
          rotulo: v.rotulo || '',
          valor_bruto_a_vista: v.valor_bruto_a_vista || 0,
          valor_liquido_a_vista: v.valor_liquido_a_vista || 0,
          valor_bruto_a_prazo: v.valor_bruto_a_prazo || 0,
          valor_liquido_a_prazo: v.valor_liquido_a_prazo || 0,
        })),
      })
      if (!detalhe.variacoes?.length) {
        setFormData((f) => ({ ...f, variacoes: [{ ...VARIACAO_VAZIA }] }))
      }
      setView('form')
    } catch (e) {
      alert('Erro ao carregar plano: ' + (e.response?.data?.exception || e.message))
    } finally {
      setLoadingDetalhe(false)
    }
  }, [])

  const salvar = async () => {
    if (!formData?.nome_plano?.trim()) {
      alert('Informe o nome do plano.')
      return
    }
    if (!formData.variacoes?.length) {
      alert('Adicione pelo menos uma variação.')
      return
    }
    setSalvando(true)
    try {
      if (editing) {
        await salvarPlano(editing.name, formData)
      } else {
        await criarPlano(formData)
      }
      onMutate?.()
      setView('list')
    } catch (e) {
      alert('Erro ao salvar plano: ' + (e.response?.data?.exception || e.message))
    } finally {
      setSalvando(false)
    }
  }

  const excluir = async (plano) => {
    if (!window.confirm(`Excluir "${plano.nome_plano || plano.name}"?\n\nNão será possível se houver contratos vinculados.`)) return
    setExcluindo(plano.name)
    try {
      await excluirPlano(plano.name)
      onMutate?.()
    } catch (e) {
      alert(e.response?.data?.exception || e.response?.data?.message || e.message)
    } finally {
      setExcluindo('')
    }
  }

  const updateVariacao = (idx, patch) => {
    setFormData((f) => ({
      ...f,
      variacoes: f.variacoes.map((v, i) => (i === idx ? { ...v, ...patch } : v)),
    }))
  }

  const addVariacao = () => {
    setFormData((f) => ({ ...f, variacoes: [...f.variacoes, { ...VARIACAO_VAZIA }] }))
  }

  const removeVariacao = (idx) => {
    setFormData((f) => ({ ...f, variacoes: f.variacoes.filter((_, i) => i !== idx) }))
  }

  if (!isOpen) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={view === 'form' ? (editing ? 'Editar plano' : 'Novo plano') : 'Gerenciar planos'}
      size="xl"
      footer={
        view === 'form' ? (
          <>
            <Button variant="ghost" onClick={() => setView('list')} disabled={salvando}>
              Voltar
            </Button>
            <Button variant="primary" icon={Save} onClick={salvar} loading={salvando}>
              {editing ? 'Salvar alterações' : 'Criar plano'}
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose}>Fechar</Button>
            <Button variant="primary" icon={Plus} onClick={abrirNovo}>Novo plano</Button>
          </>
        )
      }
    >
      {view === 'list' ? (
        <PlanosLista
          planos={planos}
          onEdit={abrirEditar}
          onDelete={excluir}
          excluindo={excluindo}
          loadingDetalhe={loadingDetalhe}
        />
      ) : (
        <PlanoForm
          formData={formData}
          setFormData={setFormData}
          updateVariacao={updateVariacao}
          addVariacao={addVariacao}
          removeVariacao={removeVariacao}
        />
      )}
    </Modal>
  )
}

function PlanosLista({ planos, onEdit, onDelete, excluindo, loadingDetalhe }) {
  if (loadingDetalhe) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner />
      </div>
    )
  }

  if (!planos.length) {
    return (
      <div className="py-12 px-4">
        <EmptyState
          title="Nenhum plano cadastrado"
          description="Crie planos com valores e durações pra usar nos contratos."
        />
      </div>
    )
  }

  return (
    <div className="p-4 space-y-2">
      {planos.map((p) => (
        <div
          key={p.name}
          className="flex items-center justify-between p-3 bg-[#222226] border border-[#323238] rounded-xl hover:border-[#2563eb]/40 transition-colors group"
        >
          <button
            type="button"
            onClick={() => onEdit(p)}
            className="flex items-center gap-3 flex-1 min-w-0 text-left"
          >
            <span className={`w-3 h-3 rounded-full shrink-0 ${COLOR_DOT[p.cor] || COLOR_DOT.slate}`} />
            <div className="min-w-0 flex-1">
              <div className="font-bold text-white text-sm truncate">{p.nome_plano || p.name}</div>
              <div className="text-[10px] text-gray-500 mt-0.5 flex items-center gap-2">
                {p.ativo ? (
                  <span className="text-green-400">● Ativo</span>
                ) : (
                  <span className="text-gray-500">○ Inativo</span>
                )}
                <span>{p.name}</span>
              </div>
            </div>
            <ChevronRight size={14} className="text-gray-600 group-hover:text-white" />
          </button>
          <div className="flex gap-1.5 ml-2">
            <button
              onClick={() => onEdit(p)}
              title="Editar"
              className="h-7 w-7 flex items-center justify-center text-blue-400 hover:text-white hover:bg-blue-600 border border-[#323238] hover:border-blue-600 rounded-lg transition-colors"
            >
              <Edit2 size={12} />
            </button>
            <button
              onClick={() => onDelete(p)}
              disabled={excluindo === p.name}
              title="Excluir"
              className="h-7 w-7 flex items-center justify-center text-[#2563eb] hover:text-white border border-[#2563eb]/30 hover:bg-[#2563eb] rounded-lg transition-colors disabled:opacity-40"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

function PlanoForm({ formData, setFormData, updateVariacao, addVariacao, removeVariacao }) {
  if (!formData) return null

  return (
    <div className="p-4 md:p-5 space-y-5">
      {/* dados do plano */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2">
          <FormGroup label="Nome do plano" required>
            <Input
              value={formData.nome_plano}
              onChange={(v) => setFormData((f) => ({ ...f, nome_plano: v }))}
              placeholder="Ex: Plano Ouro"
            />
          </FormGroup>
        </div>
        <div>
          <FormGroup label="Status">
            <button
              type="button"
              onClick={() => setFormData((f) => ({ ...f, ativo: f.ativo ? 0 : 1 }))}
              className={`h-10 w-full px-3 inline-flex items-center justify-between rounded-lg border transition-colors ${
                formData.ativo
                  ? 'bg-green-500/10 border-green-500/30 text-green-400'
                  : 'bg-[#1a1a1a] border-[#323238] text-gray-400'
              }`}
            >
              <span className="text-sm font-semibold">{formData.ativo ? 'Ativo' : 'Inativo'}</span>
              {formData.ativo ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
            </button>
          </FormGroup>
        </div>
      </div>

      {/* cor */}
      <FormGroup label="Cor identificadora">
        <div className="flex flex-wrap gap-2">
          {ALLOWED_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setFormData((f) => ({ ...f, cor: c }))}
              title={c}
              className={`w-7 h-7 rounded-full border-2 transition-transform ${
                COLOR_DOT[c]
              } ${formData.cor === c ? 'border-white scale-110' : 'border-transparent hover:scale-105'}`}
            />
          ))}
        </div>
      </FormGroup>

      {/* variações */}
      <div className="border-t border-[#323238] pt-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-white font-semibold text-sm">Variações de duração</h4>
          <Button variant="secondary" size="sm" icon={Plus} onClick={addVariacao}>
            Adicionar variação
          </Button>
        </div>

        {!formData.variacoes.length ? (
          <p className="text-gray-500 text-xs italic">Clique em "Adicionar variação" para começar.</p>
        ) : (
          <div className="space-y-3">
            {formData.variacoes.map((v, idx) => (
              <VariacaoRow
                key={idx}
                variacao={v}
                idx={idx}
                onChange={(patch) => updateVariacao(idx, patch)}
                onRemove={() => removeVariacao(idx)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function VariacaoRow({ variacao, idx, onChange, onRemove }) {
  return (
    <div className="bg-[#222226] border border-[#323238] rounded-xl p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
          Variação {idx + 1}
        </div>
        <button
          type="button"
          onClick={onRemove}
          title="Remover"
          className="h-7 w-7 flex items-center justify-center text-gray-500 hover:text-white border border-[#323238] hover:border-[#2563eb] rounded-lg transition-colors"
        >
          <X size={12} />
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        <FormGroup label="Duração (meses)" required>
          <Input
            type="number"
            value={variacao.duracao_meses}
            onChange={(v) => onChange({ duracao_meses: parseInt(v) || 1 })}
          />
        </FormGroup>
        <FormGroup label="Rótulo" required>
          <Input
            value={variacao.rotulo}
            onChange={(v) => onChange({ rotulo: v })}
            placeholder="Ex: Semestral"
          />
        </FormGroup>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-[#323238]/60">
        <BlocoValores
          titulo="Valores à vista"
          hint="Se for Pix sem taxa, deixe os dois iguais."
          valorBruto={variacao.valor_bruto_a_vista}
          valorLiquido={variacao.valor_liquido_a_vista}
          onChangeBruto={(v) => onChange({ valor_bruto_a_vista: v })}
          onChangeLiquido={(v) => onChange({ valor_liquido_a_vista: v })}
        />
        <BlocoValores
          titulo="Valores a prazo"
          hint="Se não houver taxa, deixe os dois iguais."
          valorBruto={variacao.valor_bruto_a_prazo}
          valorLiquido={variacao.valor_liquido_a_prazo}
          onChangeBruto={(v) => onChange({ valor_bruto_a_prazo: v })}
          onChangeLiquido={(v) => onChange({ valor_liquido_a_prazo: v })}
        />
      </div>

      <PreviewVariacao variacao={variacao} />
    </div>
  )
}

function PreviewVariacao({ variacao }) {
  const { valor_liquido_a_vista, valor_liquido_a_prazo, duracao_meses } = variacao
  return (
    <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-400 bg-[#1a1a1a] rounded-lg px-3 py-2">
      {valor_liquido_a_vista > 0 && (
        <div>À vista: <span className="text-white font-bold">{formatCurrency(valor_liquido_a_vista)}</span></div>
      )}
      {valor_liquido_a_prazo > 0 && duracao_meses > 0 && (
        <div>
          Parcelado: <span className="text-white font-bold">{formatCurrency(valor_liquido_a_prazo)}</span>
          <span className="text-gray-500 ml-1">({duracao_meses}x {formatCurrency(valor_liquido_a_prazo / duracao_meses)})</span>
        </div>
      )}
    </div>
  )
}

function BlocoValores({
  titulo, hint, valorBruto, valorLiquido, onChangeBruto, onChangeLiquido,
}) {
  const bruto = parseFloat(valorBruto) || 0
  const liquido = parseFloat(valorLiquido) || 0
  const taxa = bruto > 0 ? bruto - liquido : 0
  const taxaPct = bruto > 0 && taxa > 0 ? (taxa / bruto) * 100 : 0
  const igualados = bruto > 0 && bruto === liquido
  const podeIgualar = bruto > 0 && bruto !== liquido

  return (
    <div className="bg-[#1a1a1a] border border-[#323238] rounded-xl p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{titulo}</p>
        <button
          type="button"
          onClick={() => onChangeLiquido(bruto)}
          disabled={!podeIgualar}
          title="Copiar 'Cliente paga' para 'Você recebe'"
          className="inline-flex items-center gap-1 h-6 px-2 rounded-lg border border-[#323238] text-[10px] font-bold text-gray-400 hover:text-white hover:border-[#2563eb] hover:bg-[#2563eb]/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:border-[#323238] disabled:hover:text-gray-400"
        >
          <Equal size={10} /> Igualar
        </button>
      </div>

      <FormGroup label="Cliente paga (bruto)">
        <Input
          type="number"
          value={valorBruto}
          onChange={(v) => onChangeBruto(parseFloat(v) || 0)}
          placeholder="0,00"
        />
      </FormGroup>

      <FormGroup label="Você recebe (líquido)">
        <Input
          type="number"
          value={valorLiquido}
          onChange={(v) => onChangeLiquido(parseFloat(v) || 0)}
          placeholder="0,00"
        />
      </FormGroup>

      <div className="flex items-center justify-between text-[10px] min-h-[16px]">
        <span className="text-gray-500">{hint}</span>
        {igualados ? (
          <span className="text-green-400 font-semibold">Sem taxa</span>
        ) : taxa > 0 ? (
          <span className="text-yellow-400 font-semibold">
            Taxa: {formatCurrency(taxa)} ({taxaPct.toFixed(1)}%)
          </span>
        ) : null}
      </div>
    </div>
  )
}
