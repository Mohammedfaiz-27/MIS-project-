import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { masterDataService } from '../../services/masterData'
import Modal from '../../components/common/Modal'
import { FiPlus, FiTrash2, FiDatabase } from 'react-icons/fi'
import toast from 'react-hot-toast'

const MASTER_DATA_TYPES = [
  { value: 'steel_brand', label: 'Steel Brands' },
  { value: 'cement_brand', label: 'Cement Brands' },
  { value: 'other_brand', label: 'Other Brands' },
  { value: 'area', label: 'Areas' }
]

export default function MasterData() {
  const queryClient = useQueryClient()
  const [activeType, setActiveType] = useState('steel_brand')
  const [modalOpen, setModalOpen] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  const { data: items, isLoading } = useQuery({
    queryKey: ['masterData', activeType],
    queryFn: () => masterDataService.getAll(activeType)
  })

  const createMutation = useMutation({
    mutationFn: masterDataService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['masterData'] })
      setModalOpen(false)
      reset()
      toast.success('Item added!')
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to add item')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: masterDataService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['masterData'] })
      toast.success('Item deleted!')
    },
    onError: () => {
      toast.error('Failed to delete item')
    }
  })

  const seedMutation = useMutation({
    mutationFn: masterDataService.seed,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['masterData'] })
      toast.success(data.message)
    },
    onError: () => {
      toast.error('Failed to seed data')
    }
  })

  const onSubmit = (data) => {
    createMutation.mutate({
      type: activeType,
      value: data.value
    })
  }

  const openAddModal = () => {
    reset({ value: '' })
    setModalOpen(true)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Master Data</h1>
        <button
          onClick={() => seedMutation.mutate()}
          disabled={seedMutation.isPending}
          className="btn btn-secondary flex items-center gap-2"
        >
          <FiDatabase className="w-4 h-4" />
          {seedMutation.isPending ? 'Seeding...' : 'Seed Default Data'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {MASTER_DATA_TYPES.map((type) => (
          <button
            key={type.value}
            onClick={() => setActiveType(type.value)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeType === type.value
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {type.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            {MASTER_DATA_TYPES.find(t => t.value === activeType)?.label}
          </h2>
          <button
            onClick={openAddModal}
            className="btn btn-primary flex items-center gap-2"
          >
            <FiPlus className="w-4 h-4" />
            Add Item
          </button>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : items?.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No items found. Add some or seed default data.
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {items?.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <span className="font-medium">{item.value}</span>
                <button
                  onClick={() => deleteMutation.mutate(item.id)}
                  disabled={deleteMutation.isPending}
                  className="p-2 text-red-600 hover:bg-red-50 rounded"
                  title="Delete"
                >
                  <FiTrash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`Add ${MASTER_DATA_TYPES.find(t => t.value === activeType)?.label.slice(0, -1)}`}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">Value *</label>
            <input
              {...register('value', { required: 'Required' })}
              className="input"
              placeholder="Enter value"
            />
            {errors.value && (
              <p className="text-red-500 text-sm mt-1">{errors.value.message}</p>
            )}
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
              {createMutation.isPending ? 'Adding...' : 'Add'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
