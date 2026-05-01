import { Modal, Button, Textarea } from '../../../components/ui'
import { fmtDateBR } from './utils'

export default function ModalNota({
  agendamento, alunoNome,
  onChange, onSalvar, onClose,
}) {
  return (
    <Modal isOpen onClose={onClose}
      title="Nota do Agendamento"
      subtitle={`${alunoNome} · ${fmtDateBR(agendamento.data_agendada)}`}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={onSalvar}>Salvar</Button>
        </>
      }>
      <div className="p-4">
        <Textarea
          value={agendamento.nota || ''}
          onChange={onChange}
          rows={6}
          placeholder="Anote algo sobre este agendamento…"
        />
      </div>
    </Modal>
  )
}
