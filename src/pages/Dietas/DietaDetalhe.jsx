import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Save, Copy, Trash2, Plus, Search,
  ChevronDown, ChevronUp, X, Loader, Check,
  Edit2, RotateCcw
} from 'lucide-react'
import { buscarDieta, salvarDieta, duplicarDieta } from '../../api/dietas'
import { listarAlimentos } from '../../api/dietas'
import { Card, Badge, Spinner, Button, Modal } from '../../components/ui'
import { tw } from '../../styles/tokens'

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (v, dec = 0) => v != null ? Number(v).toFixed(dec) : '0'
const formatDate = (d) => {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

function calcMacros(item, peso) {
  const ref = item.ref_weight || 100
  const fator = peso / ref
  return {
    protein:      Math.round((item.protein      || 0) * fator),
    carbohydrate: Math.round((item.carbohydrate || 0) * fator),
    lipid:        Math.round((item.lipid        || 0) * fator),
    fiber:        Math.round((item.fiber        || 0) * fator),
    calories:     Math.round((item.calories     || 0) * fator),
  }
}

// ─── Modal Buscar Alimento ─────────────────────────────────────────────────────
function ModalBuscarAlimento({ onClose, onSelecionar }) {
  const [busca, setBusca] = useState('')
  const [alimentos, setAlimentos] = useState([])
  const [loading, setLoading] = useState(false)

  const pesquisar = useCallback(async () => {
    if (busca.length < 2) return
    setLoading(true)
    try {
      const res = await listarAlimentos({ busca })
      setAlimentos(res.list)
    } catch {} finally { setLoading(false) }
  }, [busca])

  useEffect(() => {
    const t = setTimeout(pesquisar, 400)
    return () => clearTimeout(t)
  }, [pesquisar])

  return (
    <Modal title="Adicionar Alimento" onClose={onClose} size="md">
      <div className="p-5">
        <div className="relative mb-4">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            autoFocus
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar alimento..."
            className={`${tw.input} pl-10`}
          />
        </div>
        <div className="space-y-1 max-h-80 overflow-y-auto">
          {loading && <Spinner size={20} />}
          {!loading && alimentos.map(a => (
            <button key={a.name}
              onClick={() => onSelecionar(a)}
              className="w-full text-left px-4 py-3 rounded-lg hover:bg-[#323238] transition-colors flex items-center justify-between group"
            >
              <div>
                <p className="text-white text-sm font-medium">{a.food_name || a.name}</p>
                <p className="text-gray-500 text-xs mt-0.5">
                  {a.calories} kcal · P:{a.protein}g C:{a.carbohydrates || a.carbohydrate}g G:{a.fat || a.lipid}g
                </p>
              </div>
              <Plus size={15} className="text-gray-600 group-hover:text-white transition-colors" />
            </button>
          ))}
          {!loading && busca.length >= 2 && alimentos.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-6">Nenhum alimento encontrado.</p>
          )}
          {busca.length < 2 && (
            <p className="text-gray-600 text-sm text-center py-6">Digite pelo menos 2 caracteres para buscar.</p>
          )}
        </div>
      </div>
    </Modal>
  )
}

// ─── Modal Duplicar ────────────────────────────────────────────────────────────
function ModalDuplicar({ dieta, onClose, onDuplicar }) {
  const [modo, setModo] = useState('mesmo')
  const [dataInicial, setDataInicial] = useState('')
  const [dataFinal, setDataFinal] = useState('')
  const [salvando, setSalvando] = useState(false)

  async function handleDuplicar() {
    setSalvando(true)
    try {
      await onDuplicar(modo === 'mesmo' ? null : 'novo', dataInicial || null, dataFinal || null)
      onClose()
    } catch {
      alert('Erro ao duplicar.')
    } finally { setSalvando(false) }
  }

  return (
    <Modal title="Duplicar Dieta" onClose={onClose} size="sm">
      <div className="p-5 space-y-4">
        <p className="text-gray-400 text-sm">
          Duplicando dieta de <span className="text-white font-semibold">{dieta.nome_completo}</span>
        </p>

        <div>
          <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">Vincular a</p>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setModo('mesmo')}
              className={`py-2 rounded-lg text-sm font-medium border transition-all ${modo === 'mesmo' ? 'bg-[#850000] border-[#850000] text-white' : 'border-[#323238] text-gray-400 hover:text-white'}`}>
              Mesmo Aluno
            </button>
            <button onClick={() => setModo('novo')}
              className={`py-2 rounded-lg text-sm font-medium border transition-all ${modo === 'novo' ? 'bg-[#850000] border-[#850000] text-white' : 'border-[#323238] text-gray-400 hover:text-white'}`}>
              Novo Aluno
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1.5">Data Inicial</p>
            <input type="date" value={dataInicial} onChange={e => setDataInicial(e.target.value)} className={tw.input} />
          </div>
          <div>
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1.5">Data Final</p>
            <input type="date" value={dataFinal} onChange={e => setDataFinal(e.target.value)} className={tw.input} />
          </div>
        </div>

        <p className="text-gray-600 text-xs">Os dados de peso, altura, idade e sexo serão atualizados com as informações mais recentes do aluno.</p>
      </div>
      <div className="px-5 py-4 border-t border-[#323238] flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button variant="primary" onClick={handleDuplicar} loading={salvando}>Duplicar</Button>
      </div>
    </Modal>
  )
}

