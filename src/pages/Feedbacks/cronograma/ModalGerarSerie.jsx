import { Modal, Button } from '../../../components/ui'
import PadronizarFormulario from './PadronizarFormulario'

export default function ModalGerarSerie({
  formularios, planStart, planEnd, feriasList,
  onGerar, onClose,
}) {
  return (
    <Modal isOpen onClose={onClose}
      title="Padronizar Datas"
      subtitle="Cria várias datas de uma vez seguindo um padrão"
      size="md"
      footer={<Button variant="ghost" onClick={onClose}>Cancelar</Button>}>
      <PadronizarFormulario
        formularios={formularios}
        planStart={planStart}
        planEnd={planEnd}
        feriasList={feriasList}
        onGerar={(novas) => { onGerar(novas); onClose() }}
        showFooter
      />
    </Modal>
  )
}
