import { useQuery } from '@tanstack/react-query'
import { dashboardService } from '../../services/dashboard'
import { useFilterStore } from '../../store/filterStore'
import GlobalFilters from '../../components/common/GlobalFilters'
import { buildQueryParams, formatNumber } from '../../utils/helpers'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6']

export default function AreaAnalysis() {
  const { filters } = useFilterStore()
  const params = buildQueryParams(filters)

  const { data: areaData, isLoading } = useQuery({
    queryKey: ['areaAnalysis', filters],
    queryFn: () => dashboardService.getAreaAnalysis(params)
  })

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Area Analysis</h1>

      <GlobalFilters showLeadFilters={false} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Leads by Area */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Leads by Area</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={areaData || []}
                dataKey="total_leads"
                nameKey="area"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ name, value }) => `${name}: ${value}`}
              >
                {(areaData || []).map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Sales by Area */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Sales by Area</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={areaData || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="area" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="total_steel_kg" name="Steel (kg)" fill="#3B82F6" />
              <Bar dataKey="total_cement_bags" name="Cement (bags)" fill="#10B981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Area Details</h2>
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Area</th>
                  <th>Total Leads</th>
                  <th>Won</th>
                  <th>Lost</th>
                  <th>Hot Leads</th>
                  <th>Steel (kg)</th>
                  <th>Cement (bags)</th>
                  <th>Win Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {areaData?.map((area) => (
                  <tr key={area.area}>
                    <td className="font-medium">{area.area}</td>
                    <td>{area.total_leads}</td>
                    <td className="text-green-600">{area.won_leads}</td>
                    <td className="text-red-600">{area.lost_leads}</td>
                    <td>{area.hot_leads}</td>
                    <td>{formatNumber(area.total_steel_kg)}</td>
                    <td>{formatNumber(area.total_cement_bags)}</td>
                    <td className="font-semibold">
                      {area.total_leads > 0
                        ? ((area.won_leads / area.total_leads) * 100).toFixed(1)
                        : 0}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
