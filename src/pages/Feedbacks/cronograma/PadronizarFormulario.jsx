import { useState, useMemo, useEffect } from 'react'
import { Wand2 } from 'lucide-react'
import { Button, FormGroup, Input, Select } from '../../../components/ui'
import { listarConjuntos } from '../../../api/conjuntos'
import { gerarDatasSerie } from './serie'

const DIAS_SEMANA_OPTS = [
  { value: '', label: 'Qualquer dia' },
  { value: '0', label: 'Domingo' },
  { value: '1', label: 'Segunda-feira' },
  { value: '2', label: 'Terça-feira' },
  { value: '3', label: 'Quarta-feira' },
  { value: '4', label: 'Quinta-feira' },
  { value: '5', label: 'Sexta-feira' },
  { value: '6', label: 'Sábado' },
]

/**
 * Formulário "Padronizar Datas" — cria várias datas de uma vez seguindo
 * um padrão. Pode ser usado dentro de um Modal (ModalGerarSerie) ou
 * inline (modo Lista do card de Calendário).
 */
export default function PadronizarFormulario({
  formularios, planStart, planEnd, feriasList,
  onGerar,
  showFooter = true,
  compactPreview = false,
}) {
  const formularioPadrao = formularios.find(f => f.enabled !== 0)?.name
                       || formularios[0]?.name
                       || ''

  const [modo, setModo] = useState('periodico')
  const [form, setForm] = useState({
    data_inicio: planStart || new Date().toISOString().slice(0, 10),
    intervalo: 2,
    unidade: 'semanas',
    dia_semana: '',
    data_fim: planEnd || '',
    formulario: formularioPadrao,
    dias_aviso: 1,
    pular_ferias: true,
    pular_feriados: true,
    conjunto_fotos: '',
    incluir_peso: true,
  })
  const [diasDoMes, setDiasDoMes] = useState([5, 20])
  const [conjuntos, setConjuntos] = useState([])

  useEffect(() => {
    listarConjuntos({ limit: 100 })
      .then(({ list }) => setConjuntos(list || []))
      .catch(() => {})
  }, [])

  // Ao trocar o formulário padrão, pré-preenche conjunto/peso com o que foi salvo
  // na aba Config dele. O profissional só mexe pra fugir do padrão nesta série.
  useEffect(() => {
    const f = formularios.find(x => x.name === form.formulario)
    if (!f) return
    setForm(p => ({
      ...p,
      conjunto_fotos: f.conjunto_fotos || '',
      incluir_peso: f.incluir_peso == null ? true : !!Number(f.incluir_peso),
    }))
  }, [form.formulario, formularios])

  // Espelha a vigência do plano: ao mudar Início/Fim em cima, reflete aqui.
  useEffect(() => {
    if (planStart) setForm(p => ({ ...p, data_inicio: planStart }))
  }, [planStart])
  useEffect(() => {
    if (planEnd) setForm(p => ({ ...p, data_fim: planEnd }))
  }, [planEnd])

  const datasPreview = useMemo(() => gerarDatasSerie({
    data_inicio: form.data_inicio,
    data_fim: form.data_fim,
    modo,
    intervalo: form.intervalo,
    unidade: form.unidade,
    dia_semana: form.dia_semana !== '' ? Number(form.dia_semana) : undefined,
    dias_do_mes: diasDoMes,
    pular_ferias: form.pular_ferias,
    pular_feriados: form.pular_feriados,
    feriasList,
  }), [form, modo, diasDoMes, feriasList])

  const datasValidas = datasPreview.filter(d => !d.emFerias && !d.emFeriado)
  const datasPuladas = datasPreview.filter(d => d.emFerias || d.emFeriado)

  const handleGerar = () => {
    if (!form.formulario) return
    if (datasValidas.length === 0) return
    const novas = datasValidas.map(d => ({
      date: d.iso,
      formulario: form.formulario,
      dias_aviso: Number(form.dias_aviso) || 1,
      status: 'Agendado',
      is_start: false,
      is_training: false,
      nota: '',
      observacao: '',
      conjunto_fotos: form.conjunto_fotos || '',
      incluir_peso: form.incluir_peso,
    }))
    onGerar(novas)
  }

  const toggleDia = (dia) => {
    setDiasDoMes(prev => prev.includes(dia)
      ? prev.filter(d => d !== dia)
      : [...prev, dia].sort((a, b) => a - b))
  }

  return (
    <div className="p-4 space-y-3">
      {/* Toggle de modo */}
      <div className="flex gap-1">
        <button onClick={() => setModo('periodico')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            modo === 'periodico'
              ? 'bg-[#850000] text-white'
              : 'bg-[#1a1a1a] text-gray-400 border border-[#323238] hover:text-white'
          }`}>A cada X dias/semanas</button>
        <button onClick={() => setModo('dias_do_mes')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            modo === 'dias_do_mes'
              ? 'bg-[#850000] text-white'
              : 'bg-[#1a1a1a] text-gray-400 border border-[#323238] hover:text-white'
          }`}>Dias fixos do mês</button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <FormGroup label="A partir de" required>
          <Input type="date" value={form.data_inicio}
            onChange={(v) => setForm(p => ({ ...p, data_inicio: v }))} />
        </FormGroup>
        <FormGroup label="Até" required>
          <Input type="date" value={form.data_fim}
            onChange={(v) => setForm(p => ({ ...p, data_fim: v }))} />
        </FormGroup>
      </div>

      {/* Modo periódico */}
      {modo === 'periodico' && (
        <div className="grid grid-cols-3 gap-2">
          <FormGroup label="A cada">
            <Input type="number" value={String(form.intervalo)}
              onChange={(v) => setForm(p => ({ ...p, intervalo: Number(v) || 1 }))} />
          </FormGroup>
          <FormGroup label="Unidade">
            <Select
              value={form.unidade}
              onChange={(v) => setForm(p => ({ ...p, unidade: v }))}
              options={[
                { value: 'semanas', label: 'Semanas' },
                { value: 'dias',    label: 'Dias' },
              ]}
            />
          </FormGroup>
          <FormGroup label="No dia">
            <Select
              value={form.dia_semana}
              onChange={(v) => setForm(p => ({ ...p, dia_semana: v }))}
              options={DIAS_SEMANA_OPTS}
            />
          </FormGroup>
        </div>
      )}

      {/* Modo dias do mês */}
      {modo === 'dias_do_mes' && (
        <FormGroup label="Selecione os dias do mês" hint="A série terá uma data em cada um dos dias selecionados, todo mês.">
          <div className="grid grid-cols-7 sm:grid-cols-10 gap-1">
            {Array.from({ length: 31 }, (_, i) => i + 1).map(dia => {
              const ativo = diasDoMes.includes(dia)
              return (
                <button
                  key={dia}
                  type="button"
                  onClick={() => toggleDia(dia)}
                  className={`h-9 rounded-lg text-xs font-bold transition-colors ${
                    ativo
                      ? 'bg-[#850000] text-white border border-[#850000]'
                      : 'bg-[#1a1a1a] text-gray-400 border border-[#323238] hover:text-white hover:border-gray-500'
                  }`}>{dia}</button>
              )
            })}
          </div>
          {diasDoMes.length === 0 && (
            <p className="text-[10px] text-yellow-400 mt-1.5">Selecione ao menos 1 dia.</p>
          )}
        </FormGroup>
      )}

      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-2">
          <FormGroup label="Formulário padrão" required>
            <Select
              value={form.formulario}
              onChange={(v) => setForm(p => ({ ...p, formulario: v }))}
              options={formularios.map(f => ({ value: f.name, label: f.titulo }))}
              placeholder="Selecione um formulário..."
            />
          </FormGroup>
        </div>
        <FormGroup label="Dias de aviso" hint="Quantos dias antes avisar">
          <Input type="number" value={String(form.dias_aviso)}
            onChange={(v) => setForm(p => ({ ...p, dias_aviso: Number(v) || 1 }))} />
        </FormGroup>
      </div>

      {/* Coleta de evolução — pré-preenchido do formulário; troque pra fugir do padrão */}
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-2">
          <FormGroup label="Conjunto de fotos" hint="Vem do formulário. Troque pra fugir do padrão nesta série.">
            <Select
              value={form.conjunto_fotos}
              onChange={(v) => setForm(p => ({ ...p, conjunto_fotos: v }))}
              options={conjuntos.map(c => ({ value: c.name, label: c.titulo }))}
              placeholder="Nenhum / padrão do profissional"
            />
          </FormGroup>
        </div>
        <FormGroup label="Peso">
          <label className="flex items-center gap-2 h-10 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.incluir_peso}
              onChange={(e) => setForm(p => ({ ...p, incluir_peso: e.target.checked }))}
              className="accent-[#2563eb] h-4 w-4"
            />
            <span className="text-xs text-gray-300 font-medium">Pedir</span>
          </label>
        </FormGroup>
      </div>

      <div className="space-y-1.5">
        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" checked={form.pular_feriados}
            onChange={(e) => setForm(p => ({ ...p, pular_feriados: e.target.checked }))} />
          <span className="text-xs text-gray-300 font-medium">Pular feriados nacionais</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" checked={form.pular_ferias}
            onChange={(e) => setForm(p => ({ ...p, pular_ferias: e.target.checked }))} />
          <span className="text-xs text-gray-300 font-medium">Pular períodos de férias cadastrados</span>
        </label>
      </div>

      {/* Preview */}
      <div className="bg-[#0a0a0a] border border-[#323238] rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">
            Pré-visualização
          </span>
          <span className="text-[10px] text-gray-400">
            {datasValidas.length} datas
            {datasPuladas.length > 0 && ` · ${datasPuladas.length} puladas`}
          </span>
        </div>
        {datasPreview.length === 0 ? (
          <p className="text-xs text-gray-600 italic">Preencha os campos acima.</p>
        ) : (
          <div className={`flex flex-wrap gap-1 overflow-y-auto ${compactPreview ? 'max-h-24' : 'max-h-32'}`}>
            {datasPreview.map((d, i) => {
              const pulada = d.emFerias || d.emFeriado
              const motivo = d.emFeriado ? `feriado${d.feriadoNome ? `: ${d.feriadoNome}` : ''}` : 'férias'
              return (
                <span key={i}
                  title={pulada ? `Pulada (${motivo})` : ''}
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                    pulada
                      ? 'bg-red-500/10 border-red-500/30 text-red-300/60 line-through'
                      : 'bg-[#1a1a1a] border-[#323238] text-gray-300'
                  }`}>
                  {d.iso.split('-').reverse().join('/')}
                </span>
              )
            })}
          </div>
        )}
      </div>

      <p className="text-[11px] text-gray-500">
        As datas geradas <span className="text-yellow-400/90 font-medium">substituem</span> o cronograma atual. É um modo alternativo ao calendário manual.
      </p>

      {showFooter && (
        <div className="flex justify-end pt-1">
          <Button variant="primary" icon={Wand2}
            onClick={handleGerar}
            disabled={datasValidas.length === 0 || !form.formulario}>
            Gerar {datasValidas.length} datas
          </Button>
        </div>
      )}
    </div>
  )
}
