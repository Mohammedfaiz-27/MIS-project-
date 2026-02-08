import { useQuery } from '@tanstack/react-query'
import { dashboardService } from '../../services/dashboard'
import { useFilterStore } from '../../store/filterStore'
import GlobalFilters from '../../components/common/GlobalFilters'
import KPICard from '../../components/common/KPICard'
import { buildQueryParams } from '../../utils/helpers'
import {
  FiUsers, FiTrendingUp, FiCalendar, FiAlertCircle,
  FiPackage, FiBox, FiPercent, FiCheckCircle
} from 'react-icons/fi'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer
} from 'recharts'

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']

export default function AdminDashboard() {
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
        <KPICard
          label={kpis?.hot_leads?.label || 'Hot Leads'}
          value={kpis?.hot_leads?.value || 0}
          icon={FiTrendingUp}
          color="red"
        />
        <KPICard
          label={kpis?.pending_followups?.label || 'Pending Follow-ups'}
          value={kpis?.pending_followups?.value || 0}
          icon={FiCalendar}
          color="yellow"
        />
        <KPICard
          label={kpis?.overdue_followups?.label || 'Overdue Follow-ups'}
          value={kpis?.overdue_followups?.value || 0}
          icon={FiAlertCircle}
          color="red"
        />
        <KPICard
          label={kpis?.total_steel_kg?.label || 'Total Steel (kg)'}
          value={kpis?.total_steel_kg?.value?.toLocaleString() || 0}
          icon={FiPackage}
          color="blue"
        />
        <KPICard
          label={kpis?.total_cement_bags?.label || 'Total Cement (bags)'}
          value={kpis?.total_cement_bags?.value?.toLocaleString() || 0}
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