// ─── Linha de Alimento ─────────────────────────────────────────────────────────
function LinhaAlimento({ item, idx, onUpdate, onDelete, onDuplicate }) {
  const [editPeso, setEditPeso] = useState(false)
  const [peso, setPeso] = useState(item.weight || item.ref_weight || 100)

  function salvarPeso() {
    const macros = calcMacros({
      ref_weight:   item.ref_weight || 100,
      protein:      item.protein,
      carbohydrate: item.carbohydrate,
      lipid:        item.lipid,
      fiber:        item.fiber,
      calories:     item.calories,
    }, Number(peso))
    onUpdate({ ...item, weight: Number(peso), ...macros })
    setEditPeso(false)
  }

  return (
    <tr className={`${tw.tbodyRow} ${item.substitute ? 'bg-[#1f1f24]' : ''}`}>
      <td className="px-3 py-2 text-center">
        <span className="text-gray-600 text-xs">{idx + 1}</span>
        {item.substitute === 1 && (
          <div className="mt-0.5">
            <Badge variant="orange" size="sm">OU</Badge>
          </div>
        )}
      </td>
      <td className="px-3 py-2">
        <p className="text-white text-sm">{item.food}</p>
        {item.medida_caseira && (
          <p className="text-gray-500 text-xs">{item.medida_caseira}</p>
        )}
      </td>
      <td className="px-2 py-2 text-center">
        {editPeso ? (
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={peso}
              onChange={e => setPeso(e.target.value)}
              onBlur={salvarPeso}
              onKeyDown={e => e.key === 'Enter' && salvarPeso()}
              autoFocus
              className="w-16 bg-[#1a1a1a] border border-[#850000]/60 rounded px-2 py-1 text-white text-xs text-center outline-none"
            />
          </div>
        ) : (
          <button onClick={() => setEditPeso(true)} className="text-white text-sm hover:text-[#850000] transition-colors font-mono">
            {item.weight || item.ref_weight || 100}
          </button>
        )}
      </td>
      <td className="px-2 py-2 text-center text-gray-400 text-xs">{item.unit || 'g'}</td>
      <td className="px-2 py-2 text-center text-gray-500 text-xs">{item.medida_caseira || '—'}</td>
      <td className="px-2 py-2 text-center text-blue-400 text-xs font-mono">{item.protein}</td>
      <td className="px-2 py-2 text-center text-yellow-400 text-xs font-mono">{item.carbohydrate}</td>
      <td className="px-2 py-2 text-center text-red-400 text-xs font-mono">{item.lipid}</td>
      <td className="px-2 py-2 text-center text-gray-400 text-xs font-mono">{item.fiber}</td>
      <td className="px-2 py-2 text-center text-orange-400 text-xs font-mono font-bold">{item.calories}</td>
      <td className="px-2 py-2">
        <div className="flex items-center gap-1 justify-center">
          <button onClick={() => onDuplicate(item, false)} title="Duplicar" className="w-6 h-6 flex items-center justify-center rounded text-gray-500 hover:text-white hover:bg-[#323238] transition-colors">
            <Copy size={12} />
          </button>
          <button onClick={() => onDuplicate(item, true)} title="Adicionar como substituto" className="w-6 h-6 flex items-center justify-center rounded text-yellow-600 hover:text-yellow-400 hover:bg-[#323238] transition-colors">
            <RotateCcw size={12} />
          </button>
          <button onClick={() => onDelete(item.name)} title="Excluir" className="w-6 h-6 flex items-center justify-center rounded text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
            <Trash2 size={12} />
          </button>
        </div>
      </td>
    </tr>
  )
}

