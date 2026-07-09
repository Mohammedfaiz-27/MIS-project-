import { format, parse } from 'date-fns'
import { FiTrendingUp, FiPercent, FiAlertCircle, FiUser, FiPieChart } from 'react-icons/fi'

function formatMonthLabel(yyyymm) {
  try {
    return format(parse(yyyymm, 'yyyy-MM', new Date()), 'MMMM yyyy')
  } catch {
    return yyyymm
  }
}

export default function InsightsPanel({ kpis, salesTrend, contribution }) {
  const insights = []

  // Highest-performing month (by combined steel + cement volume)
  const trend = salesTrend?.data || []
  if (trend.length) {
    const best = trend.reduce((top, item) => {
      const score = (item.steel_kg || 0) + (item.cement_bags || 0)
      const topScore = top ? (top.steel_kg || 0) + (top.cement_bags || 0) : -1
      return score > topScore ? item : top
    }, null)
    if (best) {
      insights.push({
        icon: FiTrendingUp,
        text: `${formatMonthLabel(best.date)} was the strongest month, with ${Math.round(best.steel_kg).toLocaleString()} kg steel and ${Math.round(best.cement_bags).toLocaleString()} bags of cement sold.`
      })
    }
  }

  // Conversion rate
  if (kpis?.conversion_rate) {
    insights.push({
      icon: FiPercent,
      text: `Overall conversion rate for the selected period is ${kpis.conversion_rate.value}%.`
    })
  }

  // Overdue follow-ups
  if (kpis?.overdue_followups) {
    const count = kpis.overdue_followups.value
    insights.push({
      icon: FiAlertCircle,
      text: count > 0
        ? `${count} follow-up${count === 1 ? '' : 's'} ${count === 1 ? 'is' : 'are'} overdue and need attention.`
        : 'No overdue follow-ups right now.'
    })
  }

  // Top salesperson contribution
  const contributionData = contribution?.data || []
  if (contributionData.length) {
    const top = contributionData.reduce((best, c) => (c.leads_percentage > (best?.leads_percentage ?? -1) ? c : best), null)
    if (top) {
      insights.push({
        icon: FiUser,
        text: `${top.salesperson_name} contributes the most leads, at ${top.leads_percentage}% of the total.`
      })
    }
  }

  // Hot/warm/cold distribution
  if (kpis?.hot_leads && kpis?.warm_leads && kpis?.cold_leads) {
    const total = kpis.hot_leads.value + kpis.warm_leads.value + kpis.cold_leads.value
    if (total > 0) {
      const pct = (v) => Math.round((v / total) * 100)
      insights.push({
        icon: FiPieChart,
        text: `Lead mix: ${pct(kpis.hot_leads.value)}% hot, ${pct(kpis.warm_leads.value)}% warm, ${pct(kpis.cold_leads.value)}% cold.`
      })
    }
  }

  if (!insights.length) {
    return null
  }

  return (
    <div className="card mb-6">
      <h2 className="text-lg font-semibold mb-4">Insights</h2>
      <ul className="space-y-3">
        {insights.map((insight, idx) => (
          <li key={idx} className="flex items-start gap-3 text-sm text-gray-700">
            <insight.icon className="w-4 h-4 mt-0.5 text-primary-500 flex-shrink-0" />
            <span>{insight.text}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
