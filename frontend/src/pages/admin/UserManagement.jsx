import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { adminService } from '../../services/admin'
import Modal from '../../components/common/Modal'
import { USER_ROLES } from '../../utils/constants'
import { formatDate } from '../../utils/helpers'
import { FiPlus, FiUserCheck, FiUserX, FiKey, FiEye, FiEyeOff } from 'react-icons/fi'
import toast from 'react-hot-toast'

export default function UserManagement() {
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [resetPasswordUser, setResetPasswordUser] = useState(null)
  const [newPassword, setNewPassword] = useState('')
  const [visiblePasswords, setVisiblePasswords] = useState({})

  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: adminService.getUsers
  })

  const createMutation = useMutation({
    mutationFn: adminService.createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setModalOpen(false)
      reset()
      toast.success('User created successfully!')
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to create user')
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => adminService.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setEditingUser(null)
      toast.success('User updated!')
    },
    onError: () => {
      toast.error('Failed to update user')
    }
  })

  const onSubmit = (data) => {
    createMutation.mutate(data)
  }

  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, password }) => adminService.resetPassword(id, password),
    onSuccess: () => {
      setResetPasswordUser(null)
      setNewPassword('')
      toast.success('Password reset successfully!')
    },
    onError: () => {
      toast.error('Failed to reset password')
    }
  })

  const toggleUserStatus = (user) => {
    updateMutation.mutate({
      id: user.id,
      data: { is_active: !user.is_active }
    })
  }

  const handleResetPassword = () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    resetPasswordMutation.mutate({ id: resetPasswordUser.id, password: newPassword })
  }

  const togglePasswordVisibility = (userId) => {
    setVisiblePasswords(prev => ({ ...prev, [userId]: !prev[userId] }))
  }

  const openCreateModal = () => {
    setEditingUser(null)
    reset({
      email: '@arckitraders.com',
      password: '',
      name: '',
      role: 'salesperson',
      phone: ''
    })
    setModalOpen(true)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <button
          onClick={openCreateModal}
          className="btn btn-primary flex items-center gap-2"
        >
          <FiPlus className="w-4 h-4" />
          Add User
        </button>
      </div>

      {isLoading ? (
        <div className="card p-8 text-center text-gray-500">Loading...</div>
      ) : (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Phone</th>
                <th>Password</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users?.map((user) => (
                <tr key={user.id}>
                  <td className="font-medium">{user.name}</td>
                  <td>{user.email}</td>
                  <td className="capitalize">{user.role}</td>
                  <td>{user.phone || '-'}</td>
                  <td>
                    {user.password_plain ? (
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-sm">
                          {visiblePasswords[user.id] ? user.password_plain : '••••••••'}
                        </span>
                        <button
                          onClick={() => togglePasswordVisibility(user.id)}
                          className="p-1 text-gray-400 hover:text-gray-700"
                          title={visiblePasswords[user.id] ? 'Hide' : 'Show'}
                        >
                          {visiblePasswords[user.id] ? (
                            <FiEyeOff className="w-4 h-4" />
                          ) : (
                            <FiEye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </td>
                  <td>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>{formatDate(user.created_at)}</td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => toggleUserStatus(user)}
                        className={`p-2 rounded ${
                          user.is_active
                            ? 'text-red-600 hover:bg-red-50'
                            : 'text-green-600 hover:bg-green-50'
                        }`}
                        title={user.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {user.is_active ? (
                          <FiUserX className="w-5 h-5" />
                        ) : (
                          <FiUserCheck className="w-5 h-5" />
                        )}
                      </button>
                      <button
                        onClick={() => { setResetPasswordUser(user); setNewPassword('') }}
                        className="p-2 rounded text-blue-600 hover:bg-blue-50"
                        title="Reset Password"
                      >
                        <FiKey className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Reset Password Modal */}
      <Modal
        isOpen={!!resetPasswordUser}
        onClose={() => { setResetPasswordUser(null); setNewPassword('') }}
        title={`Reset Password - ${resetPasswordUser?.name}`}
      >
        <div className="space-y-4">
          <div>
            <label className="label">New Password *</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="input"
              placeholder="Minimum 6 characters"
            />
          </div>
          <div className="flex gap-4 justify-end pt-2">
            <button
              type="button"
              onClick={() => { setResetPasswordUser(null); setNewPassword('') }}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleResetPassword}
              disabled={resetPasswordMutation.isPending}
              className="btn btn-primary"
            >
              {resetPasswordMutation.isPending ? 'Resetting...' : 'Reset Password'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Create User Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add New User"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">Name *</label>
            <input
              {...register('name', { required: 'Required' })}
              className="input"
              placeholder="Full name"
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="label">Email *</label>
            <input
              type="email"
              {...register('email', {
                required: 'Required',
                validate: (v) => v.endsWith('@arckitraders.com') || 'Email must use @arckitraders.com domain'
              })}
              className="input"
              placeholder="name@arckitraders.com"
            />
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="label">Password *</label>
            <input
              type="password"
              {...register('password', {
                required: 'Required',
                minLength: { value: 6, message: 'At least 6 characters' }
              })}
              className="input"
              placeholder="Minimum 6 characters"
            />
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
            )}
          </div>

          <div>
            <label className="label">Role *</label>
            <select {...register('role', { required: 'Required' })} className="input">
              {USER_ROLES.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Phone</label>
            <input
              {...register('phone')}
              className="input"
              placeholder="Phone number"
            />
          </div>

          <div className="flex gap-4 justify-end pt-4">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="btn btn-primary"
            >
              {createMutation.isPending ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
