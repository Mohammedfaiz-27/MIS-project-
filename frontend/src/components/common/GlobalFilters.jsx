import { useQuery } from '@tanstack/react-query'
import { useFilterStore } from '../../store/filterStore'
import { masterDataService } from '../../services/masterData'
import { adminService } from '../../services/admin'
import { useAuthStore } from '../../store/authStore'
import { LEAD_TYPES, LEAD_STATUSES } from '../../utils/constants'

export default function GlobalFilters({ showLeadFilters = true }) {
  const { user } = useAuthStore()
  const { filters, setFilter, resetFilters } = useFilterStore()
  const isAdmin = user?.role === 'admin'

  const { data: areas } = useQuery({
    queryKey: ['masterData', 'area'],
    queryFn: () => masterDataService.getAll('area')
  })

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: adminService.getUsers,
    enabled: isAdmin
  })

  const salespersons = users?.filter(u => u.role === 'salesperson') || []

  return (
    <div className="card mb-6">
      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <label className="label">Start Date</label>
          <input
            type="date"
            className="input"
            value={filters.startDate || ''}
            onChange={(e) => setFilter('startDate', e.target.value || null)}
          />
        </div>

        <div>
          <label className="label">End Date</label>
          <input
            type="date"
            className="input"
            value={filters.endDate || ''}
            onChange={(e) => setFilter('endDate', e.target.value || null)}
          />
        </div>

        {isAdmin && (
          <div>
            <label className="label">Salesperson</label>
            <select
              className="input"
              value={filters.salesPersonId || ''}
              onChange={(e) => setFilter('salesPersonId', e.target.value || null)}
            >
              <option value="">All Salespersons</option>
              {salespersons.map(sp => (
                <option key={sp.id} value={sp.id}>{sp.name}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="label">Area</label>
          <select
            className="input"
            value={filters.area || ''}
            onChange={(e) => setFilter('area', e.target.value || null)}
          >
            <option value="">All Areas</option>
            {areas?.map(a => (
              <option key={a.id} value={a.value}>{a.value}</option>
            ))}
          </select>
        </div>

        {showLeadFilters && (
          <>
            <div>
              <label className="label">Lead Type</label>
              <select
                className="input"
                value={filters.leadType || ''}
                onChange={(e) => setFilter('leadType', e.target.value || null)}
              >
                <option value="">All Types</option>
                {LEAD_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Lead Status</label>
              <select
                className="input"
                value={filters.leadStatus || ''}
                onChange={(e) => setFilter('leadStatus', e.target.value || null)}
              >
                <option value="">All Statuses</option>
                {LEAD_STATUSES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </>
        )}

        <div>
          <label className="label">Search</label>
          <input
            type="text"
            className="input"
            placeholder="Name, phone, location..."
            value={filters.search || ''}
            onChange={(e) => setFilter('search', e.target.value)}
          />
        </div>

        <button
          onClick={resetFilters}
          className="btn btn-secondary"
        >
          Reset
        </button>
      </div>
    </div>
  )
}
