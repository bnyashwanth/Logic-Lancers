import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { LogIn, LogOut } from 'lucide-react'
import { io } from 'socket.io-client'
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import { useAuth } from '../context/AuthContext'
import logo from '../assets/logo.png'
import { createIncidentIcon } from '../utils/markerConfig'
import ChatDrawer from '../components/ChatDrawer'
import { apiUrl, SOCKET_BASE_URL } from '../config/api'

const SOCKET_URL = SOCKET_BASE_URL
const BENGALURU_CENTER = [12.9716, 77.5946]

const fallbackIcon = new L.Icon({
  iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).href,
  iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).href,
  shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).href,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

function normalizeIncidents(payload) {
  if (Array.isArray(payload)) {
    return payload
  }

  if (Array.isArray(payload?.incidents)) {
    return payload.incidents
  }

  return []
}

function getIncidentLabel(incident) {
  if (!incident?.type) {
    return 'INCIDENT'
  }

  return incident.type.replaceAll('_', ' ')
}

function getIncidentKey(incident) {
  return incident?._id || incident?.id
}

function isOpenIncident(incident) {
  return incident?.status !== 'RESOLVED'
}

export default function MapDashboard() {
  const { isAuthenticated, logoutUser } = useAuth()
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [chatOpen, setChatOpen] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  const socket = useMemo(() => io(SOCKET_URL, { withCredentials: true }), [])

  useEffect(() => {
    let mounted = true

    const fetchIncidents = async () => {
      try {
        setError('')
        const response = await axios.get(apiUrl('/incidents'))
        if (!mounted) {
          return
        }
        setIncidents(normalizeIncidents(response.data))
      } catch (fetchError) {
        if (mounted) {
          setError(fetchError.response?.data?.msg || 'Failed to load incidents.')
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    fetchIncidents()

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    const handleIncidentUpdated = (updatedIncident) => {
      if (!updatedIncident) {
        return
      }

      setIncidents((current) => {
        const nextIncidents = normalizeIncidents(current)
        const normalizedUpdated = getIncidentKey(updatedIncident)

        const filtered = nextIncidents.filter((incident) => getIncidentKey(incident) !== normalizedUpdated)

        if (isOpenIncident(updatedIncident)) {
          return [updatedIncident, ...filtered].sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))
        }

        return filtered
      })
    }

    socket.on('incident_updated', handleIncidentUpdated)
    socket.on('incident:updated', handleIncidentUpdated)

    const handleIncidentNew = (newIncident) => handleIncidentUpdated(newIncident)
    socket.on('incident:new', handleIncidentNew)

    const handleIncidentResolved = (resolvedIncident) => {
      if (!resolvedIncident) return
      setIncidents((current) => normalizeIncidents(current).filter((i) => getIncidentKey(i) !== getIncidentKey(resolvedIncident)))
    }
    socket.on('incident:resolved', handleIncidentResolved)

    return () => {
      socket.off('incident_updated', handleIncidentUpdated)
      socket.off('incident:updated', handleIncidentUpdated)
      socket.off('incident:new', handleIncidentNew)
      socket.off('incident:resolved', handleIncidentResolved)
      socket.disconnect()
    }
  }, [socket])

  const openIncidents = incidents.filter(isOpenIncident)

  const joinIncident = async (incidentId) => {
    const savedUser = localStorage.getItem('rescuesync_user_data') || localStorage.getItem('kinetic_user_data')
    const userId = savedUser ? (() => {
      try {
        const parsed = JSON.parse(savedUser)
        return parsed?._id || parsed?.id || ''
      } catch {
        return ''
      }
    })() : ''

    if (!userId) {
      setError('Please sign in before joining an incident.')
      return
    }

    try {
      setError('')
      await axios.post(apiUrl(`/incidents/${incidentId}/join`), { userId })
    } catch (joinError) {
      setError(joinError.response?.data?.msg || 'Unable to join incident.')
    }
  }

  return (
    <div className="flex min-h-[100dvh] w-full flex-col bg-white text-slate-900">
      <nav className="flex items-center justify-between px-4 py-3 border-b border-slate-200 shrink-0 shadow-sm z-10 relative">
        <Link to="/" className="flex items-center gap-2 text-slate-900 no-underline">
          <img src={logo} alt="RescueSync Logo" className="h-8 w-8 object-contain" />
        </Link>
        <div className="flex items-center gap-4">
          <Link to="/" className="hidden sm:block text-sm font-bold text-slate-900 no-underline transition hover:text-red-600">
            SOS Dashboard
          </Link>
          {isAuthenticated ? (
            <button
              type="button"
              onClick={logoutUser}
              className="flex items-center gap-2 text-sm font-bold text-slate-900 transition hover:text-red-600"
            >
              <LogOut size={18} strokeWidth={2.5} /> <span className="hidden sm:inline">Logout</span>
            </button>
          ) : (
            <Link
              to="/login"
              className="flex items-center gap-2 text-sm font-bold text-slate-900 no-underline transition hover:text-red-600"
            >
              <LogIn size={18} strokeWidth={2.5} /> <span className="hidden sm:inline">Login</span>
            </Link>
          )}
        </div>
      </nav>

      {/* Changed from row to column layout, removed width percentages */}
      <div className="flex flex-col flex-1 overflow-hidden">
        
        {/* Map Section: takes 50vh height on mobile, allows the rest for list */}
        <section className="relative h-[50vh] w-full border-b border-slate-200 shrink-0 z-0">
          <div className="absolute left-3 top-3 z-[400] rounded-xl border border-slate-300 bg-white/95 backdrop-blur-sm px-4 py-2 shadow-md">
            <p className="text-[10px] uppercase tracking-[0.3em] text-red-600 font-bold">RescueSync</p>
            <h1 className="mt-1 text-lg font-bold text-slate-900">Live Map</h1>
          </div>

          <MapContainer center={BENGALURU_CENTER} zoom={12} className="h-full w-full" scrollWheelZoom>
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {openIncidents.map((incident) => (
              <Marker
                key={getIncidentKey(incident)}
                position={[incident.location?.lat, incident.location?.lng]}
                icon={incident?.type ? createIncidentIcon(incident.type) : fallbackIcon}
              >
                <Popup>
                  <div className="space-y-2">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-red-600">
                        {getIncidentLabel(incident)}
                      </p>
                      <p className="mt-1 text-sm text-slate-700">{incident.description}</p>
                    </div>

                    <div className="text-xs text-slate-600">
                      Volunteers en route: {incident.volunteersEnRoute?.length || 0}/{incident.requiredVolunteers || 5}
                    </div>

                    {incident.status === 'FULL' ? (
                      <div className="rounded-lg bg-red-100 px-2 py-1.5 text-[10px] font-semibold text-red-700">
                        Max volunteers reached.
                      </div>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => joinIncident(getIncidentKey(incident))}
                      disabled={incident.status === 'FULL'}
                      className="w-full rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      I&apos;m on my way
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </section>

        {/* List Section: flex-1 allows it to fill remaining screen space */}
        <aside className="flex flex-col flex-1 w-full bg-white z-10 overflow-hidden">
          <div className="border-b border-slate-200 px-4 py-3 bg-slate-50 shrink-0">
            <h2 className="text-lg font-bold text-slate-900">Open Incidents</h2>
            {error ? <p className="mt-1 text-xs text-red-600 font-semibold">{error}</p> : null}
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-24"> {/* Added padding bottom to account for FAB */}
            {loading ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-600 text-center font-semibold">
                Loading incidents...
              </div>
            ) : openIncidents.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-600 text-center font-semibold">
                No active incidents right now.
              </div>
            ) : (
              openIncidents.map((incident) => (
                <article key={getIncidentKey(incident)} className="rounded-xl border border-slate-200 bg-slate-50 p-4 active:bg-slate-100 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-red-600">{getIncidentLabel(incident)}</p>
                      <h3 className="mt-1 text-sm font-bold text-slate-900 leading-snug">{incident.description}</h3>
                    </div>
                    <span className="rounded-full border border-red-300 bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700 whitespace-nowrap">
                      {incident.status}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs text-slate-600 border-t border-slate-200 pt-3">
                    <p className="font-semibold text-slate-900">
                      Volunteers: <span className="text-red-600">{incident.volunteersEnRoute?.length || 0}/{incident.requiredVolunteers || 5}</span>
                    </p>
                    <p className="text-slate-500">
                      📍 {Number(incident.location?.lat).toFixed(4)}, {Number(incident.location?.lng).toFixed(4)}
                    </p>
                  </div>

                  {incident.status === 'FULL' ? (
                    <p className="mt-2 text-xs font-semibold text-red-600">⚠ Max volunteers reached</p>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => joinIncident(getIncidentKey(incident))}
                    disabled={incident.status === 'FULL'}
                    className="mt-3 w-full rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-red-600"
                  >
                    I'm on my way
                  </button>
                </article>
              ))
            )}
          </div>
        </aside>
      </div>

      <button
        type="button"
        onClick={() => setChatOpen((s) => !s)}
        className="fixed bottom-6 right-4 z-[500] rounded-full bg-red-600 px-5 py-4 text-sm font-bold text-white shadow-xl transition hover:bg-red-700 active:scale-95"
      >
        {chatOpen ? 'CLOSE' : 'CHAT'}
      </button>

      <ChatDrawer
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        context={{
          currentPage: '/map',
          user: isAuthenticated ? { role: 'USER' } : { role: 'GUEST' },
          incidents: openIncidents,
        }}
      />
    </div>
  )
}