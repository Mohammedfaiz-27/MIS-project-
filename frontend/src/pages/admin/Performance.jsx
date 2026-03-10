import { useQuery } from '@tanstack/react-query'
import { dashboardService } from '../../services/dashboard'
import { useFilterStore } from '../../store/filterStore'
import GlobalFilters from '../../components/common/GlobalFilters'
import { buildQueryParams, formatNumber } from '../../utils/helpers'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'

export default function Performance() {
  const { filters } = useFilterStore()
  const params = buildQueryParams(filters)

  const { data: performance, isLoading } = useQuery({
    queryKey: ['performance', filters],
    queryFn: () => dashboardService.getSalespersonPerformance(params)
  })

  return (
    <div>
      <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-6">Salesperson Performance</h1>

      <GlobalFilters showLeadFilters={false} />

      {/* Chart */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold mb-4">Performance Overview</h2>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={performance || []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="salesperson_name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="total_leads" name="Total Leads" fill="#3B82F6" />
            <Bar dataKey="won_leads" name="Won" fill="#10B981" />
            <Bar dataKey="hot_leads" name="Hot" fill="#EF4444" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Table */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Detailed Metrics</h2>
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Salesperson</th>
                  <th>Total Leads</th>
                  <th>Won</th>
                  <th>Lost</th>
                  <th>Follow-up</th>
                  <th>Hot</th>
                  <th>Warm</th>
                  <th>Cold</th>
                  <th>Steel (kg)</th>
                  <th>Cement (bags)</th>
                  <th>Visits</th>
                  <th>Conversion %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {performance?.map((p) => (
                  <tr key={p.salesperson_id}>
                    <td className="font-medium">{p.salesperson_name}</td>
                    <td>{p.total_leads}</td>
                    <td className="text-green-600">{p.won_leads}</td>
                    <td className="text-red-600">{p.lost_leads}</td>
                    <td>{p.followup_leads}</td>
                    <td className="text-red-600">{p.hot_leads}</td>
                    <td className="text-yellow-600">{p.warm_leads}</td>
                    <td className="text-blue-600">{p.cold_leads}</td>
                    <td>{formatNumber(p.total_steel_kg)}</td>
                    <td>{formatNumber(p.total_cement_bags)}</td>
                    <td>{p.total_visits}</td>
                    <td className="font-semibold">{p.conversion_rate}%</td>
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
