import { useState, useEffect, useRef, useMemo } from 'react'
import {
  Plus, Search, Edit, Trash2, ToggleLeft, ToggleRight, RefreshCw, Copy,
  ChevronUp, ChevronDown, ArrowLeftRight,
} from 'lucide-react'
import {
  listarRefeicoesProntas, buscarRefeicaoPronta,
  criarRefeicaoPronta, salvarRefeicaoPronta,
  excluirRefeicaoPronta, toggleRefeicaoPronta,
  listarAlimentos,
} from '../../api/dietas'
import useAuthStore from '../../store/authStore'
import {
  Button, FormGroup, Input, Select, Modal, Spinner,
  DataTable, Badge, Autocomplete,
} from '../../components/ui'
import ListPage from '../../components/templates/ListPage'

const BASE_OWNERS = ['administrator', 'teste@shapefy.com']
const podeEditar = (owner) => !BASE_OWNERS.includes((owner || '').toLowerCase())

const fmt = (v, dec = 1) => v != null ? Number(v).toFixed(dec) : '0.0'
const uid = () => `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

const buscarAlimentosFn = async (query) => {
  const t = (query || '').trim()
  if (!t) return []
  const partes = t.split('%').map(s => s.trim()).filter(Boolean)
  const termoBusca = partes.join(' ')
  const res = await listarAlimentos({ busca: termoBusca, limit: 10 })
  let list = res.list || []
  if (t.includes('%') && partes.length) {
    const lowerParts = partes.map(p => p.toLowerCase())
    list = list.filter((a) => {
      const nome = (a.food || '').toLowerCase()
      let idx = 0
      for (const p of lowerParts) {
        const found = nome.indexOf(p, idx)
        if (found === -1) return false
        idx = found + p.length
      }
      return true
    })
  }
  return list
}

const renderAlimentoItem = (item) => (
  <>
    <div className="text-white text-sm font-medium">{item.food}</div>
    <div className="text-gray-500 text-[10px] mt-[2px]">
      P: {item.protein}g · C: {item.carbohydrate}g · G: {item.lipid}g · {item.calories} kcal
    </div>
  </>
)

// ─── Modal de edição de alimento ─────────────────────────────────────────────

function ModalEditarAlimento({ item, onSave, onClose }) {
  const [formData, setFormData] = useState({ ...item })
  const handleChange = (f, v) => setFormData(p => ({ ...p, [f]: v }))

  return (
    <Modal
      title="Editar Alimento"
      onClose={onClose}
      size="xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="info" onClick={() => onSave(formData)}>Salvar Alterações</Button>
        </>
      }
    >
      <div className="p-4 md:p-5 space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
          <div className="flex-1 w-full">
            <FormGroup label="Alimento">
              <Input value={formData.food || ''} disabled onChange={() => {}} />
            </FormGroup>
          </div>
          <div className="flex items-center gap-2 pb-2">
            <input type="checkbox" checked={formData.substitute === 1}
              onChange={e => handleChange('substitute', e.target.checked ? 1 : 0)}
              className="w-4 h-4 accent-[#0052cc] rounded" />
            <label className="text-sm text-white">É substituto</label>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <FormGroup label="Qtd. de Ref">
            <Input type="number" value={formData.ref_weight} onChange={v => handleChange('ref_weight', v)} />
          </FormGroup>
          <FormGroup label="Unidade">
            <Select value={formData.unit} onChange={v => handleChange('unit', v)} options={['g', 'ml', 'unidade']} placeholder="" />
          </FormGroup>
          <FormGroup label="Medida Caseira">
            <Input value={formData.medida_caseira || ''} onChange={v => handleChange('medida_caseira', v)} />
          </FormGroup>
          <FormGroup label="Peso Total">
            <Input type="number" value={formData.weight || ''} onChange={v => handleChange('weight', v)} />
          </FormGroup>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white mb-4 border-b border-[#323238] pb-2">Macronutrientes</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <FormGroup label="Proteína (g)"><Input type="number" value={formData.protein} onChange={v => handleChange('protein', v)} /></FormGroup>
            <FormGroup label="Carboidrato (g)"><Input type="number" value={formData.carbohydrate} onChange={v => handleChange('carbohydrate', v)} /></FormGroup>
            <FormGroup label="Gorduras Totais (g)"><Input type="number" value={formData.lipid} onChange={v => handleChange('lipid', v)} /></FormGroup>
            <FormGroup label="Fibras (g)"><Input type="number" value={formData.fiber} onChange={v => handleChange('fiber', v)} /></FormGroup>
            <FormGroup label="Valor Energético (kcal)"><Input type="number" value={formData.calories} onChange={v => handleChange('calories', v)} /></FormGroup>
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white mb-4 border-b border-[#323238] pb-2">Minerais</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[['calcium','Cálcio (mg)'],['copper','Cobre (mg)'],['iron','Ferro (mg)'],['phosphor','Fósforo (mg)'],
              ['magnesium','Magnésio (mg)'],['potassium','Potássio (mg)'],['selenium','Selênio (µg)'],
              ['sodium','Sódio (mg)'],['zinc','Zinco (mg)']].map(([f, l]) => (
              <FormGroup key={f} label={l}><Input type="number" value={formData[f] ?? ''} onChange={v => handleChange(f, v)} /></FormGroup>
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white mb-4 border-b border-[#323238] pb-2">Vitaminas</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[['vitamin_a','Vitamina A (µg)'],['vitamin_b1','Vitamina B1 (mg)'],['vitamin_b2','Vitamina B2 (mg)'],
              ['vitamin_b3','Vitamina B3 (mg)'],['vitamin_b6','Vitamina B6 (mg)'],['vitamin_b9','Vitamina B9 (µg)'],
              ['vitamin_b12','Vitamina B12 (µg)'],['vitamin_c','Vitamina C (mg)'],['vitamin_d','Vitamina D (µg)'],
              ['vitamin_e','Vitamina E (mg)']].map(([f, l]) => (
              <FormGroup key={f} label={l}><Input type="number" value={formData[f] ?? ''} onChange={v => handleChange(f, v)} /></FormGroup>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}

// ─── Editor de itens (TabelaAlimentos) ───────────────────────────────────────

function EditorItens({ items, onChange }) {
  const [exibirSubs, setExibirSubs] = useState(false)
  const [editingIdx, setEditingIdx] = useState(null)
  const visiveis = exibirSubs ? items : items.filter(i => !i.substitute)

  const addItem = (isSubstitute = false) => {
    onChange([...items, { __uid: uid(), food: '', substitute: isSubstitute ? 1 : 0, ref_weight: '', unit: 'g', weight: '', protein: 0, carbohydrate: 0, lipid: 0, fiber: 0, calories: 0 }])
  }

  const deleteItem = (idx) => {
    const arr = [...items]
    if (arr[idx]?.substitute === 1) { arr.splice(idx, 1) }
    else { let c = 1; while (arr[idx + c]?.substitute === 1) c++; arr.splice(idx, c) }
    onChange(arr)
  }

  const duplicateItem = (idx) => {
    const arr = [...items]
    const { name: _n, ...sem } = arr[idx]
    arr.splice(idx + 1, 0, { ...sem, medida_caseira: '', __uid: uid() })
    onChange(arr)
  }

  const addSubstituteBelow = (idx) => {
    const arr = [...items]
    arr.splice(idx + 1, 0, { __uid: uid(), food: '', substitute: 1, ref_weight: '', unit: 'g', weight: '', protein: 0, carbohydrate: 0, lipid: 0, fiber: 0, calories: 0 })
    onChange(arr)
    setExibirSubs(true)
  }

  const moveItem = (idx, dir) => {
    const arr = [...items]
    const target = idx + dir
    if (target < 0 || target >= arr.length) return
    ;[arr[idx], arr[target]] = [arr[target], arr[idx]]
    onChange(arr)
  }

  const updateItem = (idx, key, value) => {
    const arr = [...items]
    if (key === '__selecionarAlimento') {
      arr[idx] = { ...arr[idx], ...value }
    } else if (key === 'ref_weight') {
      if (!arr[idx]._base) arr[idx]._base = { ...arr[idx] }
      const novoPeso = parseInt(value, 10) || 0
      const pesoBase = parseFloat(arr[idx]._base.ref_weight) || 100
      const proporcao = pesoBase > 0 ? novoPeso / pesoBase : 0
      const calc = (val) => Math.round(Number(val || 0) * proporcao)
      arr[idx] = {
        ...arr[idx], [key]: value,
        protein: calc(arr[idx]._base.protein), carbohydrate: calc(arr[idx]._base.carbohydrate),
        lipid: calc(arr[idx]._base.lipid), fiber: calc(arr[idx]._base.fiber), calories: calc(arr[idx]._base.calories),
        calcium: calc(arr[idx]._base.calcium), copper: calc(arr[idx]._base.copper), iron: calc(arr[idx]._base.iron),
        phosphor: calc(arr[idx]._base.phosphor), magnesium: calc(arr[idx]._base.magnesium),
        potassium: calc(arr[idx]._base.potassium), selenium: calc(arr[idx]._base.selenium),
        sodium: calc(arr[idx]._base.sodium), zinc: calc(arr[idx]._base.zinc),
        vitamin_a: calc(arr[idx]._base.vitamin_a), vitamin_b1: calc(arr[idx]._base.vitamin_b1),
        vitamin_b2: calc(arr[idx]._base.vitamin_b2), vitamin_b3: calc(arr[idx]._base.vitamin_b3),
        vitamin_b6: calc(arr[idx]._base.vitamin_b6), vitamin_b9: calc(arr[idx]._base.vitamin_b9),
        vitamin_b12: calc(arr[idx]._base.vitamin_b12), vitamin_c: calc(arr[idx]._base.vitamin_c),
        vitamin_d: calc(arr[idx]._base.vitamin_d), vitamin_e: calc(arr[idx]._base.vitamin_e),
      }
    } else {
      arr[idx] = { ...arr[idx], [key]: value }
    }
    onChange(arr)
  }

  const macrosOpcao = items.reduce((acc, item) => {
    if (!item.substitute) {
      acc.prot += Number(item.protein || 0)
      acc.carb += Number(item.carbohydrate || 0)
      acc.lip  += Number(item.lipid || 0)
      acc.kcal += Number(item.calories || 0)
      acc.fib  += Number(item.fiber || 0)
    }
    return acc
  }, { prot: 0, carb: 0, lip: 0, kcal: 0, fib: 0 })

  return (
    <div className="bg-[#1a1a1a] border border-[#323238] rounded-lg mt-2">

      {editingIdx !== null && (
        <ModalEditarAlimento
          item={items[editingIdx]}
          onClose={() => setEditingIdx(null)}
          onSave={(updated) => { updateItem(editingIdx, '__selecionarAlimento', updated); setEditingIdx(null) }}
        />
      )}

      {items.length === 0 ? (
        <div className="p-6 border-b border-[#323238]">
          <p className="text-white text-sm">Adicione uma linha para exibir os campos</p>
        </div>
      ) : (
        <>
          {/* Desktop: tabela */}
          <div className="hidden md:block w-full overflow-x-auto">
            <table className="w-full text-xs border-separate border-spacing-y-0.5">
              <thead className="text-gray-500 uppercase bg-[#29292e] border-b border-[#323238]">
                <tr>
                  <th className="px-2 py-2 w-8 text-center">#</th>
                  <th className="px-2 py-2 min-w-[180px]">Alimento</th>
                  <th className="px-2 py-2 w-20">Qtd.</th>
                  <th className="px-2 py-2 w-24">Unid.</th>
                  <th className="px-2 py-2 w-28">Medida Cas.</th>
                  <th className="px-2 py-2 w-16">Prot.</th>
                  <th className="px-2 py-2 w-16">Carb.</th>
                  <th className="px-2 py-2 w-16">Gord.</th>
                  <th className="px-2 py-2 w-16">Fib.</th>
                  <th className="px-2 py-2 w-16">Kcal</th>
                  <th className="px-2 py-2 w-24 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#323238]/50">
                {visiveis.map((item, itemIdx) => {
                  const realIdx = item.__uid ? items.findIndex(i => i.__uid === item.__uid) : items.indexOf(item)
                  const temSubstitutoOculto = !exibirSubs && !item.substitute && items[realIdx + 1]?.substitute === 1
                  return (
                    <tr key={item.__uid || itemIdx}
                      className={`transition-colors ${item.substitute ? 'bg-red-500/10' : temSubstitutoOculto ? 'bg-[#2c2c31]' : 'bg-[#222226]'} hover:bg-[#2f2f35]`}>
                      <td className="px-2 py-2 rounded-l-lg">
                        <div className="flex items-center gap-1 justify-center">
                          <div className="flex flex-col items-center">
                            <button onClick={() => moveItem(realIdx, -1)} disabled={realIdx === 0}
                              className="h-4 w-5 flex items-center justify-center text-gray-500 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                              <ChevronUp size={11} />
                            </button>
                            <button onClick={() => moveItem(realIdx, +1)} disabled={realIdx === items.length - 1}
                              className="h-4 w-5 flex items-center justify-center text-gray-500 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                              <ChevronDown size={11} />
                            </button>
                          </div>
                          <span className="text-gray-600 font-mono text-xs">{realIdx + 1}</span>
                        </div>
                      </td>
                      <td className="px-2 py-1">
                        <div className="flex items-center gap-1.5">
                          {item.substitute === 1 && (
                            <span className="shrink-0 text-[9px] font-bold text-red-500 bg-red-500/10 border border-red-500/20 px-1 py-0.5 rounded uppercase">OU</span>
                          )}
                          <Autocomplete
                            compact
                            value={item.food || ''}
                            onChange={(v) => updateItem(realIdx, 'food', v)}
                            onSelect={(alimento) => {
                              const base = {
                                ref_weight: alimento.ref_weight ?? 100,
                                protein: alimento.protein ?? 0, carbohydrate: alimento.carbohydrate ?? 0,
                                lipid: alimento.lipid ?? 0, fiber: alimento.fiber ?? 0, calories: alimento.calories ?? 0,
                                calcium: alimento.calcium ?? 0, copper: alimento.copper ?? 0, iron: alimento.iron ?? 0,
                                phosphor: alimento.phosphor ?? 0, magnesium: alimento.magnesium ?? 0,
                                potassium: alimento.potassium ?? 0, selenium: alimento.selenium ?? 0,
                                sodium: alimento.sodium ?? 0, zinc: alimento.zinc ?? 0,
                                vitamin_a: alimento.vitamin_a ?? 0, vitamin_b1: alimento.vitamin_b1 ?? 0,
                                vitamin_b2: alimento.vitamin_b2 ?? 0, vitamin_b3: alimento.vitamin_b3 ?? 0,
                                vitamin_b6: alimento.vitamin_b6 ?? 0, vitamin_b9: alimento.vitamin_b9 ?? 0,
                                vitamin_b12: alimento.vitamin_b12 ?? 0, vitamin_c: alimento.vitamin_c ?? 0,
                                vitamin_d: alimento.vitamin_d ?? 0, vitamin_e: alimento.vitamin_e ?? 0,
                              }
                              updateItem(realIdx, '__selecionarAlimento', { food: alimento.food, food_json: JSON.stringify(alimento), _base: base, ...base })
                            }}
                            searchFn={buscarAlimentosFn}
                            renderItem={renderAlimentoItem}
                            placeholder="Buscar alimento..."
                          />
                        </div>
                      </td>
                      <td className="px-2 py-1">
                        <input type="number" value={item.ref_weight ?? ''} onChange={e => updateItem(realIdx, 'ref_weight', e.target.value)}
                          className="w-full h-7 px-2 bg-[#29292e] border border-[#323238] text-white rounded text-xs outline-none focus:border-[#2563eb]/60" />
                      </td>
                      <td className="px-2 py-1">
                        <select value={item.unit || 'g'} onChange={e => updateItem(realIdx, 'unit', e.target.value)}
                          className="w-full h-7 px-1 bg-[#29292e] border border-[#323238] text-white rounded text-xs outline-none focus:border-[#2563eb]/60 appearance-none">
                          <option>g</option><option>ml</option><option>unidade</option>
                        </select>
                      </td>
                      <td className="px-2 py-1">
                        <input value={item.medida_caseira || ''} onChange={e => updateItem(realIdx, 'medida_caseira', e.target.value)}
                          className="w-full h-7 px-2 bg-transparent border border-transparent hover:border-[#323238] focus:border-[#2563eb]/60 text-white rounded text-xs outline-none transition-colors" />
                      </td>
                      {['protein', 'carbohydrate', 'lipid', 'fiber', 'calories'].map(f => (
                        <td key={f} className="px-2 py-1">
                          <input type="number" value={item[f] ?? ''} onChange={e => updateItem(realIdx, f, e.target.value)}
                            className="w-full h-7 px-1 text-center bg-transparent border border-transparent hover:border-[#323238] focus:border-[#2563eb]/60 text-white rounded text-xs outline-none transition-colors" />
                        </td>
                      ))}
                      <td className="px-2 py-2 rounded-r-lg">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => setEditingIdx(realIdx)}
                            className="h-6 w-6 flex items-center justify-center bg-[#29292e] text-blue-400 hover:bg-blue-600 hover:text-white rounded transition-colors">
                            <Edit size={11} />
                          </button>
                          <button onClick={() => addSubstituteBelow(realIdx)} title="Adicionar substituto abaixo"
                            className="h-6 w-6 flex items-center justify-center bg-[#29292e] text-yellow-500 hover:bg-yellow-600 hover:text-white rounded transition-colors">
                            <ArrowLeftRight size={11} />
                          </button>
                          <button onClick={() => duplicateItem(realIdx)}
                            className="h-6 w-6 flex items-center justify-center bg-[#29292e] text-gray-400 hover:bg-gray-600 hover:text-white rounded transition-colors">
                            <Copy size={11} />
                          </button>
                          <button onClick={() => deleteItem(realIdx)}
                            className="h-6 w-6 flex items-center justify-center bg-[#29292e] text-red-400 hover:bg-red-600 hover:text-white rounded transition-colors">
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile: cards */}
          <div className="md:hidden flex flex-col divide-y divide-[#323238]/50">
            {visiveis.map((item, itemIdx) => {
              const realIdx = item.__uid ? items.findIndex(i => i.__uid === item.__uid) : items.indexOf(item)
              return (
                <div key={item.__uid || itemIdx} className={`px-3 py-2 ${item.substitute ? 'bg-red-500/10' : 'bg-[#222226]'}`}>
                  <div className="flex items-center gap-1.5">
                    {item.substitute === 1 && (
                      <span className="text-[9px] font-bold text-red-500 bg-red-500/10 border border-red-500/20 px-1 py-0.5 rounded uppercase shrink-0">OU</span>
                    )}
                    <div className="flex-1 min-w-0">
                      <Autocomplete
                        compact
                        value={item.food || ''}
                        onChange={(v) => updateItem(realIdx, 'food', v)}
                        onSelect={(alimento) => {
                          const base = { ref_weight: alimento.ref_weight ?? 100, protein: alimento.protein ?? 0, carbohydrate: alimento.carbohydrate ?? 0, lipid: alimento.lipid ?? 0, fiber: alimento.fiber ?? 0, calories: alimento.calories ?? 0 }
                          updateItem(realIdx, '__selecionarAlimento', { food: alimento.food, food_json: JSON.stringify(alimento), _base: base, ...base })
                        }}
                        searchFn={buscarAlimentosFn}
                        renderItem={renderAlimentoItem}
                        placeholder="Buscar alimento..."
                      />
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => duplicateItem(realIdx)} title="Duplicar"
                        className="h-6 w-6 flex items-center justify-center bg-[#29292e] text-gray-400 hover:bg-gray-600 hover:text-white rounded transition-colors">
                        <Copy size={11} />
                      </button>
                      <button onClick={() => addSubstituteBelow(realIdx)} title="Adicionar substituto abaixo"
                        className="h-6 w-6 flex items-center justify-center bg-[#29292e] text-yellow-500 hover:bg-yellow-600 hover:text-white rounded transition-colors">
                        <ArrowLeftRight size={11} />
                      </button>
                      <button onClick={() => deleteItem(realIdx)} title="Excluir"
                        className="h-6 w-6 flex items-center justify-center bg-[#29292e] text-red-400 hover:bg-red-600 hover:text-white rounded transition-colors">
                        <Trash2 size={11} />
                      </button>
                      <button onClick={() => setEditingIdx(realIdx)} title="Editar detalhes"
                        className="h-6 w-6 flex items-center justify-center bg-[#29292e] text-blue-400 hover:bg-blue-600 hover:text-white rounded transition-colors">
                        <Edit size={11} />
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-1.5 pl-0.5">
                    <div className="flex items-center gap-1">
                      <input type="number" value={item.ref_weight ?? ''} onChange={e => updateItem(realIdx, 'ref_weight', e.target.value)}
                        className="w-16 h-6 px-1 bg-[#29292e] border border-[#323238] text-white rounded text-[11px] text-center outline-none focus:border-[#2563eb]/60" />
                      <span className="text-[10px] text-gray-500">g</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <input type="number" value={item.calories ?? ''} onChange={e => updateItem(realIdx, 'calories', e.target.value)}
                        className="w-16 h-6 px-1 bg-[#29292e] border border-[#323238] text-white rounded text-[11px] text-center outline-none focus:border-[#2563eb]/60" />
                      <span className="text-[10px] text-gray-500">kcal</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          <button onClick={() => addItem(false)}
            className="md:hidden w-full py-2 text-gray-500 hover:text-white text-xs flex items-center justify-center gap-1.5 border-t border-dashed border-[#323238] hover:border-[#2563eb]/40 transition-colors">
            <Plus size={11} /> Adicionar alimento
          </button>
        </>
      )}

      {/* Macros totais */}
      {items.length > 0 && (
        <div className="px-4 py-3 border-t border-[#323238]">
          <p className="text-[10px] uppercase tracking-wider font-bold text-gray-500 mb-2">Macros Totais</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="text-gray-500 border-b border-[#323238]">
                <tr>
                  <th className="pb-1.5 font-medium pr-6">Prot (g)</th>
                  <th className="pb-1.5 font-medium pr-6">Carbs (g)</th>
                  <th className="pb-1.5 font-medium pr-6">Gord (g)</th>
                  <th className="pb-1.5 font-medium pr-6">kcal</th>
                  <th className="pb-1.5 font-medium">Fibra (g)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  {[['prot',1],['carb',1],['lip',1],['kcal',0],['fib',1]].map(([k, d]) => (
                    <td key={k} className="pt-1.5 pr-6">
                      <span className="text-white font-semibold">{fmt(macrosOpcao[k], d)}</span>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer actions */}
      <div className="flex flex-wrap gap-2 p-3 border-t border-[#323238]">
        <Button variant="info" size="xs" onClick={() => addItem(false)} className="hidden md:inline-flex">Adicionar Linha</Button>
        <Button variant="info" size="xs" onClick={() => { addItem(true); setExibirSubs(true) }} className="hidden md:inline-flex">Adicionar Substituto</Button>
        <Button variant="secondary" size="xs" onClick={() => setExibirSubs(s => !s)}>
          {exibirSubs ? 'Ocultar Substitutos' : 'Exibir Substitutos'}
        </Button>
      </div>
    </div>
  )
}

// ─── Modal criar / editar ─────────────────────────────────────────────────────

function ModalRefeicao({ refeicao, prefillItems, onSave, onClose }) {
  const { user } = useAuthStore()
  const isEdit = !!refeicao?.name && !prefillItems
  const [saving, setSaving] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(isEdit)
  const [erro, setErro] = useState('')
  const [nome, setNome] = useState(
    prefillItems ? `${refeicao?.full_name || ''} (cópia)`
    : isEdit ? (refeicao?.full_name || '')
    : ''
  )
  const [enabled, setEnabled] = useState(refeicao?.enabled ?? 1)
  const isPublic = 0
  const [items, setItems] = useState(prefillItems ?? [])

  useEffect(() => {
    if (!isEdit) return
    buscarRefeicaoPronta(refeicao.name).then(detail => {
      const loaded = (detail.table_foods || []).map(item => {
        const food_obj = item.food_json ? (() => { try { return JSON.parse(item.food_json) } catch { return null } })() : null
        return { ...item, __uid: uid(), _base: food_obj || { ...item } }
      })
      setNome(detail.full_name || refeicao.full_name || '')
      setEnabled(detail.enabled ?? 1)
      setItems(loaded)
      setLoadingDetail(false)
    }).catch(e => { console.error(e); setLoadingDetail(false) })
  }, [isEdit, refeicao?.name])

  const handleSave = async () => {
    if (!nome.trim()) { setErro('Nome é obrigatório.'); return }
    if (items.length === 0) { setErro('Adicione ao menos um alimento.'); return }
    setSaving(true); setErro('')
    try {
      const table_foods = items.map(({ __uid, _base, ...rest }) => {
        const { name: _n, ...item } = rest
        return item
      })
      const payload = { full_name: nome.trim(), enabled, public: isPublic, profissional: user, table_foods }
      if (isEdit) {
        await salvarRefeicaoPronta(refeicao.name, payload)
      } else {
        await criarRefeicaoPronta(payload)
      }
      onSave()
    } catch (e) {
      console.error(e)
      setErro(e?.response?.data?.exception || 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={isEdit ? 'Editar Refeição Pronta' : prefillItems ? 'Duplicar Refeição' : 'Nova Refeição Pronta'}
      size="2xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={handleSave} loading={saving}>Salvar</Button>
        </>
      }
    >
      <div className="p-4 space-y-4">
        {erro && (
          <div className="bg-red-900/20 border border-red-500/30 text-red-400 text-sm rounded-lg px-3 py-2">
            {erro}
          </div>
        )}

        <FormGroup label="Nome da Refeição" required>
          <Input value={nome} onChange={setNome} placeholder="Ex: Mingau de Aveia Proteico" />
        </FormGroup>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <button type="button" onClick={() => setEnabled(v => v ? 0 : 1)}
            className={`transition-colors ${enabled ? 'text-green-400' : 'text-gray-600'}`}>
            {enabled ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
          </button>
          <span className="text-sm text-gray-300">Ativa</span>
        </label>

        <div className="border-t border-[#323238] pt-2">
          {loadingDetail ? (
            <div className="flex justify-center py-6">
              <Spinner size="sm" />
            </div>
          ) : (
            <EditorItens items={items} onChange={setItems} />
          )}
        </div>
      </div>
    </Modal>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function RefeicoesProntasListagem() {
  const { user } = useAuthStore()
  const [refeicoes, setRefeicoes] = useState([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroAtivo, setFiltroAtivo] = useState('')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [modal, setModal] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [duplicando, setDuplicando] = useState(null)
  const debounceRef = useRef(null)
  const PAGE_SIZE = 30

  const carregar = async (opts = {}) => {
    setLoading(true)
    try {
      const { list, hasMore: more } = await listarRefeicoesProntas({
        busca: opts.busca ?? busca,
        enabled: opts.enabled ?? filtroAtivo,
        page: opts.page ?? page,
        limit: PAGE_SIZE,
      })
      setRefeicoes(list)
      setHasMore(more)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setPage(1)
      carregar({ busca, enabled: filtroAtivo, page: 1 })
    }, 400)
    return () => clearTimeout(debounceRef.current)
  }, [busca, filtroAtivo])

  const handleToggle = async (row) => {
    const novo = row.enabled ? 0 : 1
    setRefeicoes(prev => prev.map(r => r.name === row.name ? { ...r, enabled: novo } : r))
    try {
      await toggleRefeicaoPronta(row.name, novo)
    } catch (e) {
      console.error(e)
      setRefeicoes(prev => prev.map(r => r.name === row.name ? { ...r, enabled: row.enabled } : r))
    }
  }

  const handleDuplicar = async (row) => {
    setDuplicando(row.name)
    try {
      const detail = await buscarRefeicaoPronta(row.name)
      const prefillItems = (detail.table_foods || []).map(({ name: _n, ...item }) => {
        const food_obj = item.food_json ? (() => { try { return JSON.parse(item.food_json) } catch { return null } })() : null
        return { ...item, __uid: uid(), _base: food_obj || { ...item } }
      })
      setModal({ refeicao: { full_name: detail.full_name, enabled: detail.enabled }, prefillItems })
    } catch (e) {
      console.error(e)
      alert('Erro ao duplicar refeição.')
    } finally {
      setDuplicando(null)
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      await excluirRefeicaoPronta(confirmDelete.name)
      setConfirmDelete(null)
      carregar()
    } catch (e) {
      console.error(e)
      alert(e?.response?.data?.exception || 'Erro ao excluir.')
    } finally {
      setDeleting(false)
    }
  }

  const ativoOpts = [
    { value: '', label: 'Todas' },
    { value: '1', label: 'Ativas' },
    { value: '0', label: 'Inativas' },
  ]

  const columns = [
    {
      label: 'Nome',
      render: (row) => (
        <span className="text-white text-sm font-medium">{row.full_name || row.name}</span>
      ),
    },
    {
      label: 'Status',
      headerClass: 'hidden sm:table-cell',
      cellClass: 'hidden sm:table-cell',
      render: (row) => (
        <Badge variant={row.enabled ? 'success' : 'default'} size="sm">
          {row.enabled ? 'Ativa' : 'Inativa'}
        </Badge>
      ),
    },
    {
      label: 'Visib.',
      headerClass: 'hidden md:table-cell',
      cellClass: 'hidden md:table-cell',
      render: (row) => (
        <Badge variant={row.public ? 'info' : 'default'} size="sm">
          {row.public ? 'Pública' : 'Privada'}
        </Badge>
      ),
    },
    {
      label: 'Profissional',
      headerClass: 'hidden lg:table-cell',
      cellClass: 'hidden lg:table-cell',
      render: (row) => (
        <span className="text-gray-500 text-xs">{row.profissional || '—'}</span>
      ),
    },
    {
      label: 'Ações',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => handleToggle(row)}
            title={row.enabled ? 'Desativar' : 'Ativar'}
            className={`h-7 w-7 flex items-center justify-center border rounded-lg transition-colors
              ${row.enabled
                ? 'text-green-400 border-green-500/30 hover:bg-green-700 hover:border-green-700 hover:text-white'
                : 'text-gray-500 border-[#323238] hover:border-gray-500 hover:text-white'
              }`}
          >
            {row.enabled ? <ToggleRight size={12} /> : <ToggleLeft size={12} />}
          </button>
          {podeEditar(row.owner) ? (
            <>
              <button
                onClick={() => setModal({ refeicao: row })}
                title="Editar"
                className="h-7 w-7 flex items-center justify-center text-blue-400 hover:text-white hover:bg-blue-600 border border-[#323238] hover:border-blue-600 rounded-lg transition-colors"
              >
                <Edit size={12} />
              </button>
              <button
                onClick={() => setConfirmDelete(row)}
                title="Excluir"
                className="h-7 w-7 flex items-center justify-center text-[#850000] hover:text-white border border-[#850000]/30 hover:bg-[#850000] rounded-lg transition-colors"
              >
                <Trash2 size={12} />
              </button>
            </>
          ) : (
            <button
              onClick={() => handleDuplicar(row)}
              title="Duplicar para editar"
              disabled={duplicando === row.name}
              className="h-7 w-7 flex items-center justify-center text-gray-400 hover:text-white border border-[#323238] hover:border-gray-500 rounded-lg transition-colors disabled:opacity-50"
            >
              {duplicando === row.name
                ? <span className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" />
                : <Copy size={12} />
              }
            </button>
          )}
        </div>
      ),
    },
  ]

  return (
    <>
      <ListPage
        title="Cadastrar Refeições Prontas"
        subtitle="Gerencie suas refeições prontas para uso nas dietas"
        actions={
          <>
            <Button variant="secondary" size="sm" icon={RefreshCw} onClick={() => carregar()} />
            <Button variant="primary" size="sm" icon={Plus} onClick={() => setModal('novo')}>
              Nova Refeição
            </Button>
          </>
        }
        stats={[]}
        filters={[
          { type: 'search', value: busca, onChange: setBusca, placeholder: 'Buscar refeição...', icon: Search },
          { type: 'select', value: filtroAtivo, onChange: v => { setFiltroAtivo(v); setPage(1) }, options: ativoOpts, placeholder: 'Status' },
        ]}
        loading={loading}
        empty={
          refeicoes.length === 0 && !loading
            ? { title: 'Nenhuma refeição encontrada', description: 'Crie uma nova refeição pronta ou ajuste os filtros.' }
            : null
        }
        pagination={
          refeicoes.length > 0
            ? {
                page,
                pageSize: PAGE_SIZE,
                total: hasMore ? page * PAGE_SIZE + 1 : (page - 1) * PAGE_SIZE + refeicoes.length,
                onChange: (p) => { setPage(p); carregar({ page: p }) },
              }
            : null
        }
      >
        {!loading && refeicoes.length > 0 && (
          <DataTable columns={columns} rows={refeicoes} rowKey="name" />
        )}
      </ListPage>

      {(modal === 'novo' || modal?.refeicao) && (
        <ModalRefeicao
          refeicao={modal?.refeicao ?? null}
          prefillItems={modal?.prefillItems}
          onSave={() => { setModal(null); carregar() }}
          onClose={() => setModal(null)}
        />
      )}

      {confirmDelete && (
        <Modal
          isOpen
          onClose={() => setConfirmDelete(null)}
          title="Excluir Refeição"
          size="sm"
          footer={
            <>
              <Button variant="ghost" onClick={() => setConfirmDelete(null)}>Cancelar</Button>
              <Button variant="danger" onClick={handleDelete} loading={deleting}>Excluir</Button>
            </>
          }
        >
          <div className="p-4">
            <p className="text-gray-300 text-sm">
              Excluir <strong className="text-white">{confirmDelete.full_name}</strong>?
            </p>
            <p className="text-gray-500 text-xs mt-2">Esta ação não pode ser desfeita.</p>
          </div>
        </Modal>
      )}
    </>
  )
}
