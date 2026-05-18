import { Search, ChevronUp, ChevronDown } from 'lucide-react'

export default function Table({
  columns,
  data,
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  actions,
  emptyText = 'No records found.'
}) {
  return (
    <div className="card p-0 overflow-hidden">
      {/* Search bar */}
      {onSearchChange && (
        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50">
          <Search size={16} className="text-slate-400" />
          <input
            type="text"
            className="flex-1 bg-transparent text-sm text-slate-700 placeholder-slate-400 focus:outline-none"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              {columns.map((col) => (
                <th key={col.key} className="table-th" style={{ width: col.width }}>
                  {col.label}
                </th>
              ))}
              {actions && <th className="table-th text-right">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (actions ? 1 : 0)}
                  className="text-center py-12 text-slate-400 text-sm"
                >
                  {emptyText}
                </td>
              </tr>
            ) : (
              data.map((row, idx) => (
                <tr
                  key={row.id || idx}
                  className="hover:bg-slate-50/70 transition-colors duration-100"
                >
                  {columns.map((col) => (
                    <td key={col.key} className="table-td">
                      {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                    </td>
                  ))}
                  {actions && (
                    <td className="table-td text-right">
                      <div className="flex items-center justify-end gap-2">
                        {actions(row)}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
