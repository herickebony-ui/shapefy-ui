import { ChevronRight } from 'lucide-react'

export default function ListItem({ onClick, left, right, bottom, isLast = false }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left flex items-center gap-4 px-4 py-3.5 hover:bg-[#323238] transition-colors group ${!isLast ? 'border-b border-[#323238]' : ''}`}
    >
      {left}
      <div className="flex-1 min-w-0">
        {bottom}
      </div>
      {right || <ChevronRight size={15} className="text-gray-600 group-hover:text-gray-300 transition-colors shrink-0" />}
    </button>
  )
}