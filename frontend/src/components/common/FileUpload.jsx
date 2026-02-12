import { useState } from 'react'
import { FiUpload, FiX, FiImage } from 'react-icons/fi'

export default function FileUpload({ onFilesSelected, maxFiles = 5 }) {
  const [files, setFiles] = useState([])
  const [previews, setPreviews] = useState([])

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files).slice(0, maxFiles - files.length)

    // Create previews
    const newPreviews = selectedFiles.map(file => URL.createObjectURL(file))

    const updatedFiles = [...files, ...selectedFiles]
    const updatedPreviews = [...previews, ...newPreviews]

    setFiles(updatedFiles)
    setPreviews(updatedPreviews)
    onFilesSelected(updatedFiles)
  }

  const removeFile = (index) => {
    URL.revokeObjectURL(previews[index])
    const updatedFiles = files.filter((_, i) => i !== index)
    const updatedPreviews = previews.filter((_, i) => i !== index)

    setFiles(updatedFiles)
    setPreviews(updatedPreviews)
    onFilesSelected(updatedFiles)
  }

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          id="file-upload"
          disabled={files.length >= maxFiles}
        />
        <label
          htmlFor="file-upload"
          className={`cursor-pointer flex flex-col items-center ${
            files.length >= maxFiles ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          <FiUpload className="w-10 h-10 text-gray-400 mb-2" />
          <span className="text-sm text-gray-600">
            Click to upload site photos
          </span>
          <span className="text-xs text-gray-400 mt-1">
            Max {maxFiles} files
          </span>
        </label>
      </div>

      {previews.length > 0 && (
        <div className="grid grid-cols-5 gap-2">
          {previews.map((preview, index) => (
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
    </div>
  )
}
