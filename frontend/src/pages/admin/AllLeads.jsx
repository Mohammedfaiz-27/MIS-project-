import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { leadsService } from '../../services/leads'
import { useFilterStore } from '../../store/filterStore'
import DataTable from '../../components/common/DataTable'
import GlobalFilters from '../../components/common/GlobalFilters'
import StatusBadge from '../../components/common/StatusBadge'
import { LEAD_TYPES, LEAD_STATUSES } from '../../utils/constants'
import { formatDate, buildQueryParams } from '../../utils/helpers'
import { FiEye, FiDownload, FiImage } from 'react-icons/fi'
import { adminService } from '../../services/admin'
import { downloadBlob } from '../../utils/helpers'
import toast from 'react-hot-toast'

export default function AllLeads() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const { filters } = useFilterStore()

  useEffect(() => { setPage(1) }, [filters])

  const { data, isLoading } = useQuery({
    queryKey: ['leads', 'admin', page, filters],
    queryFn: () => leadsService.getAll({
      page,
      page_size: 20,
      ...buildQueryParams(filters)
    })
  })

  const handleExport = async (format) => {
    try {
      const blob = await adminService.exportLeads({
        format,
        ...buildQueryParams(filters)
      })
      downloadBlob(blob, `leads_export.${format === 'excel' ? 'xlsx' : 'csv'}`)
      toast.success('Export successful!')
    } catch {
      toast.error('Export failed')
    }
  }

  const [previewImage, setPreviewImage] = useState(null)

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
      key: 'site_photos',
      label: 'Site Photo',
      render: (value) => (
        value && value.length > 0 ? (
          <div className="flex items-center gap-1">
            <img
              src={value[0]}
              alt="Site"
              className="w-10 h-10 object-cover rounded cursor-pointer border border-gray-200 hover:opacity-80"
              onClick={(e) => { e.stopPropagation(); setPreviewImage(value[0]) }}
            />
            {value.length > 1 && (
              <span className="text-xs text-gray-500">+{value.length - 1}</span>
            )}
          </div>
        ) : (
          <span className="text-gray-400"><FiImage className="w-5 h-5" /></span>
        )
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
      key: 'sales_person_name',
      label: 'Salesperson'
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
        <button
          onClick={() => navigate(`/leads/${row.id}`)}
          className="p-2 text-gray-600 hover:text-primary-600"
          title="View"
        >
          <FiEye className="w-4 h-4" />
        </button>
      )
    }
  ]

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">All Leads</h1>
        <div className="flex gap-2">
          <button
            onClick={() => handleExport('excel')}
            className="btn btn-secondary flex items-center gap-2 text-sm"
          >
            <FiDownload className="w-4 h-4" />
            <span className="hidden sm:inline">Export </span>Excel
          </button>
          <button
            onClick={() => handleExport('csv')}
            className="btn btn-secondary flex items-center gap-2 text-sm"
          >
            <FiDownload className="w-4 h-4" />
            <span className="hidden sm:inline">Export </span>CSV
          </button>
        </div>
      </div>

      <GlobalFilters />

      <DataTable
        columns={columns}
        data={data?.leads}
        page={page}
        totalPages={data?.total_pages}
        onPageChange={setPage}
        isLoading={isLoading}
        emptyMessage="No leads found"
      />

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-3xl max-h-[80vh]">
            <img
              src={previewImage}
              alt="Site photo preview"
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
            />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-3 -right-3 bg-white text-gray-800 rounded-full w-8 h-8 flex items-center justify-center shadow-lg hover:bg-gray-100"
            >
              &times;
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
