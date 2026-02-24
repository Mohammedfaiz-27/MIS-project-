import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import Layout from './components/layout/Layout'
import Login from './pages/auth/Login'
import LeadsList from './pages/sales/LeadsList'
import LeadForm from './pages/sales/LeadForm'
import LeadDetails from './pages/sales/LeadDetails'
import FollowupForm from './pages/sales/FollowupForm'
import SalesEntryForm from './pages/sales/SalesEntryForm'
import MyFollowups from './pages/sales/MyFollowups'
import MySales from './pages/sales/MySales'
import AdminDashboard from './pages/admin/AdminDashboard'
import AllLeads from './pages/admin/AllLeads'
import FollowupControl from './pages/admin/FollowupControl'
import SalesApprovals from './pages/admin/SalesApprovals'
import Performance from './pages/admin/Performance'
import AreaAnalysis from './pages/admin/AreaAnalysis'
import UserManagement from './pages/admin/UserManagement'
import MasterData from './pages/admin/MasterData'
import Reports from './pages/admin/Reports'

function ProtectedRoute({ children, adminOnly = false }) {
  const { isAuthenticated, user } = useAuthStore()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (adminOnly && user?.role !== 'admin') {
    return <Navigate to="/leads" replace />
  }

  return children
}

function App() {
  const { isAuthenticated, user } = useAuthStore()

  return (
    <Routes>
      <Route path="/login" element={
        isAuthenticated ?
          <Navigate to={user?.role === 'admin' ? '/admin/dashboard' : '/leads'} replace /> :
          <Login />
      } />

      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        {/* Salesperson Routes */}
        <Route index element={<Navigate to={user?.role === 'admin' ? '/admin/dashboard' : '/leads'} replace />} />
        <Route path="leads" element={<LeadsList />} />
        <Route path="leads/new" element={<LeadForm />} />
        <Route path="leads/:id" element={<LeadDetails />} />
        <Route path="leads/:id/edit" element={<LeadForm />} />
        <Route path="leads/:id/followup" element={<FollowupForm />} />
        <Route path="leads/:id/sales-entry" element={<SalesEntryForm />} />
        <Route path="followups" element={<MyFollowups />} />
        <Route path="my-sales" element={<MySales />} />

        {/* Admin Routes */}
        <Route path="admin/dashboard" element={
          <ProtectedRoute adminOnly>
            <AdminDashboard />
          </ProtectedRoute>
        } />
        <Route path="admin/leads" element={
          <ProtectedRoute adminOnly>
            <AllLeads />
          </ProtectedRoute>
        } />
        <Route path="admin/followups" element={
          <ProtectedRoute adminOnly>
            <FollowupControl />
          </ProtectedRoute>
        } />
        <Route path="admin/sales-entries" element={
          <ProtectedRoute adminOnly>
            <SalesApprovals />
          </ProtectedRoute>
        } />
        <Route path="admin/performance" element={
          <ProtectedRoute adminOnly>
            <Performance />
          </ProtectedRoute>
        } />
        <Route path="admin/area-analysis" element={
          <ProtectedRoute adminOnly>
            <AreaAnalysis />
          </ProtectedRoute>
        } />
        <Route path="admin/users" element={
          <ProtectedRoute adminOnly>
            <UserManagement />
          </ProtectedRoute>
        } />
        <Route path="admin/master-data" element={
          <ProtectedRoute adminOnly>
            <MasterData />
          </ProtectedRoute>
        } />
        <Route path="admin/reports" element={
          <ProtectedRoute adminOnly>
            <Reports />
          </ProtectedRoute>
        } />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
