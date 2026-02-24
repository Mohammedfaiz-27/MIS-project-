import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { dashboardService } from '../../services/dashboard'
import { useFilterStore } from '../../store/filterStore'
import GlobalFilters from '../../components/common/GlobalFilters'
import KPICard from '../../components/common/KPICard'
import { buildQueryParams } from '../../utils/helpers'
import {
  FiUsers, FiTrendingUp, FiCalendar, FiAlertCircle,
  FiPackage, FiBox, FiPercent, FiCheckCircle, FiChevronDown, FiChevronUp, FiAward
} from 'react-icons/fi'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer
} from 'recharts'

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']

export default function AdminDashboard() {
  const [showFollowupBreakdown, setShowFollowupBreakdown] = useState(false)
  const { filters } = useFilterStore()
  const params = buildQueryParams(filters)

  const { data: kpis, isLoading: loadingKPIs } = useQuery({
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

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      <GlobalFilters showLeadFilters={false} />

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <KPICard
          label={kpis?.total_leads?.label || 'Total Leads'}
          value={kpis?.total_leads?.value || 0}
          icon={FiUsers}
          color="primary"
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
                <div className="flex items-center justify-between">
                  <span className="text-sm flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                    Hot Leads
                  </span>
                  <span className="text-sm font-semibold text-red-600">{kpis?.hot_leads?.value || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>
                    Warm Leads
                  </span>
                  <span className="text-sm font-semibold text-yellow-600">{kpis?.warm_leads?.value || 0}</span>
                </div>
                <div className="flex items-center justify-between">
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
        />
        <KPICard
          label={kpis?.total_won?.label || 'Total Won'}
          value={kpis?.total_won?.value || 0}
          icon={FiAward}
          color="green"
        />
      </div>

      {/* Counts Summary */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Lead Summary</h2>
        <div className="grid grid-cols-6 gap-4">
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <p className="text-2xl font-bold text-green-600">{kpis?.total_won?.value || 0}</p>
            <p className="text-sm text-gray-600">Total Won</p>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <p className="text-2xl font-bold text-red-600">{kpis?.hot_leads?.value || 0}</p>
            <p className="text-sm text-gray-600">Hot</p>
          </div>
          <div className="text-center p-3 bg-yellow-50 rounded-lg">
            <p className="text-2xl font-bold text-yellow-600">{kpis?.warm_leads?.value || 0}</p>
            <p className="text-sm text-gray-600">Warm</p>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <p className="text-2xl font-bold text-blue-600">{kpis?.cold_leads?.value || 0}</p>
            <p className="text-sm text-gray-600">Cold</p>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <p className="text-2xl font-bold text-purple-600">{kpis?.pending_followups?.value || 0}</p>
            <p className="text-sm text-gray-600">Pending Follow-ups</p>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <p className="text-2xl font-bold text-orange-600">{kpis?.pending_approvals?.value || 0}</p>
            <p className="text-sm text-gray-600">Pending Approvals</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Sales Trend */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Sales Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={salesTrend?.data || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="steel_kg"
                stroke="#3B82F6"
                name="Steel (kg)"
              />
              <Line
                type="monotone"
                dataKey="cement_bags"
                stroke="#10B981"
                name="Cement (bags)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Contribution Pie Chart */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Sales Contribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={contribution?.data || []}
                dataKey="leads_percentage"
                nameKey="salesperson_name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ name, value }) => `${name}: ${value}%`}
              >
                {(contribution?.data || []).map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Performance Chart */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Salesperson Performance</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={performance || []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="salesperson_name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="total_leads" name="Total Leads" fill="#3B82F6" />
            <Bar dataKey="won_leads" name="Won" fill="#10B981" />
            <Bar dataKey="lost_leads" name="Lost" fill="#EF4444" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
