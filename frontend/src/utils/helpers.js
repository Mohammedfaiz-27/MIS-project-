import { format, parseISO, isValid } from 'date-fns'

export const formatDate = (date, formatStr = 'MMM dd, yyyy') => {
  if (!date) return '-'
  let d = date
  if (typeof d === 'string' && d.includes('T') && !d.endsWith('Z') && !d.includes('+') && !d.includes('-', 10)) {
    d = d + 'Z'
  }
  const parsed = typeof d === 'string' ? parseISO(d) : d
  return isValid(parsed) ? format(parsed, formatStr) : '-'
}

export const formatDateTime = (date) => {
  return formatDate(date, 'MMM dd, yyyy HH:mm')
}

export const formatNumber = (num, decimals = 0) => {
  if (num === null || num === undefined) return '-'
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(num)
}

export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return '-'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR'
  }).format(amount)
}

export const getStatusColor = (status, statusList) => {
  const item = statusList.find(s => s.value === status)
  return item?.color || 'bg-gray-100 text-gray-800'
}

export const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

export const buildQueryParams = (filters) => {
  const params = {}
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      if (key === 'startDate' || key === 'endDate') {
        params[key.replace(/([A-Z])/g, '_$1').toLowerCase()] = value
      } else {
        params[key.replace(/([A-Z])/g, '_$1').toLowerCase()] = value
      }
    }
  })
  return params
}
