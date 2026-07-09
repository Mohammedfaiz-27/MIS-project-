import { useNavigate } from 'react-router-dom'
import { useFilterStore } from '../../store/filterStore'
import { formatNumber } from '../../utils/helpers'
import { FiAward } from 'react-icons/fi'

export default function PerformanceTable({ performance = [] }) {
  const navigate = useNavigate()
  const { setFilters } = useFilterStore()

  const topPerformerId = performance.length
    ? performance.reduce((best, p) => (p.won_leads > (best?.won_leads ?? -1) ? p : best), null)?.salesperson_id
    : null

  const goToSalesperson = (salesPersonId) => {
    setFilters({ salesPersonId })
    navigate('/admin/leads')
  }

  if (!performance.length) {
    return <p className="text-sm text-gray-500">No performance data for the selected period.</p>
  }

  return (
    <div className="table-container">
      <table className="table">
        <thead>
          <tr>
            <th>Salesperson</th>
            <th>Total leads</th>
            <th>Won</th>
            <th>Lost</th>
            <th>Conversion rate</th>
          </tr>
        </thead>
        <tbody>
          {performance.map((p) => (
            <tr
              key={p.salesperson_id}
              onClick={() => goToSalesperson(p.salesperson_id)}
              className="cursor-pointer"
            >
              <td>
                <span className="flex items-center gap-2 font-medium text-gray-900">
                  {p.salesperson_name}
                  {p.salesperson_id === topPerformerId && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                      <FiAward className="w-3 h-3" /> Top performer
                    </span>
                  )}
                </span>
              </td>
              <td>{formatNumber(p.total_leads)}</td>
              <td className="text-green-600 font-medium">{formatNumber(p.won_leads)}</td>
              <td className="text-red-500">{formatNumber(p.lost_leads)}</td>
              <td>{p.conversion_rate}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
