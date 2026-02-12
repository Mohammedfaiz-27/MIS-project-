import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { dashboardService } from '../../services/dashboard'
import { useFilterStore } from '../../store/filterStore'
import DataTable from '../../components/common/DataTable'
import GlobalFilters from '../../components/common/GlobalFilters'
import StatusBadge from '../../components/common/StatusBadge'
import { LEAD_TYPES } from '../../utils/constants'
import { formatDate, buildQueryParams } from '../../utils/helpers'
import { FiEye, FiAlertCircle } from 'react-icons/fi'

export default function FollowupControl() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [overdueOnly, setOverdueOnly] = useState(false)
  const { filters } = useFilterStore()

  const { data, isLoading } = useQuery({
    queryKey: ['followupTable', page, filters, overdueOnly],
    queryFn: () => dashboardService.getFollowupTable({
      page,
      page_size: 20,
      overdue_only: overdueOnly,
      ...buildQueryParams(filters)
    })
  })

  const columns = [
    {
      key: 'customer_name',
      label: 'Customer',
      render: (value, row) => (
        <div>
          <p className="font-medium">{value}</p>
          <p className="text-xs text-gray-500">{row.phone_number}</p>
        </div>
      )
    },
    {
      key: 'site_location_name',
      label: 'Site',
      render: (value, row) => (
        <div>
          <p>{value}</p>
          <p className="text-xs text-gray-500">{row.area}</p>
        </div>
      )
    },
    {
      key: 'sales_person_name',
      label: 'Salesperson'
    },
    {
      key: 'lead_type',
      label: 'Type',
      render: (value) => <StatusBadge status={value} statusList={LEAD_TYPES} />
    },
    {
      key: 'construction_stage',
      label: 'Stage',
      render: (value) => (
        <span className="capitalize">{value?.replace('_', ' ')}</span>
      )
    },
    {
      key: 'next_followup_date',
      label: 'Follow-up Date',
      render: (value) => formatDate(value)
    },
    {
      key: 'pending_days',
      label: 'Status',
      render: (value, row) => (
        row.is_overdue ? (
          <span className="flex items-center gap-1 text-red-600">
            <FiAlertCircle className="w-4 h-4" />
            {value} days overdue
          </span>
        ) : (
          <span className="text-green-600">On track</span>
        )
      )
    },
    {
      key: 'visit_count',
      label: 'Visits'
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <button
          onClick={() => navigate(`/leads/${row.lead_id}`)}
          className="p-2 text-gray-600 hover:text-primary-600"
          title="View Lead"
        >
          <FiEye className="w-4 h-4" />
        </button>
      )
    }
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Follow-up Control</h1>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={overdueOnly}
            onChange={(e) => setOverdueOnly(e.target.checked)}
            className="w-4 h-4 text-primary-600 rounded"
          />
          <span>Show overdue only</span>
        </label>
      </div>

      <GlobalFilters showLeadFilters={false} />

      <DataTable
        columns={columns}
        data={data?.items}
        page={page}
        totalPages={data?.total_pages}
        onPageChange={setPage}
        isLoading={isLoading}
        emptyMessage="No follow-ups pending"
      />
    </div>
  )
}
