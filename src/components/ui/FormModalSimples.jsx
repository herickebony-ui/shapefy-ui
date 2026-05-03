// FormModalSimples — variante de Modal pra formulários "estilo lançamento":
//   header com X
//   slot opcional pra preenchimento rápido (ícone Zap)
//   slot principal com children do form
//   footer fixo: Cancelar + Salvar
//
// Props:
//   isOpen, onClose, title, subtitle, size (sm/md/lg/xl/2xl)
//   quickFill (ReactNode | null) — bloco visualmente destacado no topo
//   children — corpo do form
//   onSubmit() — disparado pelo botão Salvar
//   submitLabel ('Salvar')
//   submitVariant ('primary' | 'info' | 'success')
//   cancelLabel ('Cancelar')
//   loading — estado do botão Salvar
//   submitDisabled — desabilita o botão Salvar
//   closeOnOverlayClick (true)
//
// Uso típico:
//   <FormModalSimples
//     isOpen={open} onClose={...} title="Novo lançamento"
//     onSubmit={handleSubmit} loading={salvando}
//     quickFill={<MeuQuickFill />}>
//     ...campos...
//   </FormModalSimples>
import { Zap } from 'lucide-react'
import Modal from './Modal'
import Button from './Button'

export default function FormModalSimples({
  isOpen,
  open,
  onClose,
  title,
  subtitle,
  size = 'lg',
  quickFill,
  children,
  onSubmit,
  submitLabel = 'Salvar',
  submitVariant = 'primary',
  submitDisabled = false,
  cancelLabel = 'Cancelar',
  loading = false,
  closeOnOverlayClick = true,
  extraActions = null,
}) {
  const visible = isOpen ?? open ?? true
  if (!visible) return null

  return (
    <Modal
      isOpen={visible}
      onClose={loading ? undefined : onClose}
      title={title}
      subtitle={subtitle}
      size={size}
      closeOnOverlayClick={closeOnOverlayClick && !loading}
      footer={
        <div className="flex items-center justify-between w-full gap-2">
          <div className="flex items-center gap-2">
            {extraActions}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose} disabled={loading}>
              {cancelLabel}
            </Button>
            <Button
              variant={submitVariant}
              onClick={onSubmit}
              loading={loading}
              disabled={submitDisabled}
            >
              {submitLabel}
            </Button>
          </div>
        </div>
      }
    >
      {quickFill && (
        <div className="px-4 md:px-5 pt-4">
          <div className="bg-[#222226] border border-[#323238] rounded-xl p-3">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#2563eb] mb-2">
              <Zap size={11} /> Preenchimento rápido
            </div>
            {quickFill}
          </div>
        </div>
      )}
      <div className="p-4 md:p-5 space-y-4">
        {children}
      </div>
    </Modal>
  )
}
