// Template para páginas de listagem (Alunos, Dietas, Fichas, Feedbacks)
// Props: title, subtitle, actions, filters, stats, loading, empty, pagination, children
import { Spinner, EmptyState, StatCard, Input } from '../ui'
import Select from '../ui/Select'

export default function ListPage({
  title,
  subtitle,
  actions,
  filters = [],
  stats = [],
  loading = false,
  empty,
  pagination,
  children,
}) {
  return (
    <div className="p-4 md:p-8 text-white min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[18px] md:text-xl font-bold text-white tracking-tight">{title}</h1>
          {subtitle && <p className="text-gray-400 text-xs md:text-sm mt-1">{subtitle}</p>}
        </div>
        {/* Desktop: all actions; Mobile: primary action only (others go in overflow menu) */}
        <div className="flex items-center gap-2 shrink-0">
          {actions}
        </div>
      </div>

      {/* Stats bar */}
      {stats.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {stats.map((s, i) => (
            <StatCard key={i} {...s} />
          ))}
        </div>
      )}

      {/* Filters */}
      {filters.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          {filters.map((f, i) => {
            if (f.type === 'search') return (
              <div key={i} className="flex-1 min-w-0">
                <Input
                  value={f.value}
                  onChange={f.onChange}
                  placeholder={f.placeholder || 'Buscar...'}
                  onClear={f.value ? () => f.onChange('') : undefined}
                  icon={f.icon}
                />
              </div>
            )
            if (f.type === 'select') return (
              <div key={i} className="w-full sm:w-48">
                <Select
                  value={f.value}
                  onChange={f.onChange}
                  options={f.options || []}
                  placeholder={f.placeholder}
                />
              </div>
            )
            return null
          })}
        </div>
      )}

      {/* List container */}
      <div>
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Spinner size="lg" />
          </div>
        ) : !children && empty ? (
          <div className="py-16">
            <EmptyState {...empty} />
          </div>
        ) : (
          children
        )}
      </div>

      {/* Pagination */}
      {pagination && !loading && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-[#323238]">
          <span className="text-gray-500 text-xs">
            <span className="hidden sm:inline">
              {((pagination.page - 1) * pagination.pageSize) + 1}–{Math.min(pagination.page * pagination.pageSize, pagination.total)} de {pagination.total}
            </span>
            <span className="sm:hidden">
              {pagination.page} / {Math.ceil(pagination.total / pagination.pageSize)}
            </span>
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => pagination.onChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#29292e] border border-[#323238] text-gray-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm"
            >
              ‹
            </button>
            <button
              onClick={() => pagination.onChange(pagination.page + 1)}
              disabled={pagination.page * pagination.pageSize >= pagination.total}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#29292e] border border-[#323238] text-gray-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm"
            >
              ›
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
