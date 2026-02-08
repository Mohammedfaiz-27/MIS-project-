import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { salesEntriesService } from '../../services/salesEntries'
import DataTable from '../../components/common/DataTable'
import StatusBadge from '../../components/common/StatusBadge'
import Modal from '../../components/common/Modal'
import { APPROVAL_STATUSES } from '../../utils/constants'
import { formatDate, formatNumber } from '../../utils/helpers'
import { FiCheck, FiX } from 'react-icons/fi'
import toast from 'react-hot-toast'

export default function SalesApprovals() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('pending')
  const [rejectModal, setRejectModal] = useState({ isOpen: false, entryId: null })
  const [rejectReason, setRejectReason] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['salesEntries', 'admin', page, statusFilter],
    queryFn: () => salesEntriesService.getAll({
      page,
      page_size: 20,
      approval_status: statusFilter || undefined
    })
  })

  const approveMutation = useMutation({
    mutationFn: salesEntriesService.approve,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salesEntries'] })
      queryClient.invalidateQueries({ queryKey: ['kpis'] })
      toast.success('Entry approved!')
    },
    onError: () => {
      toast.error('Failed to approve')
    }
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }) => salesEntriesService.reject(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salesEntries'] })
      setRejectModal({ isOpen: false, entryId: null })
      setRejectReason('')
      toast.success('Entry rejected')
    },
    onError: () => {
      toast.error('Failed to reject')
    }
  })

  const handleReject = () => {
    if (!rejectReason.trim()) {
      toast.error('Please provide a reason')
      return
    }
    rejectMutation.mutate({ id: rejectModal.entryId, reason: rejectReason })
  }

  const columns = [
    {
      key: 'customer_name',
      label: 'Customer',
      render: (value, row) => (
        <div>
          <p className="font-medium">{value}</p>
          <p className="text-xs text-gray-500">{row.site_location_name}</p>
        </div>
      )
    },
    {
      key: 'area',
      label: 'Area'
    },
    {
      key: 'sales_person_name',
      label: 'Salesperson'
    },
    {
      key: 'steel_quantity_kg',
      label: 'Steel (kg)',
      render: (value) => formatNumber(value)
    },
    {
      key: 'cement_quantity_bags',
      label: 'Cement (bags)',
      render: (value) => formatNumber(value)
    },
    {
      key: 'approval_status',
      label: 'Status',
      render: (value) => <StatusBadge status={value} statusList={APPROVAL_STATUSES} />
    },
    {
      key: 'created_at',
      label: 'Submitted',
      render: (value) => formatDate(value)
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        row.approval_status === 'pending' ? (
          <div className="flex gap-2">
            <button
              onClick={() => approveMutation.mutate(row.id)}
              disabled={approveMutation.isPending}
              className="p-2 text-green-600 hover:bg-green-50 rounded"
              title="Approve"
            >
              <FiCheck className="w-5 h-5" />
            </button>
            <button
              onClick={() => setRejectModal({ isOpen: true, entryId: row.id })}
              className="p-2 text-red-600 hover:bg-red-50 rounded"
              title="Reject"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>
        ) : row.rejection_reason ? (
          <span className="text-sm text-gray-500">
            Reason: {row.rejection_reason}
          </span>
        ) : null
      )
    }
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Sales Entry Approvals</h1>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input w-48"
        >
          <option value="">All Statuses</option>
          {APPROVAL_STATUSES.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      <DataTable
        columns={columns}
        data={data?.entries}
        page={page}
        totalPages={data?.total_pages}
        onPageChange={setPage}
        isLoading={isLoading}
        emptyMessage="No sales entries"
      />

      {/* Reject Modal */}
      <Modal
        isOpen={rejectModal.isOpen}
        onClose={() => setRejectModal({ isOpen: false, entryId: null })}
        title="Reject Sales Entry"
      >
        <div className="space-y-4">
          <div>
            <label className="label">Rejection Reason *</label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="input"
              rows={3}
              placeholder="Explain why this entry is being rejected..."
            />
          </div>
          <div className="flex gap-4 justify-end">
            <button
              onClick={() => setRejectModal({ isOpen: false, entryId: null })}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleReject}
              disabled={rejectMutation.isPending}
              className="btn btn-danger"
            >
              {rejectMutation.isPending ? 'Rejecting...' : 'Reject'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
