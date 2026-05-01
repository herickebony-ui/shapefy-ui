import { useState, useMemo } from 'react'
import { Wand2 } from 'lucide-react'
import { Modal, Button, FormGroup, Input, Select } from '../../../components/ui'
import { dataEhFerias } from '../../../api/ferias'

export default function ModalGerarSerie({
  formularios, planEnd, feriasList,
  onGerar, onClose,
}) {
  const formularioPadrao = formularios.find(f => f.enabled !== 0)?.name
                       || formularios[0]?.name
                       || ''

  const [form, setForm] = useState({
    data_inicio: new Date().toISOString().slice(0, 10),
    intervalo: 2,
    unidade: 'semanas', // 'semanas' | 'dias'
    data_fim: planEnd || '',
    formulario: formularioPadrao,
    pular_ferias: true,
  })

  const datasPreview = useMemo(() => {
    if (!form.data_inicio || !form.data_fim || !form.intervalo) return []
    const inicio = new Date(form.data_inicio + 'T12:00:00')
    const fim = new Date(form.data_fim + 'T12:00:00')
    if (fim < inicio) return []
    const stepDias = form.unidade === 'semanas' ? Number(form.intervalo) * 7 : Number(form.intervalo)
    if (stepDias < 1) return []
    const datas = []
    const cursor = new Date(inicio)
    let safety = 0
    while (cursor <= fim && safety < 500) {
      const iso = cursor.toISOString().slice(0, 10)
      const emFerias = form.pular_ferias && dataEhFerias(iso, feriasList)
      datas.push({ iso, emFerias })
      cursor.setDate(cursor.getDate() + stepDias)
      safety++
    }
    return datas
  }, [form, feriasList])

  const datasValidas = datasPreview.filter(d => !d.emFerias)
  const datasPuladas = datasPreview.filter(d => d.emFerias)

  const handleGerar = () => {
    if (!form.formulario) return
    if (datasValidas.length === 0) return
    const novas = datasValidas.map(d => ({
      date: d.iso,
      formulario: form.formulario,
      dias_aviso: 1,
      status: 'Agendado',
      is_start: false,
      nota: '',
      observacao: '',
    }))
    onGerar(novas)
  }

  return (
    <Modal isOpen onClose={onClose}
      title="Gerar Série de Datas"
      subtitle="Cria várias datas de uma vez seguindo um intervalo regular"
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

        <div className="grid grid-cols-2 gap-2">
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
              placeholder=""
            />
          </FormGroup>
        </div>

        <FormGroup label="Formulário padrão" required>
          <Select
            value={form.formulario}
            onChange={(v) => setForm(p => ({ ...p, formulario: v }))}
            options={formularios.map(f => ({ value: f.name, label: f.titulo }))}
            placeholder="Selecione um formulário..."
          />
        </FormGroup>

        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" checked={form.pular_ferias}
            onChange={(e) => setForm(p => ({ ...p, pular_ferias: e.target.checked }))} />
          <span className="text-xs text-gray-300 font-medium">Pular datas que caem em férias</span>
        </label>

        {/* Preview */}
        <div className="bg-[#0a0a0a] border border-[#323238] rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">
              Pré-visualização
            </span>
            <span className="text-[10px] text-gray-400">
              {datasValidas.length} datas
              {datasPuladas.length > 0 && ` · ${datasPuladas.length} puladas (férias)`}
            </span>
          </div>
          {datasPreview.length === 0 ? (
            <p className="text-xs text-gray-600 italic">Preencha os campos acima.</p>
          ) : (
            <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
              {datasPreview.map((d, i) => (
                <span key={i}
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                    d.emFerias
                      ? 'bg-blue-500/10 border-blue-500/30 text-blue-300/60 line-through'
                      : 'bg-[#1a1a1a] border-[#323238] text-gray-300'
                  }`}>
                  {d.iso.split('-').reverse().join('/')}
                </span>
              ))}
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
