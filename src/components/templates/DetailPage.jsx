// Template para páginas de detalhe/edição (DietaDetalhe, FichaDetalhe, AlunoDetalhe)
// Props: title, subtitle, status (ReactNode), backHref, onBack,
//        actions (ReactNode), banner {title, content, variant, action},
//        tabs [{id,label,icon?,badge?}], activeTab, onTabChange,
//        footer (ReactNode sticky), children
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Tabs, CollapsibleBanner } from '../ui'

export default function DetailPage({
  title,
  subtitle,
  status,
  backHref,
  onBack,
  actions,
  banner,
  tabs,
  activeTab,
  onTabChange,
  footer,
  children,
}) {
  const navigate = useNavigate()

  const handleBack = () => {
    if (onBack) onBack()
    else if (backHref) navigate(backHref)
    else navigate(-1)
  }

  return (
    <div className="text-white min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 md:px-8 pt-4 md:pt-8 pb-4 gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={handleBack}
            className="p-2 rounded-lg bg-[#29292e] border border-[#323238] text-gray-400 hover:text-white transition-colors shrink-0"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base md:text-xl font-bold text-white truncate">{title}</h1>
              {status && <span className="shrink-0">{status}</span>}
            </div>
            {subtitle && <p className="text-gray-400 text-xs mt-0.5 truncate">{subtitle}</p>}
          </div>
        </div>
        {actions && (
          <div className="flex items-center gap-2 shrink-0">
            {actions}
          </div>
        )}
      </div>

      {/* Banner */}
      {banner && (
        <div className="px-4 md:px-8 mb-4">
          <CollapsibleBanner
            title={banner.title}
            variant={banner.variant || 'primary'}
            action={banner.action}
          >
            {banner.content}
          </CollapsibleBanner>
        </div>
      )}

      {/* Tabs */}
      {tabs && (
        <div className="px-4 md:px-8 mb-0">
          <Tabs tabs={tabs} active={activeTab} onChange={onTabChange} />
        </div>
      )}

      {/* Content */}
      <div className="px-4 md:px-8 py-6 pb-32">
        {children}
      </div>

      {/* Footer sticky */}
      {footer && (
        <div className="fixed bottom-0 left-0 right-0 px-4 md:px-8 pb-4 z-30">
          {footer}
        </div>
      )}
    </div>
  )
}
