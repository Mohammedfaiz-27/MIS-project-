import { useState } from 'react'
import { useFilterStore } from '../../store/filterStore'
import GlobalFilters from '../../components/common/GlobalFilters'
import { adminService } from '../../services/admin'
import { buildQueryParams, downloadBlob } from '../../utils/helpers'
import { FiDownload, FiFileText, FiDatabase } from 'react-icons/fi'
import toast from 'react-hot-toast'

export default function Reports() {
  const { filters } = useFilterStore()
  const [exporting, setExporting] = useState(null)

  const handleExport = async (type, format) => {
    setExporting(`${type}-${format}`)
    try {
      const params = buildQueryParams(filters)
      params.format = format

      let blob
      let filename

      if (type === 'leads') {
        blob = await adminService.exportLeads(params)
        filename = `leads_export.${format === 'excel' ? 'xlsx' : 'csv'}`
      } else {
        blob = await adminService.exportSalesEntries(params)
        filename = `sales_entries_export.${format === 'excel' ? 'xlsx' : 'csv'}`
      }

      downloadBlob(blob, filename)
      toast.success('Export successful!')
    } catch {
      toast.error('Export failed')
    } finally {
      setExporting(null)
    }
  }

  const reports = [
    {
      id: 'leads',
      title: 'Leads Report',
      description: 'Export all leads with customer details, site information, and status',
      icon: FiFileText,
      color: 'bg-blue-100 text-blue-600'
    },
    {
      id: 'sales',
      title: 'Sales Entries Report',
      description: 'Export all sales entries with quantities and approval status',
      icon: FiDatabase,
      color: 'bg-green-100 text-green-600'
    }
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Reports & Exports</h1>

      <GlobalFilters showLeadFilters={false} />

      <div className="grid grid-cols-2 gap-6">
        {reports.map((report) => {
          const Icon = report.icon
          return (
            <div key={report.id} className="card">
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${report.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">{report.title}</h3>
                  <p className="text-gray-500 text-sm mt-1">{report.description}</p>

                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => handleExport(report.id === 'leads' ? 'leads' : 'salesEntries', 'excel')}
                      disabled={exporting !== null}
                      className="btn btn-primary flex items-center gap-2"
                    >
                      <FiDownload className="w-4 h-4" />
                      {exporting === `${report.id === 'leads' ? 'leads' : 'salesEntries'}-excel`
                        ? 'Exporting...'
                        : 'Export Excel'}
                    </button>
                    <button
                      onClick={() => handleExport(report.id === 'leads' ? 'leads' : 'salesEntries', 'csv')}
                      disabled={exporting !== null}
                      className="btn btn-secondary flex items-center gap-2"
                    >
                      <FiDownload className="w-4 h-4" />
                      {exporting === `${report.id === 'leads' ? 'leads' : 'salesEntries'}-csv`
                        ? 'Exporting...'
                        : 'Export CSV'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="card mt-6">
        <h3 className="text-lg font-semibold mb-4">Export Options</h3>
        <div className="text-gray-600 space-y-2">
          <p>
            <strong>Date Range:</strong> Use the filters above to limit the export to a specific date range.
          </p>
          <p>
            <strong>Salesperson:</strong> Filter by salesperson to export data for a specific team member.
          </p>
          <p>
            <strong>Area:</strong> Filter by area to get region-specific reports.
          </p>
          <p>
            <strong>Formats:</strong>
          </p>
          <ul className="list-disc list-inside ml-4">
            <li><strong>Excel (.xlsx):</strong> Best for detailed analysis and pivot tables</li>
            <li><strong>CSV:</strong> Best for importing into other systems</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
