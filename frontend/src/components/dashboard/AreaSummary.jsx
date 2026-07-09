import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { dashboardService } from '../../services/dashboard'
import { useFilterStore } from '../../store/filterStore'
import { buildQueryParams, formatNumber } from '../../utils/helpers'
import { FiMapPin } from 'react-icons/fi'

export default function AreaSummary({ filters }) {
  const navigate = useNavigate()
  const { setFilters } = useFilterStore()
  const params = buildQueryParams(filters)

  const { data: areas, isLoading } = useQuery({
    queryKey: ['areaAnalysis', filters],
    queryFn: () => dashboardService.getAreaAnalysis(params)
  })

  const ranked = [...(areas || [])]
    .sort((a, b) => b.won_leads - a.won_leads)
    .slice(0, 3)
    .map(a => ({
      ...a,
      conversion_rate: a.total_leads > 0 ? Math.round((a.won_leads / a.total_leads) * 100) : 0
    }))

  const goToArea = (area) => {
    setFilters({ area })
    navigate('/admin/leads')
  }

  return (
    <div className="card mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Top areas</h2>
        <button
          onClick={() => navigate('/admin/area-analysis')}
          className="text-xs font-medium text-primary-600 hover:text-primary-700"
        >
          View full area analysis
        </button>
      </div>

      {isLoading && <p className="text-sm text-gray-500">Loading...</p>}

      {!isLoading && !ranked.length && (
        <p className="text-sm text-gray-500">No area data for the selected period.</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {ranked.map((area, idx) => (
          <button
            key={area.area}
            onClick={() => goToArea(area.area)}
            className="text-left p-3 rounded-lg border border-gray-100 hover:border-primary-200 hover:shadow-sm transition-shadow"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-600 text-xs font-bold flex items-center justify-center">
                {idx + 1}
              </span>
              <span className="font-medium text-gray-900 flex items-center gap-1">
                <FiMapPin className="w-3.5 h-3.5 text-gray-400" />
                {area.area}
              </span>
            </div>
            <div className="text-xs text-gray-500 space-y-0.5">
              <p>{formatNumber(area.total_leads)} leads &middot; {formatNumber(area.won_leads)} won</p>
              <p>Conversion rate: <span className="font-medium text-gray-700">{area.conversion_rate}%</span></p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
