// Modal informativo padrão — usar para onboarding, anúncios, changelogs, etc.
// Props:
//   isOpen, onClose, title, subtitle, size (sm/md/lg/xl, default md),
//   icon: ReactNode renderizado no topo (Lucide component ou ReactNode),
//   iconVariant: 'info' | 'primary' | 'success' | 'warning' (default 'info'),
//   steps: array de { icon, title, description, action? }  — lista numerada
//   primaryAction: { label, onClick, icon?, loading? }
//   secondaryAction: { label, onClick, variant? }
//   dismissLabel: string (default 'Entendi')
//   dontShowAgainKey: string opcional — se passado, renderiza checkbox "Não mostrar novamente" que grava em localStorage
//   footer: ReactNode opcional — substitui o footer padrão
import { useState, isValidElement, createElement } from 'react'
import Modal from './Modal'
import Button from './Button'

const renderIcon = (Icon, size) => {
  if (!Icon) return null
  if (isValidElement(Icon)) return Icon
  return createElement(Icon, { size })
}

const ICON_VARIANTS = {
  info:    { bg: 'bg-[#0052cc]/15', heroBg: 'bg-[rgba(0,82,204,0.08)]',  border: 'border-[#0052cc]/40',   text: 'text-[#60a5fa]' },
  primary: { bg: 'bg-[#850000]/15', heroBg: 'bg-[rgba(133,0,0,0.08)]',   border: 'border-[#850000]/40',   text: 'text-[#ef4444]' },
  success: { bg: 'bg-green-500/15', heroBg: 'bg-green-500/[0.06]',       border: 'border-green-500/40',   text: 'text-green-400' },
  warning: { bg: 'bg-yellow-500/15', heroBg: 'bg-[rgba(234,179,8,0.08)]', border: 'border-yellow-500/40', text: 'text-yellow-400' },
}

export default function InformativoModal({
  isOpen,
  onClose,
  title,
  subtitle,
  size = 'md',
  icon,
  iconVariant = 'info',
  steps = [],
  primaryAction,
  secondaryAction,
  dismissLabel = 'Entendi',
  dontShowAgainKey,
  footer,
  children,
}) {
  const [dontShow, setDontShow] = useState(false)
  const iv = ICON_VARIANTS[iconVariant] || ICON_VARIANTS.info

  const handleClose = () => {
    if (dontShowAgainKey && dontShow) {
      try { localStorage.setItem(dontShowAgainKey, '1') } catch { /* ignore */ }
    }
    onClose?.()
  }

  const iconNode = renderIcon(icon, 28)

  const defaultFooter = (
    <>
      {secondaryAction && (
        <Button variant={secondaryAction.variant || 'ghost'} onClick={secondaryAction.onClick}>
          {secondaryAction.label}
        </Button>
      )}
      {primaryAction ? (
        <Button
          variant="primary"
          icon={primaryAction.icon}
          loading={primaryAction.loading}
          onClick={() => { primaryAction.onClick?.(); handleClose() }}
        >
          {primaryAction.label}
        </Button>
      ) : (
        <Button variant="primary" onClick={handleClose}>{dismissLabel}</Button>
      )}
    </>
  )

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      subtitle={subtitle}
      size={size}
      footer={footer ?? defaultFooter}
    >
      <div className="space-y-5 pb-5">
        {(iconNode || children) && (
          <div className={`px-4 md:px-6 py-5 border-b border-[#323238] ${iv.heroBg}`}>
            <div className="flex flex-col items-center text-center gap-3 max-w-[640px] mx-auto">
              {iconNode && (
                <div className={`w-16 h-16 rounded-lg border flex items-center justify-center ${iv.bg} ${iv.border} ${iv.text}`}>
                  {iconNode}
                </div>
              )}
              {children}
            </div>
          </div>
        )}

        {steps.length > 0 && (
          <ol className="px-4 md:px-6 grid grid-cols-1 md:grid-cols-2 gap-3">
            {steps.map((step, i) => {
              const stepIconNode = step.icon
                ? renderIcon(step.icon, 18)
                : <span className="text-sm font-bold">{i + 1}</span>
              return (
                <li
                  key={i}
                  className="flex gap-3 rounded-lg border border-[#323238] bg-[#222226] px-3 py-3"
                >
                  <div className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${iv.bg} ${iv.text}`}>
                    {stepIconNode}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-sm font-semibold leading-tight">{step.title}</p>
                    {step.description && (
                      <p className="text-gray-400 text-xs mt-1 leading-relaxed">{step.description}</p>
                    )}
                    {step.action && (
                      <div className="mt-2">{step.action}</div>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        )}

        {dontShowAgainKey && (
          <label className="flex items-center gap-2 cursor-pointer select-none px-4 md:px-6">
            <input
              type="checkbox"
              checked={dontShow}
              onChange={e => setDontShow(e.target.checked)}
              className="accent-[#2563eb] w-4 h-4"
            />
            <span className="text-xs text-gray-400">Não mostrar novamente</span>
          </label>
        )}
      </div>
    </Modal>
  )
}
