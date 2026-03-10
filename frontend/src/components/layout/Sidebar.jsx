import { NavLink } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import {
  FiHome, FiUsers, FiCalendar, FiDollarSign,
  FiBarChart2, FiMap, FiSettings, FiDatabase, FiFileText,
  FiUserPlus, FiCheckSquare, FiTrendingUp, FiX
} from 'react-icons/fi'

const salesLinks = [
  { to: '/leads', icon: FiUsers, label: 'My Leads' },
  { to: '/followups', icon: FiCalendar, label: 'Follow-ups' },
  { to: '/my-sales', icon: FiTrendingUp, label: 'My Sales' },
]

const adminLinks = [
  { to: '/admin/dashboard', icon: FiHome, label: 'Dashboard' },
  { to: '/admin/leads', icon: FiUsers, label: 'All Leads' },
  { to: '/admin/followups', icon: FiCalendar, label: 'Follow-up Control' },
  { to: '/admin/sales-entries', icon: FiCheckSquare, label: 'Sales Approvals' },
  { to: '/admin/performance', icon: FiBarChart2, label: 'Performance' },
  { to: '/admin/area-analysis', icon: FiMap, label: 'Area Analysis' },
  { to: '/admin/users', icon: FiUserPlus, label: 'User Management' },
  { to: '/admin/master-data', icon: FiDatabase, label: 'Master Data' },
  { to: '/admin/reports', icon: FiFileText, label: 'Reports' },
]

function NavItem({ to, icon: Icon, label, onClose }) {
  return (
    <NavLink
      to={to}
      onClick={onClose}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
          isActive
            ? 'bg-primary-600 text-white'
            : 'text-gray-600 hover:bg-gray-100'
        }`
      }
    >
      <Icon className="w-5 h-5 shrink-0" />
      <span className="font-medium">{label}</span>
    </NavLink>
  )
}

export default function Sidebar({ onClose }) {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin'
  const links = isAdmin ? adminLinks : salesLinks

  return (
    <aside className="w-64 h-full bg-white border-r border-gray-200 flex flex-col">
      <div className="p-6 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-primary-600">Arcki Traders</h1>
          <p className="text-sm text-gray-500 mt-1">
            {isAdmin ? 'Admin Panel' : 'Sales Portal'}
          </p>
        </div>
        <button
          onClick={onClose}
          className="md:hidden p-2 text-gray-400 hover:text-gray-700 rounded-lg"
          aria-label="Close menu"
        >
          <FiX className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {links.map((link) => (
          <NavItem key={link.to} {...link} onClose={onClose} />
        ))}
      </nav>

      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
            <span className="text-primary-600 font-semibold">
              {user?.name?.charAt(0)?.toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <p className="font-medium text-gray-900 truncate">{user?.name}</p>
            <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
