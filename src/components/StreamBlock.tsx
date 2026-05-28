import React from 'react'
import { sanitize } from '../utils/sanitize'

interface StreamBlockProps {
  text: string
  streaming: boolean
}

// Renders a skeleton shimmer while streaming, then the sanitized AI output.
export default function StreamBlock({ text, streaming }: StreamBlockProps) {
  return (
    <div className="stream-block">
      {streaming && !text && (
        <div className="stream-skeleton" role="status" aria-label="Generando…">
          <div className="skel-bar" style={{ width: '85%' }} />
          <div className="skel-bar" style={{ width: '60%' }} />
          <div className="skel-bar" style={{ width: '92%' }} />
          <div className="skel-bar" style={{ width: '70%' }} />
        </div>
      )}
      {text && (
        <div
          className="med-ai-panel__output"
          // sanitize() strips <script> and on* attributes before innerHTML injection
          dangerouslySetInnerHTML={{
            __html: sanitize(text.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br/>')),
          }}
        />
      )}
      {streaming && text && <span className="stream-cursor" aria-hidden="true" />}
    </div>
  )
}
