import React, { useEffect, useState } from 'react'

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault()
      setDeferredPrompt(event)
      setVisible(true)
    }

    const handleAppInstalled = () => {
      setDeferredPrompt(null)
      setVisible(false)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) {
      return
    }

    deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
    setVisible(false)
  }

  if (!visible) {
    return null
  }

  return (
    <button
      type="button"
      onClick={handleInstall}
      className="fixed bottom-5 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-red-500 px-6 py-4 text-sm font-extrabold text-white shadow-2xl shadow-red-950/40 ring-2 ring-white/20 transition hover:bg-red-400 hover:scale-[1.02] active:scale-[0.98]"
    >
      Install Rescue App for Offline Use
    </button>
  )
}