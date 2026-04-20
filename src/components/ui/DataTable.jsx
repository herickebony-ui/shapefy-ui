import { useMemo } from 'react'
import Pagination from './Pagination'

/**
 * DataTable — tabela padronizada com linhas alternadas, hover e paginação.
 *
 * columns: [{ label, headerClass?, cellClass?, render(row) }]
 * rows: array completo (filtrado) — o componente faz o slice internamente
 * onRowClick(row): handler de clique na linha (opcional)
 * page, pageSize, onPage, onPageSize: paginação controlada pelo pai
 */
export default function DataTable({
  columns,
  rows,
  onRowClick,
  page = 1,
  pageSize = 20,
  onPage,
  onPageSize,
  rowKey = 'name',
}) {
  const paged = useMemo(() => {
    const start = (page - 1) * pageSize
    return rows.slice(start, start + pageSize)
  }, [rows, page, pageSize])

  return (
    <div className="border border-[#323238] rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#323238] bg-[#111113]">
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
                key={row[rowKey] ?? i}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`border-b border-[#323238] transition-colors group last:border-0
                  ${onRowClick ? 'cursor-pointer hover:bg-[#202024]' : ''}
                  ${i % 2 === 0 ? 'bg-[#1a1a1a]' : 'bg-[#1e1e22]'}`}
              >
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
