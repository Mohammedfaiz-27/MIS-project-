import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { startOfMonth, endOfMonth, parse, format } from 'date-fns'
import { dashboardService } from '../../services/dashboard'
import { useFilterStore } from '../../store/filterStore'
import GlobalFilters from '../../components/common/GlobalFilters'
import KPICard from '../../components/common/KPICard'
import TodayOverview from '../../components/dashboard/TodayOverview'
import PeriodQuickFilters from '../../components/dashboard/PeriodQuickFilters'
import InsightsPanel from '../../components/dashboard/InsightsPanel'
import PerformanceTable from '../../components/dashboard/PerformanceTable'
import AreaSummary from '../../components/dashboard/AreaSummary'
import { buildQueryParams } from '../../utils/helpers'
import {
  FiUsers, FiCalendar, FiAlertCircle,
  FiPackage, FiBox, FiPercent, FiCheckCircle, FiChevronDown, FiChevronUp, FiAward
} from 'react-icons/fi'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer
} from 'recharts'

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [showFollowupBreakdown, setShowFollowupBreakdown] = useState(false)
  const { filters, setFilters } = useFilterStore()
  const params = buildQueryParams(filters)

  const { data: kpis } = useQuery({
    queryKey: ['kpis', filters],
    queryFn: () => dashboardService.getKPIs(params)
  })

  const { data: salesTrend } = useQuery({
    queryKey: ['salesTrend', filters],
    queryFn: () => dashboardService.getSalesTrend({ months: 6, ...params })
  })

  const { data: contribution } = useQuery({
    queryKey: ['contribution', filters],
    queryFn: () => dashboardService.getContribution(params)
  })

  const { data: performance } = useQuery({
    queryKey: ['performance', filters],
    queryFn: () => dashboardService.getSalespersonPerformance(params)
  })

  const goWithFilter = (extraFilters) => {
    setFilters(extraFilters)
    navigate('/admin/leads')
  }

  // Drill-down: clicking a point on the sales trend chart opens that month's leads
  const handleTrendClick = (chartState) => {
    const label = chartState?.activeLabel
    if (!label) return
    const monthDate = parse(label, 'yyyy-MM', new Date())
    goWithFilter({
      startDate: format(startOfMonth(monthDate), 'yyyy-MM-dd'),
      endDate: format(endOfMonth(monthDate), 'yyyy-MM-dd')
    })
  }

  // Drill-down: clicking a bar in the performance chart opens that salesperson's leads
  const handlePerformanceBarClick = (data) => {
    if (data?.salesperson_id) {
      goWithFilter({ salesPersonId: data.salesperson_id })
    }
  }

  const contributionData = contribution?.data || []
  const showContributionChart = contributionData.length > 1

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Dashboard</h1>

      <TodayOverview />

      <PeriodQuickFilters />
      <GlobalFilters showLeadFilters={false} />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <KPICard
          label={kpis?.total_leads?.label || 'Total Leads'}
          value={kpis?.total_leads?.value || 0}
          icon={FiUsers}
          color="primary"
          onClick={() => goWithFilter({})}
        />

        {/* Pending Follow-ups - Expandable */}
        <div className="col-span-1">
          <div
            className="card cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setShowFollowupBreakdown(!showFollowupBreakdown)}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-yellow-100 text-yellow-600">
                <FiCalendar className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <p className="text-2xl font-bold text-gray-900">{kpis?.pending_followups?.value || 0}</p>
                <p className="text-sm text-gray-500">Pending Follow-ups</p>
              </div>
              {showFollowupBreakdown ? (
                <FiChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <FiChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </div>

            {showFollowupBreakdown && (
              <div className="mt-4 pt-3 border-t border-gray-100 space-y-2">
                <div
                  className="flex items-center justify-between cursor-pointer hover:bg-gray-50 rounded px-1 -mx-1"
                  onClick={(e) => { e.stopPropagation(); goWithFilter({ leadType: 'hot' }) }}
                >
                  <span className="text-sm flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                    Hot Leads
                  </span>
                  <span className="text-sm font-semibold text-red-600">{kpis?.hot_leads?.value || 0}</span>
                </div>
                <div
                  className="flex items-center justify-between cursor-pointer hover:bg-gray-50 rounded px-1 -mx-1"
                  onClick={(e) => { e.stopPropagation(); goWithFilter({ leadType: 'warm' }) }}
                >
                  <span className="text-sm flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>
                    Warm Leads
                  </span>
                  <span className="text-sm font-semibold text-yellow-600">{kpis?.warm_leads?.value || 0}</span>
                </div>
                <div
                  className="flex items-center justify-between cursor-pointer hover:bg-gray-50 rounded px-1 -mx-1"
                  onClick={(e) => { e.stopPropagation(); goWithFilter({ leadType: 'cold' }) }}
                >
                  <span className="text-sm flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                    Cold Leads
                  </span>
                  <span className="text-sm font-semibold text-blue-600">{kpis?.cold_leads?.value || 0}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <KPICard
          label={kpis?.overdue_followups?.label || 'Overdue Follow-ups'}
          value={kpis?.overdue_followups?.value || 0}
          icon={FiAlertCircle}
          color="red"
          onClick={() => navigate('/admin/followups', { state: { overdueOnly: true } })}
        />
        <KPICard
          label={kpis?.total_steel_kg?.label || 'Total Steel (kg)'}
          value={Math.round(kpis?.total_steel_kg?.value || 0).toLocaleString()}
          icon={FiPackage}
          color="blue"
        />
        <KPICard
          label={kpis?.total_cement_bags?.label || 'Total Cement (bags)'}
          value={Math.round(kpis?.total_cement_bags?.value || 0).toLocaleString()}
          icon={FiBox}
          color="green"
        />
        <KPICard
          label={kpis?.conversion_rate?.label || 'Conversion Rate'}
          value={`${kpis?.conversion_rate?.value || 0}%`}
          icon={FiPercent}
          color="purple"
        />
        <KPICard
          label={kpis?.pending_approvals?.label || 'Pending Approvals'}
          value={kpis?.pending_approvals?.value || 0}
          icon={FiCheckCircle}
          color="yellow"
          onClick={() => navigate('/admin/sales-entries', { state: { statusFilter: 'pending' } })}
        />
        <KPICard
          label={kpis?.total_won?.label || 'Total Won'}
          value={kpis?.total_won?.value || 0}
          icon={FiAward}
          color="green"
          onClick={() => goWithFilter({ leadStatus: 'won' })}
        />
      </div>

      {/* Counts Summary */}
      <div className="card mb-4">
        <h2 className="text-base font-semibold text-gray-900 mb-3">Lead Summary</h2>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          <button
            onClick={() => goWithFilter({ leadStatus: 'won' })}
            className="text-center p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
          >
            <p className="text-2xl font-bold text-green-600">{kpis?.total_won?.value || 0}</p>
            <p className="text-sm text-gray-600">Total Won</p>
          </button>
          <button
            onClick={() => goWithFilter({ leadType: 'hot' })}
            className="text-center p-3 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
          >
            <p className="text-2xl font-bold text-red-600">{kpis?.hot_leads?.value || 0}</p>
            <p className="text-sm text-gray-600">Hot</p>
          </button>
          <button
            onClick={() => goWithFilter({ leadType: 'warm' })}
            className="text-center p-3 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors"
          >
            <p className="text-2xl font-bold text-yellow-600">{kpis?.warm_leads?.value || 0}</p>
            <p className="text-sm text-gray-600">Warm</p>
          </button>
          <button
            onClick={() => goWithFilter({ leadType: 'cold' })}
            className="text-center p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <p className="text-2xl font-bold text-blue-600">{kpis?.cold_leads?.value || 0}</p>
            <p className="text-sm text-gray-600">Cold</p>
          </button>
          <button
            onClick={() => navigate('/admin/followups')}
            className="text-center p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
          >
            <p className="text-2xl font-bold text-purple-600">{kpis?.pending_followups?.value || 0}</p>
            <p className="text-sm text-gray-600">Pending Follow-ups</p>
          </button>
          <button
            onClick={() => navigate('/admin/sales-entries', { state: { statusFilter: 'pending' } })}
            className="text-center p-3 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
          >
            <p className="text-2xl font-bold text-orange-600">{kpis?.pending_approvals?.value || 0}</p>
            <p className="text-sm text-gray-600">Pending Approvals</p>
          </button>
        </div>
      </div>

      <InsightsPanel kpis={kpis} salesTrend={salesTrend} contribution={contribution} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Sales Trend - dual axis since steel (kg) and cement (bags) are on very different scales */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Sales Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={salesTrend?.data || []} onClick={handleTrendClick}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis yAxisId="left" stroke="#3B82F6" />
              <YAxis yAxisId="right" orientation="right" stroke="#10B981" />
              <Tooltip />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="steel_kg"
                stroke="#3B82F6"
                name="Steel (kg)"
                cursor="pointer"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="cement_bags"
                stroke="#10B981"
                name="Cement (bags)"
                cursor="pointer"
              />
            </LineChart>
          </ResponsiveContainer>
          <p className="text-xs text-gray-400 mt-2">Click a point to view that month's leads</p>
        </div>

        {/* Contribution Pie Chart - only meaningful with more than one salesperson */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Sales Contribution</h2>
          {showContributionChart ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={contributionData}
                  dataKey="leads_percentage"
                  nameKey="salesperson_name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, value }) => `${name}: ${value}%`}
                >
                  {contributionData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center text-center text-gray-500 text-sm" style={{ height: 300 }}>
              Add more salespeople to compare contributions.
            </div>
          )}
        </div>
      </div>

      <AreaSummary filters={filters} />

      {/* Performance Chart + Table */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Salesperson Performance</h2>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={performance || []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="salesperson_name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="total_leads" name="Total Leads" fill="#3B82F6" cursor="pointer" onClick={handlePerformanceBarClick} />
            <Bar dataKey="won_leads" name="Won" fill="#10B981" cursor="pointer" onClick={handlePerformanceBarClick} />
            <Bar dataKey="lost_leads" name="Lost" fill="#EF4444" cursor="pointer" onClick={handlePerformanceBarClick} />
          </BarChart>
        </ResponsiveContainer>
        <p className="text-xs text-gray-400 mt-2 mb-4">Click a bar to view that salesperson's leads</p>

        <PerformanceTable performance={performance || []} />
      </div>
    </div>
  )
}
