import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Pagination from './Pagination'
import { maybeOpenNewTab } from '../../utils/navigation'

/**
 * DataTable — tabela padronizada com linhas alternadas, hover e paginação.
 *
 * columns: [{ label, headerClass?, cellClass?, render(row) }]
 * rows: array completo (filtrado) — o componente faz o slice internamente
 * onRowClick(row): handler de clique na linha (opcional)
 * rowHref(row) => string: URL da linha (opcional). Cmd/Ctrl+Click ou botão-do-meio abrem
 *   essa URL em nova aba. No clique normal: usa onRowClick se houver (preservando state de
 *   navegação), senão navega para a URL.
 * page, pageSize, onPage, onPageSize: paginação controlada pelo pai
 * mobileCard(row, onRowClick): função opcional que renderiza um card mobile.
 *   Se passada, em <768px usa cards empilhados; em ≥768px usa tabela.
 *   Se omitida, em mobile a tabela rola horizontalmente (overflow-x-auto).
 *
 * Seleção em lote (opt-in):
 * selectable: true habilita a coluna de checkbox (header = selecionar a página)
 * selected: Set de keys selecionadas (use o hook useSelection)
 * onToggle(key): marca/desmarca uma linha
 * onTogglePage(pageKeys): marca/desmarca todas as linhas da página atual
 */
export default function DataTable({
  columns,
  rows,
  onRowClick,
  rowHref,
  page = 1,
  pageSize = 20,
  onPage,
  onPageSize,
  rowKey = 'name',
  mobileCard,
  selectable = false,
  selected,
  onToggle,
  onTogglePage,
}) {
  const navigate = useNavigate()
  const paged = useMemo(() => {
    const start = (page - 1) * pageSize
    return rows.slice(start, start + pageSize)
  }, [rows, page, pageSize])

  const keyOf = (row, i) => row[rowKey] ?? i
  const pageKeys = useMemo(() => paged.map((r, i) => keyOf(r, i)), [paged]) // eslint-disable-line react-hooks/exhaustive-deps
  const algumaMarcada = selectable && pageKeys.some((k) => selected?.has(k))
  const todasMarcadas = selectable && pageKeys.length > 0 && pageKeys.every((k) => selected?.has(k))

  const Checkbox = (props) => (
    <input
      type="checkbox"
      className="h-4 w-4 accent-[#2563eb] cursor-pointer align-middle"
      onClick={(e) => e.stopPropagation()}
      {...props}
    />
  )

  const clickable = onRowClick || rowHref
  const rowHandlers = (row) => {
    const href = rowHref?.(row)
    if (href) {
      return {
        onClick: (e) => {
          if (maybeOpenNewTab(e, href)) return
          if (onRowClick) onRowClick(row)
          else navigate(href)
        },
        onAuxClick: (e) => { if (e.button === 1) maybeOpenNewTab(e, href) },
      }
    }
    return onRowClick ? { onClick: () => onRowClick(row) } : {}
  }

  return (
    <div className="border border-[#323238] rounded-lg overflow-hidden">
      {mobileCard && (
        <div className="md:hidden divide-y divide-[#323238]">
          {paged.map((row, i) => (
            <div
              key={keyOf(row, i)}
              className={`flex items-stretch ${i % 2 === 0 ? 'bg-[#1a1a1a]' : 'bg-[#1e1e22]'}`}
            >
              {selectable && (
                <label className="flex items-center pl-3 shrink-0">
                  <Checkbox
                    checked={selected?.has(keyOf(row, i)) || false}
                    onChange={() => onToggle?.(keyOf(row, i))}
                  />
                </label>
              )}
              <div
                {...rowHandlers(row)}
                className={`flex-1 min-w-0 ${clickable ? 'cursor-pointer active:bg-[#202024]' : ''}`}
              >
                {mobileCard(row, onRowClick)}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className={`${mobileCard ? 'hidden md:block' : ''} overflow-x-auto`}>
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#323238] bg-[#111113]">
              {selectable && (
                <th className="w-10 px-3 py-3">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[#2563eb] cursor-pointer align-middle"
                    checked={todasMarcadas}
                    ref={(el) => { if (el) el.indeterminate = algumaMarcada && !todasMarcadas }}
                    onChange={() => onTogglePage?.(pageKeys)}
                  />
                </th>
              )}
              {columns.map((col, i) => (
                <th
                  key={i}
                  className={`px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider ${col.headerClass || ''}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.map((row, i) => (
              <tr
                key={keyOf(row, i)}
                {...rowHandlers(row)}
                className={`border-b border-[#323238] transition-colors group last:border-0
                  ${clickable ? 'cursor-pointer hover:bg-[#202024]' : ''}
                  ${selectable && selected?.has(keyOf(row, i)) ? 'bg-[#2563eb]/10' : (i % 2 === 0 ? 'bg-[#1a1a1a]' : 'bg-[#1e1e22]')}`}
              >
                {selectable && (
                  <td className="w-10 px-3 py-3">
                    <Checkbox
                      checked={selected?.has(keyOf(row, i)) || false}
                      onChange={() => onToggle?.(keyOf(row, i))}
                    />
                  </td>
                )}
                {columns.map((col, j) => (
                  <td key={j} className={`px-4 py-3 ${col.cellClass || ''}`}>
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {onPage && (
        <Pagination
          page={page}
          pageSize={pageSize}
          total={rows.length}
          onPage={onPage}
          onPageSize={onPageSize}
        />
      )}
    </div>
  )
}
