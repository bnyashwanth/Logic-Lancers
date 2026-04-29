import React, { useMemo, useState } from 'react'
import axios from 'axios'
import { apiUrl } from '../config/api'

const QUICK_PROMPTS = [
  'What should I bring?',
  'How to treat shock?',
  'How do we prioritize incidents right now?',
]

export default function ChatDrawer({ isOpen, onClose, context }) {
  const [message, setMessage] = useState('')
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const normalizedContext = useMemo(() => {
    return {
      appName: 'RescueSync',
      currentPage: context?.currentPage || '',
      user: context?.user || {},
      incidents: context?.incidents || [],
    }
  }, [context])

  if (!isOpen) return null

  const sendMessage = async (text) => {
    const trimmed = String(text || '').trim()
    if (!trimmed) return
    setError('')
    setLoading(true)

    const nextHistory = [...history, { role: 'user', content: trimmed }]
    setHistory(nextHistory)
    setMessage('')

    try {
      const response = await axios.post(apiUrl('/chat'), {
        message: trimmed,
        history: nextHistory.slice(-12),
        context: normalizedContext,
      })

      const reply = response.data?.reply || ''
      setHistory((current) => [...current, { role: 'assistant', content: reply }])
    } catch (e) {
      setError(e.response?.data?.msg || 'Chat unavailable.')
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = (e) => {
    e.preventDefault()
    sendMessage(message)
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />

      <aside className="absolute right-0 top-0 h-full w-full max-w-md bg-slate-950 text-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-red-400">RescueSync</p>
            <h2 className="mt-1 text-xl font-bold">Coordinator Chat</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 px-3 py-1 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
          >
            Close
          </button>
        </header>

        <div className="flex h-[calc(100%-64px)] flex-col">
          <div className="flex flex-wrap gap-2 border-b border-white/10 px-5 py-3">
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => sendMessage(prompt)}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
              >
                {prompt}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            {history.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-slate-300">
                Ask for guidance (triage, supplies, treatment steps). This chat is context-aware of active incidents.
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((item, idx) => (
                  <div
                    key={`${item.role}-${idx}`}
                    className={`rounded-2xl px-4 py-3 text-sm ${
                      item.role === 'assistant' ? 'bg-white/5 text-slate-100' : 'bg-red-500/15 text-white'
                    }`}
                  >
                    {item.content}
                  </div>
                ))}
              </div>
            )}
          </div>

          <form onSubmit={onSubmit} className="border-t border-white/10 px-5 py-4">
            {error ? <p className="mb-2 text-sm text-red-300">{error}</p> : null}
            <div className="flex gap-2">
              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message…"
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-red-400"
              />
              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? '…' : 'Send'}
              </button>
            </div>
          </form>
        </div>
      </aside>
    </div>
  )
}

