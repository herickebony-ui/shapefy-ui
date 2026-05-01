import { Plus, X, Bold as BoldIcon, Link as LinkIcon } from 'lucide-react'
import { Modal, Button, FormGroup, Input, Select } from '../../../components/ui'
import { TEMPLATE_PADRAO } from '../../../api/templates'

export default function ModalTemplates({
  templates, templateAtualId, setTemplateAtualId,
  templateAtualTexto, setTemplateAtualTexto,
  novoTemplateNome, setNovoTemplateNome,
  templateTextareaRef,
  onSalvarNovo, onExcluir, onAplicarFormato,
  onClose,
}) {
  return (
    <Modal isOpen onClose={onClose} title="Templates de Mensagem" size="lg"
      footer={<Button variant="primary" onClick={onClose}>Fechar</Button>}>
      <div className="p-4 space-y-4">
        <FormGroup label="Template ativo">
          <Select
            value={templateAtualId}
            onChange={setTemplateAtualId}
            options={templates.map(t => ({ value: t.name, label: t.nome }))}
            placeholder=""
          />
        </FormGroup>

        <div className="flex flex-wrap gap-1.5 items-center">
          {templates
            .filter(t => t.name !== TEMPLATE_PADRAO.name)
            .map(t => (
              <span key={t.name}
                className="inline-flex items-center gap-1.5 pl-2 pr-1 py-0.5 rounded text-[11px] bg-[#29292e] border border-[#323238] text-gray-300">
                {t.nome}
                <button onClick={() => onExcluir(t.name)}
                  className="text-gray-500 hover:text-red-400">
                  <X size={11} />
                </button>
              </span>
            ))}
        </div>

        <div className="flex gap-2 items-end">
          <FormGroup label="Salvar como novo template" hint="Salva o texto atual com este nome">
            <Input value={novoTemplateNome} onChange={setNovoTemplateNome}
              placeholder="Nome do novo template..." />
          </FormGroup>
          <Button variant="secondary" size="md" icon={Plus} onClick={onSalvarNovo}>Salvar</Button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-gray-400 text-xs font-medium">Texto</label>
            <div className="flex gap-1">
              <button onClick={() => onAplicarFormato('**', '**')}
                className="h-7 px-2 flex items-center gap-1 text-xs font-semibold text-gray-400 hover:text-white bg-[#29292e] border border-[#323238] rounded">
                <BoldIcon size={11} /> Negrito
              </button>
              <button onClick={() => onAplicarFormato('[', '](https://)')}
                className="h-7 px-2 flex items-center gap-1 text-xs font-semibold text-gray-400 hover:text-white bg-[#29292e] border border-[#323238] rounded">
                <LinkIcon size={11} /> Link
              </button>
            </div>
          </div>
          <textarea
            ref={templateTextareaRef}
            value={templateAtualTexto}
            onChange={(e) => setTemplateAtualTexto(e.target.value)}
            rows={14}
            className="w-full p-3 bg-[#1a1a1a] border border-[#323238] rounded-lg text-white text-sm font-mono outline-none focus:border-[#2563eb]/60 resize-none"
          />
          <p className="text-[10px] text-gray-500">
            Variáveis: <code className="text-blue-400">{'{{NOME}}'}</code>{' '}
            <code className="text-blue-400">{'{{FIM_PLANO}}'}</code>{' '}
            <code className="text-blue-400">{'{{LISTA_DATAS}}'}</code>{' '}
            <code className="text-blue-400">{'{{SENHA_ACESSO}}'}</code>
          </p>
        </div>
      </div>
    </Modal>
  )
}
