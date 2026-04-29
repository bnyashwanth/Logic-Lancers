import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import { io } from 'socket.io-client'
import { apiUrl, SOCKET_BASE_URL } from '../config/api'

const SOCKET_URL = SOCKET_BASE_URL

const EMERGENCY_TYPES = ['BLOOD', 'MEDICINE', 'RESCUE', 'SUPPLIES']
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

const SOS_QUEUE_KEY = 'rescuesync_sos_queue_v1'

function createDeviceId() {
  if (crypto?.randomUUID) {
    return crypto.randomUUID()
  }

  return `rescuesync-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`
}

function normalizeIncidents(payload) {
  if (Array.isArray(payload)) {
    return payload
  }

  if (Array.isArray(payload?.incidents)) {
    return payload.incidents
  }

  return []
}

function safeLoadQueue() {
  try {
    const raw = localStorage.getItem(SOS_QUEUE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function safeSaveQueue(queue) {
  try {
    localStorage.setItem(SOS_QUEUE_KEY, JSON.stringify(queue))
  } catch {
    // If storage fails, just drop the queue.
  }
}

export default function VictimDashboard() {
  const [deviceId, setDeviceId] = useState('')
  const [formData, setFormData] = useState({
    type: 'RESCUE',
    description: '',
    lat: '',
    lng: '',
    bloodGroup: '',
  })
  const [imageFiles, setImageFiles] = useState([])
  const [imageDataUrls, setImageDataUrls] = useState([])
  const [cameraOpen, setCameraOpen] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const videoRef = useRef(null)
  const cameraStreamRef = useRef(null)
  const [locationCaptured, setLocationCaptured] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [activeRequests, setActiveRequests] = useState([])

  const socket = useMemo(() => io(SOCKET_URL, { withCredentials: true }), [])

  useEffect(() => {
    const stored = localStorage.getItem('rescue_device_id')
    if (stored) {
      setDeviceId(stored)
      return
    }

    const created = createDeviceId()
    localStorage.setItem('rescue_device_id', created)
    setDeviceId(created)
  }, [])

  const fetchRequests = useCallback(async (activeDeviceId) => {
    if (!activeDeviceId) {
      return
    }

    try {
      const response = await axios.get(apiUrl('/incidents'))
      const incidents = normalizeIncidents(response.data)
      const filtered = incidents.filter((incident) => incident?.deviceId === activeDeviceId)
      setActiveRequests(filtered)
    } catch (fetchError) {
      setError(fetchError.response?.data?.msg || 'Unable to load active requests.')
    }
  }, [])

  const enqueueSOS = useCallback((p) => {
    const queue = safeLoadQueue()
    const nextItem = {
      id: createDeviceId(),
      deviceId: p.deviceId,
      payload: p,
      createdAt: Date.now(),
    }

    // Keep the queue bounded (hackathon-friendly).
    const capped = queue.length > 20 ? queue.slice(queue.length - 20) : queue
    capped.push(nextItem)
    safeSaveQueue(capped)
  }, [])

  const flushQueuedSOS = useCallback(async () => {
    if (!deviceId || !navigator.onLine) return

    const queue = safeLoadQueue()
    if (!Array.isArray(queue) || queue.length === 0) return

    const remaining = []
    let sentAny = false

    for (let i = 0; i < queue.length; i += 1) {
      const item = queue[i]

      if (!item?.payload || item?.deviceId !== deviceId) {
        remaining.push(item)
        continue
      }

      try {
        await axios.post(apiUrl('/incidents'), item.payload)
        sentAny = true
      } catch (_e) {
        // Stop on offline errors and keep what's left.
        if (!navigator.onLine) {
          remaining.push(item)
          remaining.push(...queue.slice(i + 1))
          break
        }
        remaining.push(item)
      }
    }

    safeSaveQueue(remaining)
    if (sentAny) {
      fetchRequests(deviceId)
    }
  }, [deviceId, fetchRequests])

  useEffect(() => {
    if (!deviceId) {
      return
    }

    flushQueuedSOS().finally(() => {
      if (navigator.onLine) {
        fetchRequests(deviceId)
      }
    })
  }, [deviceId, fetchRequests, flushQueuedSOS])

  // Once we're back online, refresh so any queued SOS shows up immediately.
  useEffect(() => {
    if (!deviceId) return

    const handleOnline = () => {
      flushQueuedSOS().finally(() => {
        fetchRequests(deviceId)
      })
    }

    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [deviceId, fetchRequests, flushQueuedSOS])

  useEffect(() => {
    const handleIncidentUpdated = (updatedIncident) => {
      if (!updatedIncident || updatedIncident.deviceId !== deviceId) {
        return
      }

      setActiveRequests((current) => {
        const next = normalizeIncidents(current)
        const filtered = next.filter((incident) => incident?._id !== updatedIncident?._id)
        return [updatedIncident, ...filtered]
      })
    }

    socket.on('incident_updated', handleIncidentUpdated)

    return () => {
      socket.off('incident_updated', handleIncidentUpdated)
      socket.disconnect()
    }
  }, [deviceId, socket])

  const updateField = (field) => (event) => {
    setFormData((current) => ({ ...current, [field]: event.target.value }))
  }

  const handleImagesPicked = async (event) => {
    const files = Array.from(event.target.files || [])
    setError('')
    setStatusMessage('')

    if (files.length === 0) {
      setImageFiles([])
      setImageDataUrls([])
      return
    }

    if (files.length < 5 || files.length > 10) {
      setError('Please select between 5 and 10 images.')
      setImageFiles([])
      setImageDataUrls([])
      return
    }

    // Lightweight client guard: reject huge images to avoid request size blowups.
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
    setError('')
    setStatusMessage('')
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
    } catch (_e) {
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

    // Compress to JPEG to reduce payload size.
    const dataUrl = canvas.toDataURL('image/jpeg', 0.75)
    setImageDataUrls((current) => [...current, dataUrl])
    setImageFiles((current) => [...current, { name: `camera-${Date.now()}.jpg` }])
    setStatusMessage('Captured image added.')
  }, [imageDataUrls.length])

  // Cleanup camera stream if component unmounts.
  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [stopCamera])

  const handleFetchLocation = () => {
    setError('')
    setStatusMessage('Fetching location...')
    setLocationCaptured(false)

    if (!navigator.geolocation) {
      setStatusMessage('Geolocation is not supported in this browser.')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData((current) => ({
          ...current,
          lat: position.coords.latitude.toFixed(6),
          lng: position.coords.longitude.toFixed(6),
        }))
        setLocationCaptured(true)
        setStatusMessage('Location captured successfully.')
      },
      () => {
        setStatusMessage('Unable to fetch location. Please allow location access.')
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

    if (!deviceId) {
      setError('Unable to generate a device ID. Please refresh the page.')
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
    setStatusMessage('')

    const payload = {
      deviceId,
      type: formData.type,
      description: formData.description.trim(),
      bloodGroup: formData.type === 'BLOOD' ? formData.bloodGroup : undefined,
      images: imageDataUrls.length > 0 ? imageDataUrls : undefined,
      location: {
        lat: Number(formData.lat),
        lng: Number(formData.lng),
      },
    }

    try {
      if (!navigator.onLine) {
        enqueueSOS(payload)
        setFormData((current) => ({ ...current, description: '' }))
        setImageFiles([])
        setImageDataUrls([])
        closeCamera()
        setStatusMessage('SOS queued offline. Sending automatically when you are back online.')
        return
      }

      await axios.post(apiUrl('/incidents'), payload)
      setFormData((current) => ({ ...current, description: '' }))
      setImageFiles([])
      setImageDataUrls([])
      closeCamera()
      setStatusMessage('SOS sent. Help is being coordinated now.')
      // Replay any earlier queued SOS (same deviceId).
      await flushQueuedSOS()
      fetchRequests(deviceId)
    } catch (submitError) {
      // If the network dropped mid-flight, keep the SOS locally and replay later.
      if (!navigator.onLine || submitError?.code === 'ERR_NETWORK') {
        enqueueSOS(payload)
        setError('')
        setImageFiles([])
        setImageDataUrls([])
        closeCamera()
        setStatusMessage('SOS queued offline. Sending automatically when you are back online.')
      } else {
        setError(submitError.response?.data?.msg || 'Failed to submit SOS request.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface text-primary">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-6 py-12">
        <header className="space-y-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-secondary">RescueSync</p>
          <h1 className="text-3xl font-bold sm:text-4xl">Report an Emergency</h1>
          <p className="text-sm text-secondary">
            This is the fastest way to request help. Submit your SOS and our volunteer network will respond.
          </p>
        </header>

        <section className="bg-surface-lowest p-8 shadow-ambient">
          <form onSubmit={handleSubmit} className="flex flex-col gap-8">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold uppercase tracking-wider text-secondary">Emergency Type</label>
              <select
                value={formData.type}
                onChange={updateField('type')}
                className="input-brutalist"
              >
                {EMERGENCY_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {formData.type === 'BLOOD' ? (
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold uppercase tracking-wider text-secondary">Blood Group</label>
                <select value={formData.bloodGroup} onChange={updateField('bloodGroup')} className="input-brutalist">
                  <option value="">Select blood group</option>
                  {BLOOD_GROUPS.map((group) => (
                    <option key={group} value={group}>
                      {group}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold uppercase tracking-wider text-secondary">Description</label>
              <textarea
                value={formData.description}
                onChange={updateField('description')}
                rows={5}
                placeholder="Describe what you need right now."
                className="input-brutalist"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold uppercase tracking-wider text-secondary">Images (5–10)</label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImagesPicked}
                className="input-brutalist"
              />
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button type="button" onClick={openCamera} className="btn-secondary">
                  Use Camera
                </button>
                <div className="text-xs font-bold text-secondary">
                  Selected: {imageFiles.length}/10 {imageFiles.length > 0 ? '(min 5)' : '(optional)'}
                </div>
              </div>
              <div className="text-xs font-bold text-secondary">
                Tip: if you attach images, attach at least 5 for better verification.
              </div>
            </div>

            {cameraOpen ? (
              <section className="bg-surface p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-secondary">Live Camera</p>
                    <p className="text-sm text-secondary">Capture up to 10 images.</p>
                  </div>
                  <button type="button" onClick={closeCamera} className="btn-secondary">
                    Close
                  </button>
                </div>

                <div className="mt-4">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full bg-surface-high"
                  />
                </div>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <button type="button" onClick={captureFromCamera} className="btn-primary w-full">
                    Capture Photo
                  </button>
                </div>

                {cameraError ? <p className="mt-3 text-sm text-primary">{cameraError}</p> : null}
              </section>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button type="button" onClick={handleFetchLocation} className="btn-secondary">
                Get Location
              </button>
              <div className="text-sm font-bold text-secondary">
                {locationCaptured ? 'Location captured ✓' : 'Location needed'}
              </div>
            </div>

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
              {isSubmitting ? 'Submitting SOS...' : 'Submit SOS'}
            </button>

            {statusMessage ? <p className="text-sm text-tertiary">{statusMessage}</p> : null}
            {error ? <p className="text-sm text-primary">{error}</p> : null}
          </form>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold">My Active Requests</h2>
          {activeRequests.length === 0 ? (
            <div className="card-brutalist text-sm text-secondary">
              No active requests yet. Submit your first SOS above.
            </div>
          ) : (
            <div className="space-y-3">
              {activeRequests.map((incident) => (
                <article key={incident._id} className="card-brutalist">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-secondary">
                        {incident.type}
                      </p>
                      <h3 className="mt-2 text-base font-bold text-primary">{incident.description}</h3>
                    </div>
                    <span className="chip-selected">{incident.status}</span>
                  </div>
                  <div className="mt-3 text-sm text-secondary">
                    Volunteers: {incident.volunteersEnRoute?.length || 0}/{incident.requiredVolunteers || 5}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
