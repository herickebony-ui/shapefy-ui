import { Trash2, Plus } from 'lucide-react'
import { Modal, Button, FormGroup, Input } from '../../../components/ui'
import { fmtDateBR } from './utils'

export default function ModalFerias({
  ferias, novaFeria, setNovaFeria,
  salvando, onAdicionar, onRemover, onClose,
}) {
  return (
    <Modal isOpen onClose={onClose} title="Períodos de Férias" size="md"
      footer={<Button variant="primary" onClick={onClose}>Fechar</Button>}>
      <div className="p-4 space-y-4">
        {ferias.length === 0 ? (
          <p className="text-gray-500 text-sm italic text-center py-4">Nenhum período cadastrado.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {ferias.map(f => (
              <li key={f.name} className="flex items-center justify-between gap-3 p-3 bg-[#29292e] border border-[#323238] rounded-lg">
                <div className="min-w-0">
                  <p className="text-white text-xs font-semibold">
                    {fmtDateBR(f.data_inicio)} → {fmtDateBR(f.data_fim)}
                  </p>
                  {f.descricao && <p className="text-gray-500 text-[11px] truncate">{f.descricao}</p>}
                </div>
                <button onClick={() => onRemover(f.name)}
                  className="h-7 w-7 flex items-center justify-center text-red-400 hover:text-white border border-red-500/30 hover:bg-red-700 rounded-lg transition-colors">
                  <Trash2 size={12} />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="border-t border-[#323238] pt-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Adicionar período</p>
          <div className="grid grid-cols-2 gap-2">
            <FormGroup label="Início" required>
              <Input type="date" value={novaFeria.data_inicio}
                onChange={(v) => setNovaFeria(p => ({ ...p, data_inicio: v }))} />
            </FormGroup>
            <FormGroup label="Fim" required>
              <Input type="date" value={novaFeria.data_fim}
                onChange={(v) => setNovaFeria(p => ({ ...p, data_fim: v }))} />
            </FormGroup>
          </div>
          <FormGroup label="Descrição (opcional)">
            <Input value={novaFeria.descricao}
              onChange={(v) => setNovaFeria(p => ({ ...p, descricao: v }))}
              placeholder="Ex: Recesso de fim de ano" />
          </FormGroup>
          <Button variant="primary" icon={Plus} fullWidth
            onClick={onAdicionar} loading={salvando}>
            Adicionar Período
          </Button>
        </div>
      </div>
    </Modal>
  )
}
