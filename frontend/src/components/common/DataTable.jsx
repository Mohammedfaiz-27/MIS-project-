import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'

export default function DataTable({
  columns,
  data,
  page = 1,
  totalPages = 1,
  onPageChange,
  isLoading = false,
  emptyMessage = 'No data found'
}) {
  if (isLoading) {
    return (
      <div className="table-container p-8 text-center text-gray-500">
        Loading...
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="table-container p-8 text-center text-gray-500">
        {emptyMessage}
      </div>
    )
  }

  const actionCol = columns.find(c => c.key === 'actions')
  const dataColumns = columns.filter(c => c.key !== 'actions')

  const pagination = totalPages > 1 && (
    <div className="px-4 md:px-6 py-4 border-t border-gray-200 flex items-center justify-between">
      <p className="text-sm text-gray-500">
        Page {page} of {totalPages}
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="btn btn-secondary p-2 disabled:opacity-50"
        >
          <FiChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="btn btn-secondary p-2 disabled:opacity-50"
        >
          <FiChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )

  return (
    <div className="table-container">
      {/* Mobile card view */}
      <div className="md:hidden divide-y divide-gray-200">
        {data.map((row, rowIndex) => (
          <div key={row.id || rowIndex} className="p-4 space-y-2">
            {dataColumns.map((col) => (
              <div key={col.key} className="flex items-start gap-2">
                <span className="text-xs text-gray-500 font-medium w-28 shrink-0 pt-0.5">
                  {col.label}
                </span>
                <span className="text-sm text-gray-900 flex-1 min-w-0">
                  {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '-')}
                </span>
              </div>
            ))}
            {actionCol && (
              <div className="flex justify-end pt-2 border-t border-gray-100">
                {actionCol.render(null, row)}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Desktop table view */}
      <div className="hidden md:block">
        <table className="table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key}>{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data.map((row, rowIndex) => (
              <tr key={row.id || rowIndex}>
                {columns.map((col) => (
                  <td key={col.key}>
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination}
    </div>
  )
}
