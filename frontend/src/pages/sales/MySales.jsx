import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { salesEntriesService } from '../../services/salesEntries'
import { useFilterStore } from '../../store/filterStore'
import GlobalFilters from '../../components/common/GlobalFilters'
import StatusBadge from '../../components/common/StatusBadge'
import { APPROVAL_STATUSES } from '../../utils/constants'
import { formatDate, buildQueryParams } from '../../utils/helpers'
import { FiEye } from 'react-icons/fi'

export default function MySales() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const { filters } = useFilterStore()

  useEffect(() => { setPage(1) }, [filters])

  const { data, isLoading } = useQuery({
    queryKey: ['mySales', page, filters],
    queryFn: () => salesEntriesService.getAll({ page, page_size: 20, ...buildQueryParams(filters) })
  })

  const entries = data?.entries || []

  const totalSteel = entries.reduce((sum, e) => sum + (e.steel_quantity_kg || 0), 0)
  const totalCement = entries.reduce((sum, e) => sum + (e.cement_quantity_bags || 0), 0)
  const approvedCount = entries.filter(e => e.approval_status === 'approved').length

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Sales</h1>
      </div>

      <GlobalFilters showLeadFilters={false} />

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card text-center">
          <p className="text-sm text-gray-500">Total Entries</p>
          <p className="text-2xl font-bold text-gray-900">{data?.total || 0}</p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-gray-500">Total Steel (kg)</p>
          <p className="text-2xl font-bold text-primary-600">{totalSteel.toFixed(1)}</p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-gray-500">Total Cement (bags)</p>
          <p className="text-2xl font-bold text-primary-600">{totalCement.toFixed(1)}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-gray-500">Loading...</div>
      ) : entries.length === 0 ? (
        <div className="card p-8 text-center text-gray-500">
          No sales entries yet.
        </div>
      ) : (
        <div className="space-y-4">
          {entries.map((entry) => (
            <div
              key={entry.id}
              onClick={() => navigate(`/leads/${entry.lead_id}`)}
              className="card cursor-pointer hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-semibold text-gray-900">{entry.customer_name}</h3>
                    <StatusBadge status={entry.approval_status} statusList={APPROVAL_STATUSES} />
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    {entry.site_location_name}, {entry.area}
                  </p>
                  <div className="flex gap-6 text-sm text-gray-700">
                    <span>Steel: <strong>{entry.steel_quantity_kg} kg</strong></span>
                    <span>Cement: <strong>{entry.cement_quantity_bags} bags</strong></span>
                    <span>Date: {formatDate(entry.created_at)}</span>
                  </div>
                  {entry.rejection_reason && (
                    <p className="text-sm text-red-600 mt-1">
                      Rejection Reason: {entry.rejection_reason}
                    </p>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    navigate(`/leads/${entry.lead_id}`)
                  }}
                  className="p-2 text-gray-600 hover:text-primary-600"
                  title="View Lead"
                >
                  <FiEye className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {data?.total_pages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="btn btn-secondary disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-sm text-gray-600">
                Page {page} of {data?.total_pages}
              </span>
              <button
                disabled={page >= data?.total_pages}
                onClick={() => setPage(p => p + 1)}
                className="btn btn-secondary disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
