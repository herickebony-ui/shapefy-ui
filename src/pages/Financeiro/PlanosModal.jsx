import { Modal } from '../../components/ui'
import PlanosManager from './PlanosManager'

/**
 * Wrapper do PlanosManager dentro de um Modal — usado quando precisa abrir
 * o gerenciador como popup. Para abrir como página, use PlanosManager direto
 * (ver PlanosListagem).
 */
export default function PlanosModal({ isOpen, onClose, planos, onMutate }) {
  if (!isOpen) return null
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Gerenciar planos"
      size="xl"
    >
      <PlanosManager
        planos={planos}
        onMutate={onMutate}
        onCloseRequest={onClose}
        active={isOpen}
      />
    </Modal>
  )
}
