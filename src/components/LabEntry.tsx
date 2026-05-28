import React from 'react'
import type { Entry } from '../types'
import { FLAG_CONFIG } from '../data/reportData'

interface LabEntryProps {
  entry: Entry
  active: boolean
  onActivate: (id: string, rawText: string) => void
  onInfo: (entry: Entry, buttonEl: HTMLButtonElement) => void
}

// Row is a <div> so we can nest two semantic buttons:
//  1. lab-row__main  → opens the AI panel (Explicar)
//  2. lab-info-btn   → opens the native popover with raw clinical data (no AI)
export default function LabEntry({ entry, active, onActivate, onInfo }: LabEntryProps) {
  const flag = FLAG_CONFIG[entry.flag as keyof typeof FLAG_CONFIG]

  return (
    <div className={`lab-row ${active ? 'lab-row--active' : ''}`} role="listitem">
      {/* Main clickable area – opens AI panel */}
      <button
        className="lab-row__main"
        onClick={() => onActivate(entry.id, entry.raw)}
        aria-pressed={active}
        aria-label={`Explicar ${entry.term} con IA`}
      >
        <span className="lab-term">{entry.term}</span>
        <span className={`lab-flag ${flag.cls}`}>{flag.label}</span>
        <span className="lab-value">
          {entry.value}
          <span className="lab-ref">(ref: {entry.ref})</span>
        </span>
        <span className="lab-cta" aria-hidden="true">Explicar →</span>
      </button>

      {/* ℹ button – passes itself so the parent can position the popover
          via getBoundingClientRect() without CSS Anchor Positioning */}
      <button
        className="lab-info-btn"
        onClick={(e) => onInfo(entry, e.currentTarget)}
        aria-label={`Datos clínicos de ${entry.term} sin IA`}
        aria-haspopup="dialog"
      >
        ℹ
      </button>
    </div>
  )
}
