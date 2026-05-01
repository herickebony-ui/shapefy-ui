import { Modal, Button, FormGroup, Input } from '../../../components/ui'

export default function ModalConfig({ deadlineSettings, setDeadlineSettings, onClose }) {
  return (
    <Modal isOpen onClose={onClose} title="Configuração de Prazos" size="sm"
      footer={<Button variant="primary" onClick={onClose}>Fechar</Button>}>
      <div className="p-4 space-y-4">
        <FormGroup label="Prazo Feedback (dias)" hint="Tempo entre data prevista e prazo final">
          <Input type="number" value={String(deadlineSettings.feedbackDays)}
            onChange={(v) => setDeadlineSettings(p => ({ ...p, feedbackDays: Number(v) || 0 }))} />
        </FormGroup>
        <FormGroup label="Prazo Treino/Troca (dias)">
          <Input type="number" value={String(deadlineSettings.trainingDays)}
            onChange={(v) => setDeadlineSettings(p => ({ ...p, trainingDays: Number(v) || 0 }))} />
        </FormGroup>
        <p className="text-[11px] text-gray-500">
          Configuração local — fica salva neste navegador, não vai pro servidor.
        </p>
      </div>
    </Modal>
  )
}
