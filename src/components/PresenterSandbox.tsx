import React, { useState } from 'react'

interface PresenterSandboxProps {
  simulatorMode: boolean
  setSimulatorMode: (v: boolean) => void
  forceError: boolean
  setForceError: (v: boolean) => void
  downloadProgress: number
  isDownloading: boolean
  onSimulateDownload: () => void
  isAvailable: boolean | null
}

// Demo control bar — fixed to the bottom of the viewport, rendered in a portal.
// Visible only during presentations to toggle simulator / error modes.
export default function PresenterSandbox({
  simulatorMode, setSimulatorMode,
  forceError, setForceError,
  downloadProgress, isDownloading,
  onSimulateDownload, isAvailable,
}: PresenterSandboxProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className={`presenter-sandbox ${open ? 'presenter-sandbox--open' : ''}`}>
      <button className="presenter-sandbox__toggle" onClick={() => setOpen((v) => !v)}>
        {open ? '▼ Ocultar sandbox' : '▲ Controles demo'}
      </button>

      {open && (
        <div className="presenter-sandbox__body">
          <label className="sandbox-ctrl">
            <input
              type="checkbox"
              checked={simulatorMode}
              onChange={() => setSimulatorMode(!simulatorMode)}
            />
            Modo Simulador (sin Gemini Nano)
          </label>
          <label className="sandbox-ctrl">
            <input
              type="checkbox"
              checked={forceError}
              onChange={() => setForceError(!forceError)}
            />
            Forzar error de API
          </label>
          <button className="sandbox-btn" onClick={onSimulateDownload}>
            Simular descarga del modelo ({downloadProgress}%)
          </button>
          <span className="sandbox-status">
            {isDownloading
              ? '⏳ Descargando…'
              : isAvailable === null
              ? '🔍 Detectando…'
              : isAvailable
              ? '✅ Gemini Nano disponible'
              : '🟡 Fallback simulador'}
          </span>
        </div>
      )}
    </div>
  )
}
