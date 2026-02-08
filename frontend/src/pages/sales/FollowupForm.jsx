import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { leadsService } from '../../services/leads'
import { followupsService } from '../../services/followups'
import { CONSTRUCTION_STAGES } from '../../utils/constants'
import toast from 'react-hot-toast'
import { FiArrowLeft } from 'react-icons/fi'

export default function FollowupForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { register, handleSubmit, formState: { errors } } = useForm()

  const { data: lead } = useQuery({
    queryKey: ['lead', id],
    queryFn: () => leadsService.getById(id)
  })

  const mutation = useMutation({
    mutationFn: (data) => followupsService.addFollowup(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead', id] })
      queryClient.invalidateQueries({ queryKey: ['visits', id] })
      queryClient.invalidateQueries({ queryKey: ['followups'] })
      toast.success('Follow-up added successfully!')
      navigate(`/leads/${id}`)
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to add follow-up')
    }
  })

  const onSubmit = (data) => {
    mutation.mutate({
      ...data,
      next_followup_date: new Date(data.next_followup_date).toISOString()
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
        <h1 className="text-xl font-bold text-gray-900 mb-2">Add Follow-up</h1>
        {lead && (
          <p className="text-gray-500 mb-6">
            {lead.customer_name} - {lead.site_location_name}
          </p>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label className="label">Construction Stage at Visit *</label>
            <select
              {...register('construction_stage_at_visit', { required: 'Required' })}
              className="input"
              defaultValue={lead?.construction_stage}
            >
              <option value="">Select Stage</option>
              {CONSTRUCTION_STAGES.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            {errors.construction_stage_at_visit && (
              <p className="text-red-500 text-sm mt-1">{errors.construction_stage_at_visit.message}</p>
            )}
          </div>

          <div>
            <label className="label">Remarks *</label>
            <textarea
              {...register('remarks', {
                required: 'Required',
                minLength: { value: 5, message: 'At least 5 characters' }
              })}
              className="input"
              rows={4}
              placeholder="Describe the visit details..."
            />
            {errors.remarks && (
              <p className="text-red-500 text-sm mt-1">{errors.remarks.message}</p>
            )}
          </div>

          <div>
            <label className="label">Next Follow-up Date *</label>
            <input
              type="datetime-local"
              {...register('next_followup_date', { required: 'Required' })}
              className="input"
            />
            {errors.next_followup_date && (
              <p className="text-red-500 text-sm mt-1">{errors.next_followup_date.message}</p>
            )}
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={mutation.isPending}
              className="btn btn-primary"
            >
              {mutation.isPending ? 'Saving...' : 'Add Follow-up'}
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
