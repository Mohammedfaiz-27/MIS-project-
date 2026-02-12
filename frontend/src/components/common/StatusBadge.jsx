export default function StatusBadge({ status, statusList }) {
  const item = statusList?.find(s => s.value === status)
  const colorClass = item?.color || 'bg-gray-100 text-gray-800'
  const label = item?.label || status

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
      {label}
    </span>
  )
}
