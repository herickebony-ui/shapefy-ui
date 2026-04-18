import { X } from 'lucide-react'

export default function Modal({ children, onClose, title, subtitle, size = 'md', footer }) {
  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-3xl',
    xl: 'max-w-5xl',
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className={`bg-[#1a1a1a] border border-[#323238] rounded-xl w-full ${sizes[size]} max-h-[90vh] flex flex-col shadow-2xl`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        {(title || onClose) && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#323238] shrink-0">
            <div>
              {title && <h3 className="text-white font-bold text-base">{title}</h3>}
              {subtitle && <p className="text-gray-400 text-xs mt-0.5">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-[#323238] transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-5 py-4 border-t border-[#323238] shrink-0 flex justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}