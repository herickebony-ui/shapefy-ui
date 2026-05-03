import { Plus, Save } from 'lucide-react'
import { Modal, Button, FormGroup, Input, Select, Textarea } from '../../../components/ui'
import { fmtDateBR } from './utils'

export default function ModalNovoDia({
  draft, formularios, setDraft, onAdicionar, onClose,
}) {
  const editando = !!draft._editando
  return (
    <Modal isOpen onClose={onClose}
      title={editando ? 'Detalhes do agendamento' : 'Novo agendamento'}
      subtitle={fmtDateBR(draft.date)}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" icon={editando ? Save : Plus} onClick={onAdicionar}>
            {editando ? 'Salvar' : 'Adicionar'}
          </Button>
        </>
      }>
      <div className="p-4 space-y-3">
        <FormGroup label="Formulário" required>
          <Select
            value={draft.formulario}
            onChange={(v) => setDraft(p => ({ ...p, formulario: v }))}
            options={formularios.map(f => ({ value: f.name, label: f.titulo }))}
            placeholder="Selecione um formulário..."
          />
        </FormGroup>
        <div className="grid grid-cols-2 gap-2">
          <FormGroup label="Dias de aviso">
            <Input type="number" value={String(draft.dias_aviso)}
              onChange={(v) => setDraft(p => ({ ...p, dias_aviso: Number(v) || 1 }))} />
          </FormGroup>
          <div className="flex items-end">
            <label className="inline-flex items-center gap-2 px-3 h-10 rounded-lg border border-[#323238] bg-[#1a1a1a] cursor-pointer w-full">
              <input type="checkbox" checked={!!draft.is_start}
                onChange={(e) => setDraft(p => ({ ...p, is_start: e.target.checked }))} />
              <span className="text-xs text-gray-300 font-medium">Marco Zero</span>
            </label>
          </div>
        </div>
        <FormGroup label="Nota (opcional)">
          <Textarea rows={3} value={draft.nota}
            onChange={(v) => setDraft(p => ({ ...p, nota: v }))}
            placeholder="Observação interna…" />
        </FormGroup>
      </div>
    </Modal>
  )
}
