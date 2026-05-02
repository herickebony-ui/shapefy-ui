import { useState, useMemo } from 'react'
import { Wand2 } from 'lucide-react'
import { Modal, Button, FormGroup, Input, Select } from '../../../components/ui'
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

export default function ModalGerarSerie({
  formularios, planEnd, feriasList,
  onGerar, onClose,
}) {
  const formularioPadrao = formularios.find(f => f.enabled !== 0)?.name
                       || formularios[0]?.name
                       || ''

  const [modo, setModo] = useState('periodico')
  const [form, setForm] = useState({
    data_inicio: new Date().toISOString().slice(0, 10),
    intervalo: 2,
    unidade: 'semanas',
    dia_semana: '',
    data_fim: planEnd || '',
    formulario: formularioPadrao,
    pular_ferias: true,
    pular_feriados: true,
  })
  const [diasDoMes, setDiasDoMes] = useState([5, 20])

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
      dias_aviso: 1,
      status: 'Agendado',
      is_start: false,
      is_training: false,
      nota: '',
      observacao: '',
    }))
    onGerar(novas)
  }

  const toggleDia = (dia) => {
    setDiasDoMes(prev => prev.includes(dia)
      ? prev.filter(d => d !== dia)
      : [...prev, dia].sort((a, b) => a - b))
  }

  return (
    <Modal isOpen onClose={onClose}
      title="Padronizar Datas"
      subtitle="Cria várias datas de uma vez seguindo um padrão"
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" icon={Wand2}
            onClick={handleGerar}
            disabled={datasValidas.length === 0 || !form.formulario}>
            Gerar {datasValidas.length} datas
          </Button>
        </>
      }>
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
          <>
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
          </>
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

        <FormGroup label="Formulário padrão" required>
          <Select
            value={form.formulario}
            onChange={(v) => setForm(p => ({ ...p, formulario: v }))}
            options={formularios.map(f => ({ value: f.name, label: f.titulo }))}
            placeholder="Selecione um formulário..."
          />
        </FormGroup>

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
            <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
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
          As datas são adicionadas ao cronograma atual (não substituem). Datas já agendadas serão ignoradas.
        </p>
      </div>
    </Modal>
  )
}
