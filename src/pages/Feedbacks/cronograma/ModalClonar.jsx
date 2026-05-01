import { Search } from 'lucide-react'
import { Modal, Button, Input, Avatar } from '../../../components/ui'

export default function ModalClonar({
  alunos, alunoIdAtual, busca, setBusca,
  onSelecionar, onClose,
  title = 'Clonar Cronograma',
  subtitle = 'Selecione o aluno de origem',
}) {
  return (
    <Modal isOpen onClose={onClose}
      title={title} subtitle={subtitle}
      size="md"
      footer={<Button variant="ghost" onClick={onClose}>Cancelar</Button>}>
      <div className="p-4 space-y-3">
        <Input value={busca} onChange={setBusca}
          icon={Search} placeholder="Buscar aluno..." />
        <ul className="max-h-80 overflow-y-auto flex flex-col gap-1">
          {alunos
            .filter(a => a.name !== alunoIdAtual)
            .filter(a => {
              const q = busca.trim().toLowerCase()
              if (!q) return true
              return (a.nome_completo || '').toLowerCase().includes(q)
            })
            .slice(0, 50)
            .map(a => (
              <li key={a.name}>
                <button onClick={() => onSelecionar(a.name)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-[#29292e] text-left transition-colors">
                  <Avatar nome={a.nome_completo} size="xs" />
                  <span className="text-white text-sm font-medium truncate">{a.nome_completo}</span>
                </button>
              </li>
            ))}
        </ul>
      </div>
    </Modal>
  )
}
