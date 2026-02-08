import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { leadsService } from '../../services/leads'
import { salesEntriesService } from '../../services/salesEntries'
import toast from 'react-hot-toast'
import { FiArrowLeft } from 'react-icons/fi'

export default function SalesEntryForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { register, handleSubmit, formState: { errors } } = useForm()

  const { data: lead } = useQuery({
    queryKey: ['lead', id],
    queryFn: () => leadsService.getById(id)
  })

  const mutation = useMutation({
    mutationFn: (data) => salesEntriesService.create(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salesEntries', id] })
      toast.success('Sales entry added successfully!')
      navigate(`/leads/${id}`)
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to add sales entry')
    }
  })

  const onSubmit = (data) => {
    mutation.mutate({
      steel_quantity_kg: parseFloat(data.steel_quantity_kg) || 0,
      cement_quantity_bags: parseFloat(data.cement_quantity_bags) || 0
    })
  }

  return (
    <div>
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <FiArrowLeft className="w-4 h-4" />
        Back
      </button>

      <div className="card max-w-xl">
        <h1 className="text-xl font-bold text-gray-900 mb-2">Add Sales Entry</h1>
        {lead && (
          <p className="text-gray-500 mb-6">
            {lead.customer_name} - {lead.site_location_name}
          </p>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label className="label">Steel Quantity (kg) *</label>
            <input
              type="number"
              step="0.01"
              {...register('steel_quantity_kg', {
                required: 'Required',
                min: { value: 0, message: 'Must be 0 or greater' }
              })}
              className="input"
              placeholder="e.g., 1500"
            />
            {errors.steel_quantity_kg && (
              <p className="text-red-500 text-sm mt-1">{errors.steel_quantity_kg.message}</p>
            )}
          </div>

          <div>
            <label className="label">Cement Quantity (bags) *</label>
            <input
              type="number"
              step="0.01"
              {...register('cement_quantity_bags', {
                required: 'Required',
                min: { value: 0, message: 'Must be 0 or greater' }
              })}
              className="input"
              placeholder="e.g., 50"
            />
            {errors.cement_quantity_bags && (
              <p className="text-red-500 text-sm mt-1">{errors.cement_quantity_bags.message}</p>
            )}
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              This entry will be submitted for admin approval. You will be notified once it's reviewed.
            </p>
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={mutation.isPending}
              className="btn btn-primary"
            >
              {mutation.isPending ? 'Submitting...' : 'Submit for Approval'}
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
