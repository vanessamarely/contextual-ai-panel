import React from 'react'
import type { PanelTab, Entry, ChatMsg } from '../types'
import { FLAG_CONFIG, TAB_CONFIG } from '../data/reportData'
import StreamBlock from './StreamBlock'

interface AiPanelProps {
  open: boolean
  activeEntry: Entry | null
  activeTab: PanelTab
  modelStatus: string
  isDownloading: boolean
  downloadProgress: number
  usingNative: boolean
  // Tab content
  summaryText: string
  summaryStreaming: boolean
  faqText: string
  faqStreaming: boolean
  actionsText: string
  actionsStreaming: boolean
  // Chat tab
  chatMessages: ChatMsg[]
  chatInput: string
  chatStreaming: boolean
  chatBottomRef: React.RefObject<HTMLDivElement>
  // Handlers
  onClose: () => void
  onSwitchTab: (tab: PanelTab) => void
  onChatInputChange: (value: string) => void
  onSendChatMessage: () => void
}

export default function AiPanel({
  open,
  activeEntry,
  activeTab,
  modelStatus,
  isDownloading,
  downloadProgress,
  usingNative,
  summaryText, summaryStreaming,
  faqText, faqStreaming,
  actionsText, actionsStreaming,
  chatMessages, chatInput, chatStreaming, chatBottomRef,
  onClose, onSwitchTab, onChatInputChange, onSendChatMessage,
}: AiPanelProps) {
  const entryFlag = activeEntry
    ? FLAG_CONFIG[activeEntry.flag as keyof typeof FLAG_CONFIG]
    : null

  return (
    <aside
      className={`med-ai-panel ${open ? 'med-ai-panel--open' : ''}`}
      aria-label="Panel de ayuda contextual con IA"
      aria-live="polite"
      role="complementary"
    >
      {/* ── Empty state (panel is off-screen) ─────────────────────────────── */}
      {!open && (
        <div className="med-ai-panel__empty">
          <div className="med-ai-panel__empty-icon" aria-hidden="true">✦</div>
          <p>
            Selecciona cualquier resultado del informe para recibir Resumen, Preguntas frecuentes
            y Plan de Acción generados localmente con IA.
          </p>
          <div className="med-ai-panel__privacy">🔒 Datos procesados on-device · HIPAA-Friendly</div>
        </div>
      )}

      {/* ── Active panel content ───────────────────────────────────────────── */}
      {open && (
        <>
          {/* Header */}
          <div className="med-ai-panel__header">
            <div>
              <div className="med-ai-panel__title">
                {activeEntry?.term ?? 'Explicación'}
                {entryFlag && (
                  <span className={`flag-badge ${entryFlag.cls}`}>{entryFlag.label}</span>
                )}
              </div>
              <div className="med-ai-panel__subtitle">{modelStatus}</div>
            </div>
            <button className="med-ai-panel__close" onClick={onClose} aria-label="Cerrar panel">
              ✕
            </button>
          </div>

          {/* Model download progress */}
          {isDownloading && (
            <div className="med-ai-panel__progress">
              <div className="progress-label">Cargando Gemini Nano… {downloadProgress}%</div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${downloadProgress}%` }} />
              </div>
            </div>
          )}

          {/* Tab bar */}
          <div className="panel-tabs" role="tablist" aria-label="Vistas de análisis">
            {TAB_CONFIG.map(({ id, icon, label }) => (
              <button
                key={id}
                className={`panel-tab ${activeTab === id ? 'panel-tab--active' : ''}`}
                role="tab"
                aria-selected={activeTab === id}
                onClick={() => onSwitchTab(id)}
              >
                <span aria-hidden="true">{icon}</span>
                {label}
              </button>
            ))}
          </div>

          {/* Tab body */}
          <div
            className="med-ai-panel__body"
            style={{ viewTransitionName: 'panel-content' } as React.CSSProperties}
            role="tabpanel"
          >
            {activeTab === 'summary' && (
              <StreamBlock text={summaryText} streaming={summaryStreaming} />
            )}
            {activeTab === 'faq' && (
              <StreamBlock text={faqText} streaming={faqStreaming} />
            )}
            {activeTab === 'actions' && (
              <StreamBlock text={actionsText} streaming={actionsStreaming} />
            )}
            {activeTab === 'chat' && (
              <div className="panel-chat">
                <div className="panel-chat__messages">
                  {chatMessages.length === 0 && (
                    <p className="panel-chat__empty">
                      Haz cualquier pregunta sobre <strong>{activeEntry?.term}</strong>…
                    </p>
                  )}
                  {chatMessages.map((m, i) => (
                    <div key={i} className={`panel-chat__msg panel-chat__msg--${m.role}`}>
                      {m.text}
                      {chatStreaming &&
                        i === chatMessages.length - 1 &&
                        m.role === 'assistant' && (
                          <span className="stream-cursor" aria-hidden="true" />
                        )}
                    </div>
                  ))}
                  <div ref={chatBottomRef} />
                </div>

                <form
                  className="panel-chat__form"
                  onSubmit={(e) => {
                    e.preventDefault()
                    void onSendChatMessage()
                  }}
                >
                  <input
                    className="panel-chat__input"
                    value={chatInput}
                    onChange={(e) => onChatInputChange(e.target.value)}
                    placeholder={`Pregunta sobre ${activeEntry?.term ?? 'este resultado'}…`}
                    disabled={chatStreaming}
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="panel-chat__send"
                    disabled={chatStreaming || !chatInput.trim()}
                    aria-label="Enviar pregunta"
                  >
                    {chatStreaming ? '⏳' : '→'}
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Privacy footer (hidden on chat tab — the send form is already at the bottom) */}
          {activeTab !== 'chat' && (
            <div className="panel-privacy-footer">
              <span aria-hidden="true">🔒</span>
              {usingNative
                ? 'Gemini Nano · on-device · 0 llamadas de red'
                : 'Simulador local · 0 llamadas de red'}
            </div>
          )}
        </>
      )}
    </aside>
  )
}
