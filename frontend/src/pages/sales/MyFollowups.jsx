import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { followupsService } from '../../services/followups'
import StatusBadge from '../../components/common/StatusBadge'
import { LEAD_TYPES } from '../../utils/constants'
import { formatDate } from '../../utils/helpers'
import { FiPhone, FiMapPin, FiCalendar, FiAlertCircle } from 'react-icons/fi'

export default function MyFollowups() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('overdue')

  const { data: overdueData, isLoading: loadingOverdue } = useQuery({
    queryKey: ['followups', 'overdue'],
    queryFn: followupsService.getOverdue
  })

  const { data: todayData, isLoading: loadingToday } = useQuery({
    queryKey: ['followups', 'today'],
    queryFn: followupsService.getToday
  })

  const { data: upcomingData, isLoading: loadingUpcoming } = useQuery({
    queryKey: ['followups', 'upcoming'],
    queryFn: () => followupsService.getUpcoming(7)
  })

  const tabs = [
    { id: 'overdue', label: 'Overdue', count: overdueData?.total || 0, color: 'text-red-600' },
    { id: 'today', label: 'Today', count: todayData?.total || 0, color: 'text-yellow-600' },
    { id: 'upcoming', label: 'Upcoming', count: upcomingData?.total || 0, color: 'text-green-600' }
  ]

  const getData = () => {
    switch (activeTab) {
      case 'overdue': return overdueData?.followups || []
      case 'today': return todayData?.followups || []
      case 'upcoming': return upcomingData?.followups || []
      default: return []
    }
  }

  const isLoading = loadingOverdue || loadingToday || loadingUpcoming

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Follow-ups</h1>

      {/* Tabs */}
      <div className="flex gap-4 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.label}
            <span className={`ml-2 ${activeTab === tab.id ? 'text-white' : tab.color}`}>
              ({tab.count})
            </span>
          </button>
        ))}
      </div>

      {/* Follow-up List */}
      {isLoading ? (
        <div className="p-8 text-center text-gray-500">Loading...</div>
      ) : getData().length === 0 ? (
        <div className="card p-8 text-center text-gray-500">
          No {activeTab} follow-ups
        </div>
      ) : (
        <div className="space-y-4">
          {getData().map((followup) => (
            <div
              key={followup.id}
              onClick={() => navigate(`/leads/${followup.id}`)}
              className="card cursor-pointer hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-gray-900">{followup.customer_name}</h3>
                    <StatusBadge status={followup.lead_type} statusList={LEAD_TYPES} />
                    {followup.is_overdue && (
                      <span className="flex items-center gap-1 text-red-600 text-sm">
                        <FiAlertCircle className="w-4 h-4" />
                        {followup.pending_days} days overdue
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <FiPhone className="w-4 h-4" />
                      {followup.phone_number}
                    </span>
                    <span className="flex items-center gap-1">
                      <FiMapPin className="w-4 h-4" />
                      {followup.site_location_name}, {followup.area}
                    </span>
                    <span className="flex items-center gap-1">
                      <FiCalendar className="w-4 h-4" />
                      {formatDate(followup.next_followup_date)}
                    </span>
                  </div>

                  <div className="mt-2 text-sm text-gray-500">
                    Stage: <span className="capitalize">{followup.construction_stage?.replace('_', ' ')}</span>
                    {' | '}
                    Visits: {followup.visit_count}
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    navigate(`/leads/${followup.id}/followup`)
                  }}
                  className="btn btn-primary"
                >
                  Add Follow-up
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
