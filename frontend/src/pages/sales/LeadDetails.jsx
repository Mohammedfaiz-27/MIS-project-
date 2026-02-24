import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { leadsService } from '../../services/leads'
import { followupsService } from '../../services/followups'
import { salesEntriesService } from '../../services/salesEntries'
import StatusBadge from '../../components/common/StatusBadge'
import FileUpload from '../../components/common/FileUpload'
import { LEAD_TYPES, LEAD_STATUSES, CONSTRUCTION_STAGES, APPROVAL_STATUSES } from '../../utils/constants'
import { formatDate, formatDateTime } from '../../utils/helpers'
import toast from 'react-hot-toast'
import {
  FiArrowLeft, FiEdit, FiCalendar, FiDollarSign,
  FiUpload, FiPhone, FiMapPin, FiUser
} from 'react-icons/fi'

export default function LeadDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showUpload, setShowUpload] = useState(false)
  const [uploadFiles, setUploadFiles] = useState([])
  const [showLostForm, setShowLostForm] = useState(false)
  const [lostReason, setLostReason] = useState('')

  const { data: lead, isLoading } = useQuery({
    queryKey: ['lead', id],
    queryFn: () => leadsService.getById(id)
  })

  const { data: visits } = useQuery({
    queryKey: ['visits', id],
    queryFn: () => followupsService.getVisitHistory(id)
  })

  const { data: salesEntries } = useQuery({
    queryKey: ['salesEntries', id],
    queryFn: () => salesEntriesService.getByLead(id)
  })

  const uploadMutation = useMutation({
    mutationFn: (files) => leadsService.uploadPhotos(id, files),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead', id] })
      toast.success('Photos uploaded successfully!')
      setShowUpload(false)
      setUploadFiles([])
    },
    onError: () => {
      toast.error('Failed to upload photos')
    }
  })

  const statusMutation = useMutation({
    mutationFn: (status) => leadsService.updateStatus(id, status),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lead', id] })
      toast.success('Status updated!')
      if (variables === 'won') {
        navigate(`/leads/${id}/sales-entry`)
      } else if (variables === 'follow_up') {
        navigate(`/leads/${id}/followup`)
      }
    },
    onError: () => {
      toast.error('Failed to update status')
    }
  })

  const lostMutation = useMutation({
    mutationFn: (reason) => leadsService.update(id, { lead_status: 'lost', lost_reason: reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead', id] })
      toast.success('Lead marked as lost!')
      setShowLostForm(false)
      setLostReason('')
    },
    onError: () => {
      toast.error('Failed to update status')
    }
  })

  const handleStatusClick = (statusValue) => {
    if (lead?.lead_status === statusValue) return
    if (statusValue === 'lost') {
      setShowLostForm(true)
      return
    }
    statusMutation.mutate(statusValue)
  }

  const handleLostConfirm = () => {
    if (!lostReason.trim()) {
      toast.error('Please enter a reason for losing this lead')
      return
    }
    lostMutation.mutate(lostReason.trim())
  }

  const handleUpload = () => {
    if (uploadFiles.length > 0) {
      uploadMutation.mutate(uploadFiles)
    }
  }

  if (isLoading) {
    return <div className="p-8 text-center">Loading...</div>
  }

  if (!lead) {
    return <div className="p-8 text-center">Lead not found</div>
  }

  return (
    <div>
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <FiArrowLeft className="w-4 h-4" />
        Back
      </button>

      {/* Header */}
      <div className="card mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{lead.customer_name}</h1>
            <div className="flex items-center gap-4 mt-2 text-gray-600">
              <span className="flex items-center gap-1">
                <FiPhone className="w-4 h-4" />
                {lead.phone_number}
              </span>
              <span className="flex items-center gap-1">
                <FiMapPin className="w-4 h-4" />
                {lead.site_location_name}, {lead.area}
              </span>
              <span className="flex items-center gap-1">
                <FiUser className="w-4 h-4" />
                {lead.sales_person_name}
              </span>
            </div>
            <div className="flex gap-2 mt-3">
              <StatusBadge status={lead.lead_type} statusList={LEAD_TYPES} />
              <StatusBadge status={lead.lead_status} statusList={LEAD_STATUSES} />
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                {CONSTRUCTION_STAGES.find(s => s.value === lead.construction_stage)?.label}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate(`/leads/${id}/edit`)}
              className="btn btn-secondary flex items-center gap-2"
            >
              <FiEdit className="w-4 h-4" />
              Edit
            </button>
            {lead.lead_status === 'follow_up' && (
              <button
                onClick={() => navigate(`/leads/${id}/followup`)}
                className="btn btn-primary flex items-center gap-2"
              >
                <FiCalendar className="w-4 h-4" />
                Add Follow-up
              </button>
            )}
            {lead.lead_status === 'won' && (
              <button
                onClick={() => navigate(`/leads/${id}/sales-entry`)}
                className="btn btn-success flex items-center gap-2"
              >
                <FiDollarSign className="w-4 h-4" />
                Add Sales Entry
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Lead Info */}
        <div className="col-span-2 space-y-6">
          {/* Details */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Lead Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-500">Builder Type</label>
                <p className="font-medium capitalize">{lead.builder_type}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Occupation</label>
                <p className="font-medium">{lead.occupation || '-'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Steel Brand</label>
                <p className="font-medium">{lead.steel_brand || '-'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Cement Brand</label>
                <p className="font-medium">{lead.cement_brand || '-'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Next Follow-up</label>
                <p className="font-medium">{formatDate(lead.next_followup_date)}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Visit Count</label>
                <p className="font-medium">{lead.visit_count}</p>
              </div>
            </div>
            {lead.remarks && (
              <div className="mt-4 pt-4 border-t">
                <label className="text-sm text-gray-500">Remarks</label>
                <p className="mt-1">{lead.remarks}</p>
              </div>
            )}
            {lead.lost_reason && (
              <div className="mt-4 pt-4 border-t">
                <label className="text-sm text-gray-500">Lost Reason</label>
                <p className="mt-1 text-red-600">{lead.lost_reason}</p>
              </div>
            )}
          </div>

          {/* Visit History */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Visit History</h2>
            {visits?.length > 0 ? (
              <div className="space-y-4">
                {visits.map((visit) => (
                  <div key={visit.id} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{formatDateTime(visit.visit_date)}</p>
                        <p className="text-sm text-gray-600 mt-1">{visit.remarks}</p>
                        {visit.next_followup_date && (
                          <p className="text-sm text-primary-600 mt-1">
                            Next Follow-up: {formatDateTime(visit.next_followup_date)}
                          </p>
                        )}
                      </div>
                      <span className="text-sm text-gray-500">
                        Stage: {CONSTRUCTION_STAGES.find(s => s.value === visit.construction_stage_at_visit)?.label}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No visits recorded yet</p>
            )}
          </div>

          {/* Sales Entries */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Sales Entries</h2>
            {salesEntries?.length > 0 ? (
              <div className="space-y-4">
                {salesEntries.map((entry) => (
                  <div key={entry.id} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm text-gray-500">{formatDate(entry.created_at)}</p>
                        <p className="font-medium mt-1">
                          Steel: {entry.steel_quantity_kg} kg | Cement: {entry.cement_quantity_bags} bags
                        </p>
                      </div>
                      <StatusBadge status={entry.approval_status} statusList={APPROVAL_STATUSES} />
                    </div>
                    {entry.rejection_reason && (
                      <p className="text-sm text-red-600 mt-2">Reason: {entry.rejection_reason}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No sales entries yet</p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Update */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Update Status</h2>
            <div className="space-y-2">
              {LEAD_STATUSES.map((status) => (
                <button
                  key={status.value}
                  onClick={() => handleStatusClick(status.value)}
                  disabled={
                    lead.lead_status === status.value ||
                    statusMutation.isPending ||
                    lostMutation.isPending
                  }
                  className={`w-full p-3 rounded-lg text-left transition-colors ${
                    lead.lead_status === status.value
                      ? 'bg-primary-100 border-2 border-primary-500'
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <StatusBadge status={status.value} statusList={LEAD_STATUSES} />
                </button>
              ))}
            </div>

            {/* Inline Lost Reason Form */}
            {showLostForm && (
              <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
                <p className="text-sm font-medium text-red-800 mb-2">
                  Reason for losing this lead *
                </p>
                <textarea
                  value={lostReason}
                  onChange={(e) => setLostReason(e.target.value)}
                  className="input text-sm"
                  rows={3}
                  placeholder="Enter reason..."
                />
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handleLostConfirm}
                    disabled={lostMutation.isPending}
                    className="btn btn-primary text-sm py-1.5"
                  >
                    {lostMutation.isPending ? 'Saving...' : 'Confirm Lost'}
                  </button>
                  <button
                    onClick={() => {
                      setShowLostForm(false)
                      setLostReason('')
                    }}
                    className="btn btn-secondary text-sm py-1.5"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Photos */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Site Photos</h2>
              <button
                onClick={() => setShowUpload(!showUpload)}
                className="text-primary-600 hover:text-primary-700"
              >
                <FiUpload className="w-5 h-5" />
              </button>
            </div>

            {showUpload && (
              <div className="mb-4">
                <FileUpload onFilesSelected={setUploadFiles} />
                <button
                  onClick={handleUpload}
                  disabled={uploadFiles.length === 0 || uploadMutation.isPending}
                  className="btn btn-primary w-full mt-4"
                >
                  {uploadMutation.isPending ? 'Uploading...' : 'Upload Photos'}
                </button>
              </div>
            )}

            {lead.site_photos?.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {lead.site_photos.map((photo, index) => (
                  <img
                    key={index}
                    src={photo}
                    alt={`Site photo ${index + 1}`}
                    className="w-full h-24 object-cover rounded-lg"
                  />
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No photos uploaded</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
