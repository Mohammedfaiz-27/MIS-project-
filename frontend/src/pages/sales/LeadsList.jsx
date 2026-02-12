import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { leadsService } from '../../services/leads'
import { useFilterStore } from '../../store/filterStore'
import DataTable from '../../components/common/DataTable'
import GlobalFilters from '../../components/common/GlobalFilters'
import StatusBadge from '../../components/common/StatusBadge'
import { LEAD_TYPES, LEAD_STATUSES } from '../../utils/constants'
import { formatDate, buildQueryParams } from '../../utils/helpers'
import { FiEye, FiEdit, FiPlus } from 'react-icons/fi'

export default function LeadsList() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const { filters } = useFilterStore()

  const { data, isLoading } = useQuery({
    queryKey: ['leads', page, filters],
    queryFn: () => leadsService.getAll({
      page,
      page_size: 20,
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
      label: 'Site Location',
      render: (value, row) => (
        <div>
          <p>{value}</p>
          <p className="text-xs text-gray-500">{row.area}</p>
        </div>
      )
    },
    {
      key: 'lead_type',
      label: 'Type',
      render: (value) => <StatusBadge status={value} statusList={LEAD_TYPES} />
    },
    {
      key: 'lead_status',
      label: 'Status',
      render: (value) => <StatusBadge status={value} statusList={LEAD_STATUSES} />
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
      label: 'Next Follow-up',
      render: (value) => formatDate(value)
    },
    {
      key: 'visit_count',
      label: 'Visits'
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/leads/${row.id}`)}
            className="p-2 text-gray-600 hover:text-primary-600"
            title="View"
          >
            <FiEye className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate(`/leads/${row.id}/edit`)}
            className="p-2 text-gray-600 hover:text-primary-600"
            title="Edit"
          >
            <FiEdit className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Leads</h1>
        <button
          onClick={() => navigate('/leads/new')}
          className="btn btn-primary flex items-center gap-2"
        >
          <FiPlus className="w-4 h-4" />
          New Lead
        </button>
      </div>

      <GlobalFilters />

      <DataTable
        columns={columns}
        data={data?.leads}
        page={page}
        totalPages={data?.total_pages}
        onPageChange={setPage}
        isLoading={isLoading}
        emptyMessage="No leads found. Create your first lead!"
      />
    </div>
  )
}
