import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import { getMarkerColor } from '../utils/markerConfig'
import { apiUrl } from '../config/api'

const INCIDENT_TYPES = ['BLOOD', 'MEDICINE', 'RESCUE', 'SUPPLIES','Others']
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
const PENDING_SOS_KEY = 'rescuesync_pending_sos_modal_v1'

export default function SOSModal({ isOpen, onClose, onCreated, requesterId: requesterIdProp }) {
  const [formData, setFormData] = useState({
    type: 'RESCUE',
    description: '',
    lat: '',
    lng: '',
    bloodGroup: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [geoStatus, setGeoStatus] = useState('')
  const [error, setError] = useState('')
  const [imageFiles, setImageFiles] = useState([])
  const [imageDataUrls, setImageDataUrls] = useState([])
  const [cameraOpen, setCameraOpen] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const videoRef = useRef(null)
  const cameraStreamRef = useRef(null)

  const requesterId = useMemo(() => {
    if (requesterIdProp) {
      return requesterIdProp
    }

    try {
      const savedUser = localStorage.getItem('rescuesync_user_data') || localStorage.getItem('kinetic_user_data')
      if (!savedUser) {
        return ''
      }

      const parsed = JSON.parse(savedUser)
      return parsed?._id || parsed?.id || ''
    } catch {
      return ''
    }
  }, [requesterIdProp])

  useEffect(() => {
    if (!isOpen) {
      setError('')
      setGeoStatus('')
      setFormData({ type: 'RESCUE', description: '', lat: '', lng: '', bloodGroup: '' })
      setImageFiles([])
      setImageDataUrls([])
      setCameraError('')
      setCameraOpen(false)
    }
  }, [isOpen])

  if (!isOpen) {
    return null
  }

  const updateField = (field) => (event) => {
    setFormData((current) => ({ ...current, [field]: event.target.value }))
  }

  const safeLoadPending = () => {
    try {
      const raw = localStorage.getItem(PENDING_SOS_KEY)
      if (!raw) return []
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  const safeSavePending = (items) => {
    try {
      localStorage.setItem(PENDING_SOS_KEY, JSON.stringify(items))
    } catch {
      // ignore
    }
  }

  const enqueuePending = useCallback((payload) => {
    const current = safeLoadPending()
    const next = current.length > 20 ? current.slice(current.length - 20) : current
    next.push({ id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, payload, createdAt: Date.now() })
    safeSavePending(next)
  }, [])

  const flushPending = useCallback(async () => {
    if (!navigator.onLine) return
    const current = safeLoadPending()
    if (current.length === 0) return

    const remaining = []
    for (const item of current) {
      try {
        const response = await axios.post(apiUrl('/incidents'), item.payload)
        onCreated?.(response.data.incident)
      } catch (_e) {
        if (!navigator.onLine) {
          remaining.push(item)
        }
      }
    }
    safeSavePending(remaining)
  }, [onCreated])

  useEffect(() => {
    const handleOnline = () => {
      flushPending()
    }
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [flushPending])

  const handleImagesPicked = async (event) => {
    const files = Array.from(event.target.files || [])
    setError('')

    if (files.length === 0) {
      setImageFiles([])
      setImageDataUrls([])
      return
    }

    if (files.length < 5 || files.length > 10) {
      setError('If you attach images, please attach between 5 and 10.')
      setImageFiles([])
      setImageDataUrls([])
      return
    }

    const maxBytesPerImage = 750_000
    const oversized = files.find((file) => file.size > maxBytesPerImage)
    if (oversized) {
      setError('One or more images are too large. Please pick smaller images.')
      setImageFiles([])
      setImageDataUrls([])
      return
    }

    const toDataUrl = (file) =>
      new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result || ''))
        reader.onerror = () => reject(new Error('Failed to read image'))
        reader.readAsDataURL(file)
      })

    try {
      const dataUrls = await Promise.all(files.map(toDataUrl))
      setImageFiles(files)
      setImageDataUrls(dataUrls)
    } catch {
      setError('Failed to read images. Please try again.')
      setImageFiles([])
      setImageDataUrls([])
    }
  }

  const stopCamera = useCallback(() => {
    const stream = cameraStreamRef.current
    if (stream && typeof stream.getTracks === 'function') {
      stream.getTracks().forEach((track) => track.stop())
    }
    cameraStreamRef.current = null
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [])

  const openCamera = useCallback(async () => {
    setCameraError('')
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera is not supported in this browser.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      })
      cameraStreamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      setCameraOpen(true)
    } catch {
      setCameraError('Unable to access camera. Please allow camera permissions.')
    }
  }, [])

  const closeCamera = useCallback(() => {
    stopCamera()
    setCameraOpen(false)
  }, [stopCamera])

  const captureFromCamera = useCallback(() => {
    setCameraError('')
    const video = videoRef.current
    if (!video) {
      setCameraError('Camera not ready yet.')
      return
    }
    const width = video.videoWidth
    const height = video.videoHeight
    if (!width || !height) {
      setCameraError('Camera not ready yet.')
      return
    }
    if (imageDataUrls.length >= 10) {
      setCameraError('You can attach up to 10 images.')
      return
    }

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      setCameraError('Unable to capture image.')
      return
    }
    ctx.drawImage(video, 0, 0, width, height)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.75)
    setImageDataUrls((current) => [...current, dataUrl])
    setImageFiles((current) => [...current, { name: `camera-${Date.now()}.jpg` }])
  }, [imageDataUrls.length])

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [stopCamera])

  const handleLocation = () => {
    setError('')
    setGeoStatus('Fetching location...')

    if (!navigator.geolocation) {
      setGeoStatus('Geolocation is not supported in this browser.')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData((current) => ({
          ...current,
          lat: position.coords.latitude.toFixed(6),
          lng: position.coords.longitude.toFixed(6),
        }))
        setGeoStatus('Location captured successfully.')
      },
      () => {
        setGeoStatus('Unable to fetch location. Please allow location access.')
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    )
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!requesterId) {
      setError('Please sign in before creating an incident.')
      return
    }

    if (!formData.description.trim() || !formData.lat || !formData.lng) {
      setError('Description and location are required.')
      return
    }

    if (formData.type === 'BLOOD' && !formData.bloodGroup) {
      setError('Please select a blood group.')
      return
    }

    if (imageDataUrls.length > 0 && (imageDataUrls.length < 5 || imageDataUrls.length > 10)) {
      setError('If you attach images, please attach between 5 and 10.')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const payload = {
        requesterId,
        type: formData.type,
        description: formData.description.trim(),
        bloodGroup: formData.type === 'BLOOD' ? formData.bloodGroup : undefined,
        images: imageDataUrls.length > 0 ? imageDataUrls : undefined,
        location: {
          lat: Number(formData.lat),
          lng: Number(formData.lng),
        },
      }

      if (!navigator.onLine) {
        enqueuePending(payload)
        onClose?.()
        return
      }

      const response = await axios.post(apiUrl('/incidents'), payload)
      onCreated?.(response.data.incident)
      await flushPending()
      onClose?.()
    } catch (submitError) {
      if (!navigator.onLine || submitError?.code === 'ERR_NETWORK') {
        enqueuePending({
          requesterId,
          type: formData.type,
          description: formData.description.trim(),
          bloodGroup: formData.type === 'BLOOD' ? formData.bloodGroup : undefined,
          images: imageDataUrls.length > 0 ? imageDataUrls : undefined,
          location: {
            lat: Number(formData.lat),
            lng: Number(formData.lng),
          },
        })
        onClose?.()
      } else {
        setError(submitError.response?.data?.msg || 'Failed to submit incident.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-slate-950 shadow-2xl shadow-black/40">
        <div className="flex items-start justify-between border-b border-white/10 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-red-400">Emergency request</p>
            <h2 className="mt-2 text-2xl font-bold text-white">Create RescueSync incident</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 px-3 py-1 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
          >
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-6">
          <div className="grid gap-5 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-200">Type</span>
              <select
                value={formData.type}
                onChange={updateField('type')}
                className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-red-400"
              >
                {INCIDENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>

            {formData.type === 'BLOOD' ? (
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-200">Blood Group</span>
                <select
                  value={formData.bloodGroup}
                  onChange={updateField('bloodGroup')}
                  className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-red-400"
                >
                  <option value="">Select blood group</option>
                  {BLOOD_GROUPS.map((group) => (
                    <option key={group} value={group}>
                      {group}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <div className="space-y-2">
                <span className="text-sm font-medium text-slate-200">Category</span>
                <div
                  className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm font-semibold"
                  style={{ color: getMarkerColor(formData.type) }}
                >
                  {formData.type}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <span className="text-sm font-medium text-slate-200">Location</span>
              <div className="grid grid-cols-2 gap-3">
                <input
                  value={formData.lat}
                  onChange={updateField('lat')}
                  placeholder="Latitude"
                  inputMode="decimal"
                  className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-red-400"
                />
                <input
                  value={formData.lng}
                  onChange={updateField('lng')}
                  placeholder="Longitude"
                  inputMode="decimal"
                  className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-red-400"
                />
              </div>
            </div>
          </div>

          <label className="space-y-2 block">
            <span className="text-sm font-medium text-slate-200">Description</span>
            <textarea
              value={formData.description}
              onChange={updateField('description')}
              rows={5}
              placeholder="Describe the incident, resource need, or rescue details"
              className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-red-400"
            />
          </label>

          <div className="space-y-2">
            <span className="text-sm font-medium text-slate-200">Images (optional, 5–10 if used)</span>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImagesPicked}
              className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-slate-200 outline-none"
            />
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300">
              <span>Selected: {imageFiles.length}/10</span>
              <button
                type="button"
                onClick={openCamera}
                className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
              >
                Use Camera
              </button>
            </div>
          </div>

          {cameraOpen ? (
            <div className="rounded-2xl border border-white/10 bg-slate-900 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Live Camera</p>
                <button
                  type="button"
                  onClick={closeCamera}
                  className="rounded-2xl border border-white/10 px-3 py-1 text-xs text-slate-300 transition hover:bg-white/5 hover:text-white"
                >
                  Close
                </button>
              </div>
              <video ref={videoRef} autoPlay playsInline muted className="mt-3 w-full rounded-xl bg-black/20" />
              <div className="mt-3">
                <button
                  type="button"
                  onClick={captureFromCamera}
                  className="w-full rounded-2xl bg-red-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-400"
                >
                  Capture Photo
                </button>
              </div>
              {cameraError ? <p className="mt-2 text-sm text-red-300">{cameraError}</p> : null}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleLocation}
              className="rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200 transition hover:bg-red-500/20"
            >
              Get My Location
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-2xl bg-red-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Incident'}
            </button>
          </div>

          <div className="min-h-6 text-sm">
            {geoStatus ? <p className="text-slate-300">{geoStatus}</p> : null}
            {error ? <p className="text-red-400">{error}</p> : null}
          </div>
        </form>
      </div>
    </div>
  )
}