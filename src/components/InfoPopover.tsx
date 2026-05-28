import React from 'react'
import type { Entry } from '../types'
import { FLAG_CONFIG } from '../data/reportData'

interface InfoPopoverProps {
  entry: Entry | null
}

// Rendered inside a native popover (popover="auto") for zero z-index battles.
// The ref is forwarded so App can call el.showPopover() and set positioning.
// React 18.2 does NOT forward the `popover` JSX attribute to the DOM —
// the parent sets it imperatively via setAttribute in a useEffect.
const InfoPopover = React.forwardRef<HTMLDivElement, InfoPopoverProps>(({ entry }, ref) => (
  <div
    ref={ref}
    id="lab-info-popover"
    className="lab-info-popover"
    aria-label="Datos clínicos del resultado"
  >
    {entry && (
      <div className="lab-info-popover__inner">
        <div className="lab-info-popover__header">
          <span className="lab-info-popover__term">{entry.term}</span>
          <span className={`lab-flag ${FLAG_CONFIG[entry.flag as keyof typeof FLAG_CONFIG]?.cls}`}>
            {FLAG_CONFIG[entry.flag as keyof typeof FLAG_CONFIG]?.label}
          </span>
        </div>
        <div className="lab-info-popover__value">
          <strong>{entry.value}</strong>
          <span className="lab-info-popover__ref">Referencia: {entry.ref}</span>
        </div>
        <p className="lab-info-popover__raw">{entry.raw}</p>
        <div className="lab-info-popover__note">
          ℹ Datos clínicos brutos · No es una interpretación de IA
        </div>
      </div>
    )}
  </div>
))

InfoPopover.displayName = 'InfoPopover'
export default InfoPopover
