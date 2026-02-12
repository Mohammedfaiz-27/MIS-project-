import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { leadsService } from '../../services/leads'
import { masterDataService } from '../../services/masterData'
import { CONSTRUCTION_STAGES, LEAD_TYPES, LEAD_STATUSES, BUILDER_TYPES } from '../../utils/constants'
import toast from 'react-hot-toast'
import { FiArrowLeft, FiPlus, FiUpload, FiX } from 'react-icons/fi'

export default function LeadForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const queryClient = useQueryClient()
  const isEdit = Boolean(id)

  // State for adding new items
  const [showAddArea, setShowAddArea] = useState(false)
  const [showAddSteel, setShowAddSteel] = useState(false)
  const [showAddCite, setShowAddCement] = useState(false)
  const [newArea, setNewArea] = useState('')
  const [newSteel, setNewSteel] = useState('')
  const [newCite, setNewCement] = useState('')
  const [selectedFiles, setSelectedFiles] = useState([])
  const [filePreviews, setFilePreviews] = useState([])

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm()

  const { data: areas, refetch: refetchAreas } = useQuery({
    queryKey: ['masterData', 'area'],
    queryFn: () => masterDataService.getAll('area')
  })

  const { data: steelBrands, refetch: refetchSteel } = useQuery({
    queryKey: ['masterData', 'steel_brand'],
    queryFn: () => masterDataService.getAll('steel_brand')
  })

  const { data: cementBrands, refetch: refetchCement } = useQuery({
    queryKey: ['masterData', 'cement_brand'],
    queryFn: () => masterDataService.getAll('cement_brand')
  })

  const { data: existingLead, isLoading: loadingLead } = useQuery({
    queryKey: ['lead', id],
    queryFn: () => leadsService.getById(id),
    enabled: isEdit
  })

  useEffect(() => {
    if (existingLead) {
      reset({
        ...existingLead,
        next_followup_date: existingLead.next_followup_date?.slice(0, 16)
      })
    }
  }, [existingLead, reset])

  // Mutation for adding master data
  const addMasterDataMutation = useMutation({
    mutationFn: masterDataService.create,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['masterData'] })
      toast.success(`${variables.value} added successfully!`)
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to add')
    }
  })

  const handleAddArea = async () => {
    if (!newArea.trim()) return
    try {
      await addMasterDataMutation.mutateAsync({ type: 'area', value: newArea.trim() })
      await refetchAreas()
      setValue('area', newArea.trim())
      setNewArea('')
      setShowAddArea(false)
    } catch (e) {}
  }

  const handleAddSteel = async () => {
    if (!newSteel.trim()) return
    try {
      await addMasterDataMutation.mutateAsync({ type: 'steel_brand', value: newSteel.trim() })
      await refetchSteel()
      setValue('steel_brand', newSteel.trim())
      setNewSteel('')
      setShowAddSteel(false)
    } catch (e) {}
  }

  const handleAddCement = async () => {
    if (!newCite.trim()) return
    try {
      await addMasterDataMutation.mutateAsync({ type: 'cement_brand', value: newCite.trim() })
      await refetchCement()
      setValue('cement_brand', newCite.trim())
      setNewCement('')
      setShowAddCement(false)
    } catch (e) {}
  }

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files).slice(0, 5 - selectedFiles.length)
    const newPreviews = files.map(file => URL.createObjectURL(file))
    setSelectedFiles(prev => [...prev, ...files])
    setFilePreviews(prev => [...prev, ...newPreviews])
  }

  const removeFile = (index) => {
    URL.revokeObjectURL(filePreviews[index])
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
    setFilePreviews(prev => prev.filter((_, i) => i !== index))
  }

  const createMutation = useMutation({
    mutationFn: async (payload) => {
      const lead = await leadsService.create(payload)
      if (selectedFiles.length > 0) {
        await leadsService.uploadPhotos(lead.id, selectedFiles)
      }
      return lead
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      toast.success('Lead created successfully!')
      navigate('/leads')
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to create lead')
    }
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const lead = await leadsService.update(id, data)
      if (selectedFiles.length > 0) {
        await leadsService.uploadPhotos(id, selectedFiles)
      }
      return lead
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['lead', id] })
      toast.success('Lead updated successfully!')
      navigate(`/leads/${id}`)
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to update lead')
    }
  })

  const onSubmit = (data) => {
    const payload = {
      ...data,
      next_followup_date: new Date(data.next_followup_date).toISOString()
    }

    if (isEdit) {
      updateMutation.mutate({ id, data: payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending

  if (isEdit && loadingLead) {
    return <div className="p-8 text-center">Loading...</div>
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

      <div className="card max-w-3xl">
        <h1 className="text-xl font-bold text-gray-900 mb-6">
          {isEdit ? 'Edit Lead' : 'Create New Lead'}
        </h1>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Site Details */}
          <div className="border-b pb-6">
            <h2 className="text-lg font-semibold mb-4">Site Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Site Location Name *</label>
                <input
                  {...register('site_location_name', { required: 'Required' })}
                  className="input"
                  placeholder="e.g., Green Meadows Project"
                />
                {errors.site_location_name && (
                  <p className="text-red-500 text-sm mt-1">{errors.site_location_name.message}</p>
                )}
              </div>
              <div>
                <label className="label">Area *</label>
                <div className="flex gap-2">
                  <select {...register('area', { required: 'Required' })} className="input flex-1">
                    <option value="">Select Area</option>
                    {areas?.map(a => (
                      <option key={a.id} value={a.value}>{a.value}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowAddArea(!showAddArea)}
                    className="btn btn-secondary p-2"
                    title="Add New Area"
                  >
                    <FiPlus className="w-5 h-5" />
                  </button>
                </div>
                {showAddArea && (
                  <div className="flex gap-2 mt-2">
                    <input
                      type="text"
                      value={newArea}
                      onChange={(e) => setNewArea(e.target.value)}
                      className="input flex-1"
                      placeholder="Enter new area name"
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddArea())}
                    />
                    <button
                      type="button"
                      onClick={handleAddArea}
                      disabled={addMasterDataMutation.isPending}
                      className="btn btn-primary"
                    >
                      {addMasterDataMutation.isPending ? '...' : 'Add'}
                    </button>
                  </div>
                )}
                {errors.area && (
                  <p className="text-red-500 text-sm mt-1">{errors.area.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Customer Details */}
          <div className="border-b pb-6">
            <h2 className="text-lg font-semibold mb-4">Customer Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Customer Name *</label>
                <input
                  {...register('customer_name', { required: 'Required' })}
                  className="input"
                  placeholder="Customer full name"
                />
                {errors.customer_name && (
                  <p className="text-red-500 text-sm mt-1">{errors.customer_name.message}</p>
                )}
              </div>
              <div>
                <label className="label">Phone Number *</label>
                <input
                  {...register('phone_number', {
                    required: 'Required',
                    minLength: { value: 10, message: 'At least 10 digits' }
                  })}
                  className="input"
                  placeholder="10-digit phone number"
                />
                {errors.phone_number && (
                  <p className="text-red-500 text-sm mt-1">{errors.phone_number.message}</p>
                )}
              </div>
              <div>
                <label className="label">Occupation</label>
                <input
                  {...register('occupation')}
                  className="input"
                  placeholder="e.g., Business, Doctor"
                />
              </div>
              <div>
                <label className="label">Builder Type *</label>
                <select {...register('builder_type', { required: 'Required' })} className="input">
                  <option value="">Select Builder Type</option>
                  {BUILDER_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                {errors.builder_type && (
                  <p className="text-red-500 text-sm mt-1">{errors.builder_type.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Materials */}
          <div className="border-b pb-6">
            <h2 className="text-lg font-semibold mb-4">Materials</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Steel Brand</label>
                <div className="flex gap-2">
                  <select {...register('steel_brand')} className="input flex-1">
                    <option value="">Select Steel Brand</option>
                    {steelBrands?.map(b => (
                      <option key={b.id} value={b.value}>{b.value}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowAddSteel(!showAddSteel)}
                    className="btn btn-secondary p-2"
                    title="Add New Steel Brand"
                  >
                    <FiPlus className="w-5 h-5" />
                  </button>
                </div>
                {showAddSteel && (
                  <div className="flex gap-2 mt-2">
                    <input
                      type="text"
                      value={newSteel}
                      onChange={(e) => setNewSteel(e.target.value)}
                      className="input flex-1"
                      placeholder="Enter new steel brand"
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSteel())}
                    />
                    <button
                      type="button"
                      onClick={handleAddSteel}
                      disabled={addMasterDataMutation.isPending}
                      className="btn btn-primary"
                    >
                      {addMasterDataMutation.isPending ? '...' : 'Add'}
                    </button>
                  </div>
                )}
              </div>
              <div>
                <label className="label">Cement Brand</label>
                <div className="flex gap-2">
                  <select {...register('cement_brand')} className="input flex-1">
                    <option value="">Select Cement Brand</option>
                    {cementBrands?.map(b => (
                      <option key={b.id} value={b.value}>{b.value}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowAddCement(!showAddCite)}
                    className="btn btn-secondary p-2"
                    title="Add New Cement Brand"
                  >
                    <FiPlus className="w-5 h-5" />
                  </button>
                </div>
                {showAddCite && (
                  <div className="flex gap-2 mt-2">
                    <input
                      type="text"
                      value={newCite}
                      onChange={(e) => setNewCement(e.target.value)}
                      className="input flex-1"
                      placeholder="Enter new cement brand"
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCement())}
                    />
                    <button
                      type="button"
                      onClick={handleAddCement}
                      disabled={addMasterDataMutation.isPending}
                      className="btn btn-primary"
                    >
                      {addMasterDataMutation.isPending ? '...' : 'Add'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Lead Classification */}
          <div className="border-b pb-6">
            <h2 className="text-lg font-semibold mb-4">Lead Classification</h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="label">Construction Stage *</label>
                <select {...register('construction_stage', { required: 'Required' })} className="input">
                  <option value="">Select Stage</option>
                  {CONSTRUCTION_STAGES.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
                {errors.construction_stage && (
                  <p className="text-red-500 text-sm mt-1">{errors.construction_stage.message}</p>
                )}
              </div>
              <div>
                <label className="label">Lead Type</label>
                <select {...register('lead_type')} className="input">
                  {LEAD_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Lead Status</label>
                <select {...register('lead_status')} className="input">
                  {LEAD_STATUSES.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Follow-up */}
          <div className="border-b pb-6">
            <h2 className="text-lg font-semibold mb-4">Follow-up</h2>
            <div className="grid grid-cols-2 gap-4">
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
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="label">Remarks</label>
            <textarea
              {...register('remarks')}
              className="input"
              rows={3}
              placeholder="Any additional notes..."
            />
          </div>

          {/* Site Photos Upload */}
          <div className="border-b pb-6">
            <h2 className="text-lg font-semibold mb-4">Site Photos</h2>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                id="lead-photo-upload"
                disabled={selectedFiles.length >= 5}
              />
              <label
                htmlFor="lead-photo-upload"
                className={`cursor-pointer flex flex-col items-center ${
                  selectedFiles.length >= 5 ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <FiUpload className="w-10 h-10 text-gray-400 mb-2" />
                <span className="text-sm text-gray-600">
                  Click to upload site photos
                </span>
                <span className="text-xs text-gray-400 mt-1">
                  Max 5 images (JPG, PNG)
                </span>
              </label>
            </div>

            {filePreviews.length > 0 && (
              <div className="grid grid-cols-5 gap-2 mt-4">
                {filePreviews.map((preview, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <FiX className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Show existing photos in edit mode */}
            {isEdit && existingLead?.site_photos?.length > 0 && (
              <div className="mt-4">
                <p className="text-sm text-gray-500 mb-2">Existing Photos:</p>
                <div className="grid grid-cols-5 gap-2">
                  {existingLead.site_photos.map((photo, index) => (
                    <img
                      key={index}
                      src={photo}
                      alt={`Existing photo ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary"
            >
              {isLoading ? 'Saving...' : (isEdit ? 'Update Lead' : 'Create Lead')}
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
