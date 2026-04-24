// Props: title, children, variant (primary/info/warning/danger), defaultOpen, action
import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

const STYLES = {
  primary: {
    wrapper: 'bg-[rgba(133,0,0,0.08)] border-[rgba(133,0,0,0.3)]',
    title:   'text-[#ef4444]',
  },
  info: {
    wrapper: 'bg-[rgba(0,82,204,0.08)] border-[rgba(0,82,204,0.3)]',
    title:   'text-[#60a5fa]',
  },
  warning: {
    wrapper: 'bg-[rgba(234,179,8,0.08)] border-[rgba(234,179,8,0.3)]',
    title:   'text-[#facc15]',
  },
  danger: {
    wrapper: 'bg-[rgba(239,68,68,0.12)] border-[rgba(239,68,68,0.4)]',
    title:   'text-[#f87171]',
  },
}

export default function CollapsibleBanner({
  title,
  children,
  variant = 'primary',
  defaultOpen = false,
  action,
}) {
  const [open, setOpen] = useState(defaultOpen)
  const v = STYLES[variant] || STYLES.primary

  return (
    <div className={`border rounded-xl ${v.wrapper}`}>
      <div className="px-4 py-2.5 flex items-center justify-between gap-3">
        <button
          onClick={() => setOpen(o => !o)}
          className={`flex items-center gap-2.5 text-[11px] font-bold italic uppercase tracking-widest ${v.title} outline-none text-left`}
        >
          {open
            ? <ChevronUp size={14} strokeWidth={2.5} />
            : <ChevronDown size={14} strokeWidth={2.5} />
          }
          {title}
        </button>
        {action && (
          <div className="shrink-0 sm:ml-2">
            {action}
          </div>
        )}
      </div>
      {open && (
        <div className="px-4 pb-3">
          {children}
        </div>
      )}
    </div>
  )
}
