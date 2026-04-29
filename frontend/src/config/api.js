function normalizeApiBase(rawValue) {
  const fallback = 'http://localhost:5001'
  const value = typeof rawValue === 'string' && rawValue.trim().length > 0 ? rawValue.trim() : fallback

  // Remove trailing slashes and a trailing /api segment so route joins are stable.
  return value.replace(/\/+$/, '').replace(/\/api$/i, '')
}

export const API_BASE_URL = normalizeApiBase(import.meta.env.VITE_API_URL)
export const SOCKET_BASE_URL = normalizeApiBase(import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL)

export function apiUrl(path) {
  const rawPath = typeof path === 'string' ? path.trim() : ''
  const prefixedPath = rawPath.startsWith('/') ? rawPath : `/${rawPath}`
  const withApiPrefix = prefixedPath.startsWith('/api/') ? prefixedPath : `/api${prefixedPath}`
  return `${API_BASE_URL}${withApiPrefix}`
}