// ─── Bloco de Opção ────────────────────────────────────────────────────────────
function BlocoOpcao({ mealNum, opcaoNum, dieta, onChange }) {
  const key = `meal_${mealNum}_option_${opcaoNum}_items`
  const items = dieta[key] || []
  const legendKey = `meal_${mealNum}_option_${opcaoNum}_legend`
  const labelKey = `meal_${mealNum}_option_${opcaoNum}_label`
  const [showBusca, setShowBusca] = useState(false)

  const totalMacros = items.reduce((acc, i) => ({
    protein:      acc.protein      + (i.protein      || 0),
    carbohydrate: acc.carbohydrate + (i.carbohydrate || 0),
    lipid:        acc.lipid        + (i.lipid        || 0),
    fiber:        acc.fiber        + (i.fiber        || 0),
    calories:     acc.calories     + (i.calories     || 0),
  }), { protein: 0, carbohydrate: 0, lipid: 0, fiber: 0, calories: 0 })

  function updateItem(updated) {
    const novos = items.map(i => i.name === updated.name ? updated : i)
    onChange(key, novos)
  }

  function deleteItem(name) {
    onChange(key, items.filter(i => i.name !== name))
  }

  function duplicateItem(item, asSubstitute) {
    const novo = {
      ...item,
      name: `new_${Date.now()}_${Math.random()}`,
      substitute: asSubstitute ? 1 : 0,
    }
    onChange(key, [...items, novo])
  }

  function adicionarAlimento(alimento) {
    const novo = {
      name: `new_${Date.now()}`,
      food: alimento.food_name || alimento.name,
      ref_weight: alimento.ref_weight || 100,
      weight: alimento.ref_weight || 100,
      unit: 'g',
      substitute: 0,
      protein:      alimento.protein      || 0,
      carbohydrate: alimento.carbohydrates || alimento.carbohydrate || 0,
      lipid:        alimento.fat          || alimento.lipid        || 0,
      fiber:        alimento.fiber        || 0,
      calories:     alimento.calories     || 0,
    }
    onChange(key, [...items, novo])
    setShowBusca(false)
  }

  return (
    <div className="border border-[#323238] rounded-xl overflow-hidden mb-3">
      {showBusca && <ModalBuscarAlimento onClose={() => setShowBusca(false)} onSelecionar={adicionarAlimento} />}

      {/* Header opção */}
      <div className="bg-[#1a1a1a] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-white text-xs font-bold uppercase tracking-wider">
            {dieta[labelKey] || `Opção ${opcaoNum}`}
          </span>
          <input
            value={dieta[legendKey] || ''}
            onChange={e => onChange(legendKey, e.target.value)}
            placeholder="Legenda (Ex: Consumir 40min antes do treino)"
            className="bg-transparent text-gray-500 text-xs outline-none placeholder-gray-700 w-72 hover:text-gray-300 focus:text-white transition-colors"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-orange-400 text-xs font-bold">{totalMacros.calories} kcal</span>
          <span className="text-blue-400 text-xs">P:{totalMacros.protein}</span>
          <span className="text-yellow-400 text-xs">C:{totalMacros.carbohydrate}</span>
          <span className="text-red-400 text-xs">G:{totalMacros.lipid}</span>
        </div>
      </div>

      {/* Tabela */}
      {items.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={tw.thead}>
                <th className="px-3 py-2 text-xs text-center w-8">#</th>
                <th className="px-3 py-2 text-xs text-left">ALIMENTO</th>
                <th className="px-2 py-2 text-xs text-center w-16">QTD.</th>
                <th className="px-2 py-2 text-xs text-center w-12">UNID.</th>
                <th className="px-2 py-2 text-xs text-center w-24">MED. CAS.</th>
                <th className="px-2 py-2 text-xs text-center w-14 text-blue-400">PROT.</th>
                <th className="px-2 py-2 text-xs text-center w-14 text-yellow-400">CARB.</th>
                <th className="px-2 py-2 text-xs text-center w-14 text-red-400">GORD.</th>
                <th className="px-2 py-2 text-xs text-center w-12 text-gray-400">FIB.</th>
                <th className="px-2 py-2 text-xs text-center w-16 text-orange-400">KCAL</th>
                <th className="px-2 py-2 text-xs text-center w-20">AÇÕES</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <LinhaAlimento
                  key={item.name}
                  item={item}
                  idx={i}
                  onUpdate={updateItem}
                  onDelete={deleteItem}
                  onDuplicate={duplicateItem}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Botões */}
      <div className="px-4 py-3 border-t border-[#323238] flex items-center gap-2 flex-wrap">
        <button onClick={() => setShowBusca(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 text-xs font-medium transition-colors">
          <Plus size={12} /> Adicionar Linha
        </button>
      </div>

      {/* Totais */}
      <div className="px-4 py-3 bg-[#1a1a1a] border-t border-[#323238]">
        <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">Macros Totais da Opção</p>
        <div className="grid grid-cols-5 gap-4">
          {[
            { label: 'Prot (g)', value: totalMacros.protein, color: 'text-blue-400' },
            { label: 'Carbs (g)', value: totalMacros.carbohydrate, color: 'text-yellow-400' },
            { label: 'Gord (g)', value: totalMacros.lipid, color: 'text-red-400' },
            { label: 'kcal', value: totalMacros.calories, color: 'text-orange-400' },
            { label: 'Fibra (g)', value: totalMacros.fiber, color: 'text-gray-400' },
          ].map(m => (
            <div key={m.label}>
              <p className="text-gray-600 text-xs">{m.label}</p>
              <p className={`${m.color} text-sm font-bold`}>{m.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Bloco de Refeição ─────────────────────────────────────────────────────────
function BlocoRefeicao({ mealNum, dieta, onChange }) {
  const habilitada = !!dieta[`meal_${mealNum}`]
  const label = dieta[`meal_${mealNum}_label`] || `Refeição ${mealNum}`
  const [aberta, setAberta] = useState(habilitada)

  const opcoes = []
  for (let o = 1; o <= 10; o++) {
    if (dieta[`meal_${mealNum}_option_${o}`] !== undefined) {
      opcoes.push(o)
    }
  }
  const opcoesAtivas = opcoes.filter(o => dieta[`meal_${mealNum}_option_${o}`] === 1)

  function toggleRefeicao() {
    onChange(`meal_${mealNum}`, habilitada ? 0 : 1)
    if (!habilitada) setAberta(true)
  }

  function adicionarOpcao() {
    const proxima = opcoesAtivas.length + 1
    if (proxima > 10) return
    const num = opcoesAtivas[opcoesAtivas.length - 1] + 1 || 1
    onChange(`meal_${mealNum}_option_${num}`, 1)
  }

  return (
    <Card className="overflow-hidden mb-3">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4">
        <button onClick={() => habilitada && setAberta(!aberta)} className="flex items-center gap-3 flex-1 text-left">
          <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${habilitada ? 'bg-[#850000]' : 'bg-gray-600'}`} />
          <span className={`text-sm font-semibold ${habilitada ? 'text-white' : 'text-gray-500'}`}>{label}</span>
          {habilitada && (aberta ? <ChevronUp size={15} className="text-gray-500" /> : <ChevronDown size={15} className="text-gray-500" />)}
        </button>
        <button onClick={toggleRefeicao}
          className={`text-xs px-3 py-1 rounded-lg border font-medium transition-all ${habilitada ? 'border-red-500/30 text-red-400 hover:bg-red-500/10' : 'border-[#323238] text-gray-500 hover:text-white hover:border-gray-500'}`}>
          {habilitada ? 'Desabilitar' : 'Habilitar'}
        </button>
      </div>

      {/* Conteúdo */}
      {habilitada && aberta && (
        <div className="border-t border-[#323238] px-5 py-4">
          {opcoesAtivas.map(opcaoNum => (
            <BlocoOpcao
              key={opcaoNum}
              mealNum={mealNum}
              opcaoNum={opcaoNum}
              dieta={dieta}
              onChange={onChange}
            />
          ))}

          <button onClick={adicionarOpcao}
            className="w-full py-3 border border-dashed border-[#323238] rounded-xl text-gray-500 hover:text-white hover:border-gray-500 text-sm transition-colors flex items-center justify-center gap-2">
            <Plus size={14} /> Adicionar Opção
          </button>
        </div>
      )}
    </Card>
  )
}

// ─── Componente Principal ──────────────────────────────────────────────────────
export default function DietaDetalhe() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [dieta, setDieta] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showDuplicar, setShowDuplicar] = useState(false)

  useEffect(() => { fetchDieta() }, [id])

  async function fetchDieta() {
    setLoading(true)
    try {
      const data = await buscarDieta(id)
      setDieta(data)
    } catch (err) {
      console.error(err)
    } finally { setLoading(false) }
  }

  function onChange(field, value) {
    setDieta(prev => ({ ...prev, [field]: value }))
  }

  async function handleSalvar() {
    setSaving(true)
    try {
      await salvarDieta(id, dieta)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      alert('Erro ao salvar: ' + err.message)
    } finally { setSaving(false) }
  }

  async function handleDuplicar(novoAluno, dataInicial, dataFinal) {
    await duplicarDieta(id, novoAluno, dataInicial, dataFinal)
    navigate('/dietas')
  }

  // Calcula totais gerais
  const totais = !dieta ? null : (() => {
    let protein = 0, carbohydrate = 0, lipid = 0, fiber = 0, calories = 0
    for (let m = 1; m <= 8; m++) {
      if (!dieta[`meal_${m}`]) continue
      const opcao1Items = dieta[`meal_${m}_option_1_items`] || []
      opcao1Items.forEach(i => {
        protein      += i.protein      || 0
        carbohydrate += i.carbohydrate || 0
        lipid        += i.lipid        || 0
        fiber        += i.fiber        || 0
        calories     += i.calories     || 0
      })
    }
    return { protein, carbohydrate, lipid, fiber, calories }
  })()

  if (loading) return <div className="p-8"><Spinner /></div>
  if (!dieta) return <div className="p-8 text-red-400">Dieta não encontrada.</div>

  return (
    <div className="flex flex-col h-full">

      {/* Conteúdo scrollável */}
      <div className="flex-1 overflow-auto p-8 pb-24">

        {/* Voltar */}
        <button onClick={() => navigate('/dietas')} className={`flex items-center gap-2 ${tw.meta} hover:text-white transition-colors text-sm mb-5`}>
          <ArrowLeft size={16} /> Voltar para Dietas
        </button>

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className={`${tw.title} text-2xl font-bold`}>
              {dieta.nome_completo || dieta.aluno || 'Dieta'}
            </h1>
            <p className={`${tw.meta} text-sm mt-1`}>
              {dieta.strategy || dieta.estrategia}
              {(dieta.week_days || dieta.dias_semana) && ` · ${dieta.week_days || dieta.dias_semana}`}
            </p>
            <p className={`${tw.disabled} text-xs mt-0.5`}>
              {formatDate(dieta.date || dieta.data_inicial)}
              {dieta.data_final && ` → ${formatDate(dieta.data_final)}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {saved && (
              <span className="text-green-400 text-xs flex items-center gap-1">
                <Check size={12} /> Salvo!
              </span>
            )}
            <Button variant="secondary" size="sm" icon={Copy} onClick={() => setShowDuplicar(true)}>
              Duplicar
            </Button>
            <Button variant="primary" size="sm" icon={Save} onClick={handleSalvar} loading={saving}>
              Salvar
            </Button>
          </div>
        </div>

        {/* Observações */}
        {dieta.obs && (
          <Card className="p-4 mb-4">
            <p className={`${tw.meta} text-xs font-semibold uppercase tracking-wider mb-1`}>Orientações</p>
            <p className={`${tw.body} text-sm whitespace-pre-line`}>{dieta.obs}</p>
          </Card>
        )}

        {/* Refeições */}
        {[1,2,3,4,5,6,7,8].map(m => (
          <BlocoRefeicao key={m} mealNum={m} dieta={dieta} onChange={onChange} />
        ))}
      </div>

      {/* Barra de totais fixa */}
      {totais && (
        <div className="fixed bottom-0 left-64 right-0 bg-[#1a1a1a] border-t border-[#323238] px-8 py-3 flex items-center justify-between z-30">
          <div className="flex items-center gap-6">
            <span className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Totais:</span>
            <span className="text-blue-400 text-sm font-bold">Prot: {totais.protein}g</span>
            <span className="text-red-400 text-sm font-bold">Líp: {totais.lipid}g</span>
            <span className="text-yellow-400 text-sm font-bold">Carb: {totais.carbohydrate}g</span>
            <span className="text-gray-400 text-sm font-bold">Fib: {totais.fiber}g</span>
            <span className="bg-[#850000] text-white text-sm font-bold px-3 py-1 rounded-lg">
              Kcal: {totais.calories}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Relativos:</span>
            {totais.calories > 0 && (
              <>
                <span className="text-blue-400 text-xs">PTN: {((totais.protein * 4 / totais.calories) * 100).toFixed(1)}%</span>
                <span className="text-red-400 text-xs">LIP: {((totais.lipid * 9 / totais.calories) * 100).toFixed(1)}%</span>
                <span className="text-yellow-400 text-xs">CHO: {((totais.carbohydrate * 4 / totais.calories) * 100).toFixed(1)}%</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal duplicar */}
      {showDuplicar && (
        <ModalDuplicar
          dieta={dieta}
          onClose={() => setShowDuplicar(false)}
          onDuplicar={handleDuplicar}
        />
      )}
    </div>
  )
}