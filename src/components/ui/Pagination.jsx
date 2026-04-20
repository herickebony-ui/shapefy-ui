import { ChevronLeft, ChevronRight } from 'lucide-react'

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

export default function Pagination({ page, pageSize, total, onPage, onPageSize }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  const pages = buildPages(page, totalPages)

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-1 py-3 border-t border-[#323238]">

      {/* Info + page size */}
      <div className="flex items-center gap-3 text-xs text-gray-500">
        <span>{total === 0 ? '0 registros' : `${from}–${to} de ${total}`}</span>
        <div className="flex items-center gap-1.5">
          <span>por página</span>
          <select
            value={pageSize}
            onChange={e => { onPageSize(Number(e.target.value)); onPage(1) }}
            className="h-7 px-2 bg-[#1a1a1a] border border-[#323238] text-gray-200 rounded text-xs outline-none focus:border-[#850000]/60 appearance-none"
          >
            {PAGE_SIZE_OPTIONS.map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Nav */}
      <div className="flex items-center gap-1">
        <NavBtn onClick={() => onPage(page - 1)} disabled={page <= 1} title="Anterior">
          <ChevronLeft size={13} />
        </NavBtn>

        {pages.map((p, i) =>
          p === '…' ? (
            <span key={`ellipsis-${i}`} className="px-1 text-gray-600 text-xs select-none">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPage(p)}
              className={`min-w-[28px] h-7 px-2 rounded text-xs font-medium transition-colors border ${
                p === page
                  ? 'bg-[#850000] border-[#850000] text-white'
                  : 'bg-[#1a1a1a] border-[#323238] text-gray-400 hover:text-white hover:border-[#444]'
              }`}
            >
              {p}
            </button>
          )
        )}

        <NavBtn onClick={() => onPage(page + 1)} disabled={page >= totalPages} title="Próximo">
          <ChevronRight size={13} />
        </NavBtn>
      </div>
    </div>
  )
}

function NavBtn({ onClick, disabled, title, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="h-7 w-7 flex items-center justify-center rounded border border-[#323238] bg-[#1a1a1a] text-gray-400 hover:text-white hover:border-[#444] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
    >
      {children}
    </button>
  )
}

function buildPages(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages = []
  if (current <= 4) {
    pages.push(1, 2, 3, 4, 5, '…', total)
  } else if (current >= total - 3) {
    pages.push(1, '…', total - 4, total - 3, total - 2, total - 1, total)
  } else {
    pages.push(1, '…', current - 1, current, current + 1, '…', total)
  }
  return pages
}
