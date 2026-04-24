// Props: isOpen/open, onClose, title, subtitle, size (sm/md/lg/xl),
//        footer (ReactNode), closeOnOverlayClick, children
// Mobile: fullscreen (<768px), footer buttons stack vertically
import { X } from 'lucide-react'

const SIZES = {
  sm:  'md:max-w-[400px]',
  md:  'md:max-w-[480px]',
  lg:  'md:max-w-[640px]',
  xl:  'md:max-w-[800px]',
  '2xl': 'md:max-w-[1100px]',
}

export default function Modal({
  isOpen,
  open,
  children,
  onClose,
  title,
  subtitle,
  size = 'md',
  footer,
  closeOnOverlayClick = true,
}) {
  const visible = isOpen ?? open ?? true
  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col md:items-center md:justify-center bg-black/75 backdrop-blur-sm md:p-4"
      onClick={closeOnOverlayClick ? onClose : undefined}
    >
      <div
        className={`
          bg-[#1a1a1a] border-0 md:border border-[#323238]
          w-full h-[100dvh] md:h-auto
          rounded-none md:rounded-xl
          ${SIZES[size] || SIZES.md}
          md:max-h-[90vh]
          flex flex-col
          shadow-[0_25px_50px_rgba(0,0,0,0.6)]
        `}
        onClick={e => e.stopPropagation()}
      >
        {(title || onClose) && (
          <div className="flex items-center justify-between px-4 md:px-[22px] py-4 border-b border-[#323238] shrink-0">
            <div>
              {title && <h3 className="text-white font-semibold text-sm md:text-base">{title}</h3>}
              {subtitle && <p className="text-gray-400 text-[11px] mt-0.5">{subtitle}</p>}
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-[#323238] transition-colors shrink-0 ml-3"
              >
                <X size={16} />
              </button>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {children}
        </div>

        {footer && (
          <div className="px-4 md:px-[22px] py-4 border-t border-[#323238] shrink-0 flex flex-col-reverse md:flex-row md:justify-end gap-2 md:gap-[10px] [&>*]:w-full md:[&>*]:w-auto">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
