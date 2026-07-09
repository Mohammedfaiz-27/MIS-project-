import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { dashboardService } from '../../services/dashboard'
import { useFilterStore } from '../../store/filterStore'
import {
  FiUserPlus, FiCalendar, FiAlertTriangle, FiAward, FiCheckCircle
} from 'react-icons/fi'

export default function TodayOverview() {
  const navigate = useNavigate()
  const { setFilters } = useFilterStore()
  const todayStr = format(new Date(), 'yyyy-MM-dd')

  const { data, isLoading } = useQuery({
    queryKey: ['todaySummary'],
    queryFn: dashboardService.getTodaySummary
  })

  const cards = [
    {
      key: 'new_leads_today',
      icon: FiUserPlus,
      tone: 'border-primary-200 bg-primary-50 text-primary-700',
      onClick: () => {
        setFilters({ startDate: todayStr, endDate: todayStr })
        navigate('/admin/leads')
      }
    },
    {
      key: 'followups_due_today',
      icon: FiCalendar,
      tone: 'border-yellow-200 bg-yellow-50 text-yellow-700',
      onClick: () => navigate('/admin/followups')
    },
    {
      key: 'overdue_followups',
      icon: FiAlertTriangle,
      tone: 'border-red-300 bg-red-50 text-red-700',
      highlight: true,
      onClick: () => navigate('/admin/followups', { state: { overdueOnly: true } })
    },
    {
      key: 'sales_won_today',
      icon: FiAward,
      tone: 'border-green-200 bg-green-50 text-green-700',
      onClick: () => navigate('/admin/sales-entries', { state: { statusFilter: 'approved' } })
    },
    {
      key: 'pending_approvals',
      icon: FiCheckCircle,
      tone: 'border-orange-200 bg-orange-50 text-orange-700',
      onClick: () => navigate('/admin/sales-entries', { state: { statusFilter: 'pending' } })
    }
  ]

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Today's overview</h2>
        <span className="text-xs text-gray-400">{format(new Date(), 'EEEE, d MMM yyyy')}</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {cards.map(({ key, icon: Icon, tone, highlight, onClick }) => {
          const item = data?.[key]
          return (
            <button
              key={key}
              onClick={onClick}
              className={`text-left rounded-xl border p-4 transition-shadow hover:shadow-md ${tone} ${highlight && item?.value > 0 ? 'ring-2 ring-red-300' : ''}`}
            >
              <Icon className="w-5 h-5 mb-2" />
              <p className="text-2xl font-bold leading-tight">
                {isLoading ? '-' : (item?.value ?? 0)}
              </p>
              <p className="text-xs font-medium mt-0.5">{item?.label || ''}</p>
            </button>
          )
        })}
      </div>
    </div>
  )
}
