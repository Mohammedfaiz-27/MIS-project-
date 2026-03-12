import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { leadsService } from '../../services/leads'
import { salesEntriesService } from '../../services/salesEntries'
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
  const [gpsLocation, setGpsLocation] = useState(null)
  const [gpsStatus, setGpsStatus] = useState('idle') // idle | capturing | captured | denied | unavailable

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm()

  const leadStatus = watch('lead_status')

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

  // Capture GPS on new lead creation
  useEffect(() => {
    if (isEdit) return
    if (!navigator.geolocation) {
      setGpsStatus('unavailable')
      return
    }
    setGpsStatus('capturing')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        setGpsLocation({
          latitude: lat,
          longitude: lng,
          maps_link: `https://www.google.com/maps?q=${lat},${lng}`,
          captured_at: new Date().toISOString()
        })
        setGpsStatus('captured')
      },
      () => {
        setGpsStatus('denied')
      },
      { timeout: 10000, maximumAge: 0, enableHighAccuracy: true }
    )
  }, [isEdit])

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
      const { steel_quantity_kg, cement_quantity_bags, ...leadPayload } = payload
      const lead = await leadsService.create(leadPayload)
      if (selectedFiles.length > 0) {
        await leadsService.uploadPhotos(lead.id, selectedFiles)
      }
      if (leadPayload.lead_status === 'won' && (steel_quantity_kg || cement_quantity_bags)) {
        await salesEntriesService.create(lead.id, {
          steel_quantity_kg: Number(steel_quantity_kg) || 0,
          cement_quantity_bags: Number(cement_quantity_bags) || 0
        })
      }
      return lead
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['salesEntries'] })
      toast.success('Lead created successfully!')
      navigate('/leads')
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to create lead')
    }
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const { steel_quantity_kg, cement_quantity_bags, ...leadPayload } = data
      const lead = await leadsService.update(id, leadPayload)
      if (selectedFiles.length > 0) {
        await leadsService.uploadPhotos(id, selectedFiles)
      }
      if (leadPayload.lead_status === 'won' && (steel_quantity_kg || cement_quantity_bags)) {
        await salesEntriesService.create(id, {
          steel_quantity_kg: Number(steel_quantity_kg) || 0,
          cement_quantity_bags: Number(cement_quantity_bags) || 0
        })
      }
      return lead
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['lead', id] })
      queryClient.invalidateQueries({ queryKey: ['salesEntries'] })
      toast.success('Lead updated successfully!')
      navigate(`/leads/${id}`)
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to update lead')
    }
  })

  const onSubmit = (data) => {
    const payload = { ...data }
    if (data.next_followup_date) {
      payload.next_followup_date = new Date(data.next_followup_date).toISOString()
    } else {
      delete payload.next_followup_date
    }

    if (!isEdit && gpsLocation) {
      payload.location = gpsLocation
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
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-gray-900">
            {isEdit ? 'Edit Lead' : 'Create New Lead'}
          </h1>
          {!isEdit && (
            <span className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${
              gpsStatus === 'captured' ? 'bg-green-100 text-green-700' :
              gpsStatus === 'capturing' ? 'bg-yellow-100 text-yellow-700' :
              gpsStatus === 'denied' ? 'bg-red-100 text-red-600' :
              gpsStatus === 'unavailable' ? 'bg-gray-100 text-gray-500' : 'bg-gray-100 text-gray-400'
            }`}>
              {gpsStatus === 'captured' && <><span>📍</span> Location captured</>}
              {gpsStatus === 'capturing' && <><span className="animate-pulse">📍</span> Getting location…</>}
              {gpsStatus === 'denied' && <><span>📍</span> Location denied</>}
              {gpsStatus === 'unavailable' && <><span>📍</span> GPS unavailable</>}
              {gpsStatus === 'idle' && null}
            </span>
          )}
        </div>

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
                  type="tel"
                  maxLength={10}
                  {...register('phone_number', {
                    required: 'Required',
                    pattern: {
                      value: /^[6-9]\d{9}$/,
                      message: 'Enter a valid 10-digit Indian mobile number'
                    }
                  })}
                  onKeyDown={(e) => {
                    if (!/[0-9]/.test(e.key) && !['Backspace','Delete','Tab','ArrowLeft','ArrowRight'].includes(e.key)) {
                      e.preventDefault()
                    }
                  }}
                  className="input"
                  placeholder="e.g., 9876543210"
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
                <label className="label">Steel Brand *</label>
                <div className="flex gap-2">
                  <select {...register('steel_brand', { required: 'Required' })} className="input flex-1">
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
                {errors.steel_brand && (
                  <p className="text-red-500 text-sm mt-1">{errors.steel_brand.message}</p>
                )}
              </div>
              <div>
                <label className="label">Cement Brand *</label>
                <div className="flex gap-2">
                  <select {...register('cement_brand', { required: 'Required' })} className="input flex-1">
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
                {errors.cement_brand && (
                  <p className="text-red-500 text-sm mt-1">{errors.cement_brand.message}</p>
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
                <label className="label">Lead Type *</label>
                <select {...register('lead_type', { required: 'Required' })} className="input">
                  <option value="">Select Lead Type</option>
                  {LEAD_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                {errors.lead_type && (
                  <p className="text-red-500 text-sm mt-1">{errors.lead_type.message}</p>
                )}
              </div>
              <div>
                <label className="label">Lead Status *</label>
                <select {...register('lead_status', { required: 'Required' })} className="input">
                  <option value="">Select Status</option>
                  {LEAD_STATUSES.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
                {errors.lead_status && (
                  <p className="text-red-500 text-sm mt-1">{errors.lead_status.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Sales Entry Details - shown when Won is selected */}
          {leadStatus === 'won' && (
            <div className="border-b pb-6">
              <h2 className="text-lg font-semibold mb-4">Sales Entry Details</h2>
              <p className="text-sm text-yellow-600 bg-yellow-50 p-3 rounded-lg mb-4">
                This entry will be submitted for admin approval.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Steel Quantity (kg) *</label>
                  <input
                    type="number"
                    step="0.01"
                    {...register('steel_quantity_kg', {
                      required: leadStatus === 'won' ? 'Required' : false,
                      min: { value: 0, message: 'Must be 0 or more' }
                    })}
                    className="input"
                    placeholder="Enter steel quantity in kg"
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
                      required: leadStatus === 'won' ? 'Required' : false,
                      min: { value: 0, message: 'Must be 0 or more' }
                    })}
                    className="input"
                    placeholder="Enter cement quantity in bags"
                  />
                  {errors.cement_quantity_bags && (
                    <p className="text-red-500 text-sm mt-1">{errors.cement_quantity_bags.message}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Follow-up - only shown when follow_up status is selected */}
          {(!leadStatus || leadStatus === 'follow_up') && (
            <div className="border-b pb-6">
              <h2 className="text-lg font-semibold mb-4">Follow-up</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Next Follow-up Date *</label>
                  <input
                    type="datetime-local"
                    {...register('next_followup_date', {
                      required: leadStatus === 'follow_up' ? 'Required' : false
                    })}
                    className="input"
                  />
                  {errors.next_followup_date && (
                    <p className="text-red-500 text-sm mt-1">{errors.next_followup_date.message}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Remarks */}
          <div>
            <label className="label">Remarks *</label>
            <textarea
              {...register('remarks', {
                required: 'Required',
                minLength: { value: 5, message: 'At least 5 characters' }
              })}
              className="input"
              rows={3}
              placeholder="Any additional notes..."
            />
            {errors.remarks && (
              <p className="text-red-500 text-sm mt-1">{errors.remarks.message}</p>
            )}
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
