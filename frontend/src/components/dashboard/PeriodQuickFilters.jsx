import {
  format, subDays, startOfMonth, endOfMonth, subMonths,
  startOfQuarter, endOfQuarter, startOfYear, endOfYear
} from 'date-fns'
import { useFilterStore } from '../../store/filterStore'

const fmt = (d) => format(d, 'yyyy-MM-dd')

export default function PeriodQuickFilters() {
  const { filters, setFilters } = useFilterStore()

  const today = new Date()

  const presets = [
    { label: 'Last 7 days', range: () => [subDays(today, 6), today] },
    { label: 'This month', range: () => [startOfMonth(today), endOfMonth(today)] },
    { label: 'Last month', range: () => {
      const lastMonth = subMonths(today, 1)
      return [startOfMonth(lastMonth), endOfMonth(lastMonth)]
    } },
    { label: 'This quarter', range: () => [startOfQuarter(today), endOfQuarter(today)] },
    { label: 'This year', range: () => [startOfYear(today), endOfYear(today)] }
  ].map(p => {
    const [start, end] = p.range()
    return { label: p.label, startDate: fmt(start), endDate: fmt(end) }
  })

  const isActive = (preset) => filters.startDate === preset.startDate && filters.endDate === preset.endDate
  const isCustom = !presets.some(isActive) && (filters.startDate || filters.endDate)

  return (
    <div className="flex flex-wrap gap-2 mb-3">
      {presets.map((preset) => (
        <button
          key={preset.label}
          onClick={() => setFilters({ startDate: preset.startDate, endDate: preset.endDate })}
          className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
            isActive(preset)
              ? 'bg-primary-600 text-white border-primary-600'
              : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300'
          }`}
        >
          {preset.label}
        </button>
      ))}
      <span
        className={`text-xs font-medium px-3 py-1.5 rounded-full border ${
          isCustom
            ? 'bg-primary-600 text-white border-primary-600'
            : 'bg-white text-gray-400 border-gray-200'
        }`}
        title="Use the Start Date / End Date fields below for a custom range"
      >
        Custom range
      </span>
    </div>
  )
}
