import React, { useEffect, useRef, useState } from 'react'
import { createPortal, flushSync } from 'react-dom'
import { useBuiltInAi } from './hooks/useBuiltInAi'
import { REPORT_SECTIONS } from './data/reportData'
import type { PanelTab, Entry, ChatMsg } from './types'
import LabEntry from './components/LabEntry'
import AiPanel from './components/AiPanel'
import InfoPopover from './components/InfoPopover'
import PresenterSandbox from './components/PresenterSandbox'

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  // Section / entry navigation
  const [activeSection,  setActiveSection]  = useState(REPORT_SECTIONS[0].id)
  const [activeEntryId,  setActiveEntryId]  = useState<string | null>(null)
  const [panelOpen,      setPanelOpen]      = useState(false)

  // AI panel tab state
  const [activeTab,        setActiveTab]        = useState<PanelTab>('summary')
  const [summaryText,      setSummaryText]      = useState('')
  const [summaryStreaming, setSummaryStreaming] = useState(false)
  const [faqText,          setFaqText]          = useState('')
  const [faqStreaming,     setFaqStreaming]      = useState(false)
  const [actionsText,      setActionsText]      = useState('')
  const [actionsStreaming, setActionsStreaming] = useState(false)

  // Prevent double-fetching per tab (refs survive re-renders without triggering effects)
  const faqLoadingRef     = useRef(false)
  const actionsLoadingRef = useRef(false)

  // Chat (follow-up questions via LanguageModel)
  const [chatMessages,  setChatMessages]  = useState<ChatMsg[]>([])
  const [chatInput,     setChatInput]     = useState('')
  const [chatStreaming, setChatStreaming]  = useState(false)
  const chatBottomRef = useRef<HTMLDivElement>(null)

  // Info popover – Popover API, positioned via getBoundingClientRect
  const [popoverEntry, setPopoverEntry] = useState<Entry | null>(null)
  const infoPopoverRef = useRef<HTMLDivElement>(null)

  // React 18.2 does not forward the `popover` attribute — set it imperatively.
  useEffect(() => {
    infoPopoverRef.current?.setAttribute('popover', 'auto')
  }, [])

  // Mobile sidebar toggle
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Light/dark theme toggle
  const [lightMode, setLightMode] = useState(false)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', lightMode ? 'light' : 'dark')
  }, [lightMode])

  // Presenter sandbox controls
  const [simulatorMode, setSimulatorMode] = useState(true)
  const [forceError,    setForceError]    = useState(false)

  const {
    downloadProgress, simulateDownload, isDownloading,
    isAvailable, startSummarize, startPrompt,
  } = useBuiltInAi()

  const currentSection = REPORT_SECTIONS.find((s) => s.id === activeSection)!
  const activeEntry    = currentSection.entries.find((e) => e.id === activeEntryId) ?? null
  const useSimulator   = simulatorMode || !isAvailable
  const usingNative    = !useSimulator
  const modelStatus    =
    isAvailable === null ? 'Detectando…'
    : usingNative        ? 'Gemini Nano · Local'
    :                      'Modo Simulador'

  // Close panel on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && panelOpen) closePanel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [panelOpen])

  // Reset per-tab loading guards and chat history whenever the active entry changes
  useEffect(() => {
    faqLoadingRef.current     = false
    actionsLoadingRef.current = false
    setChatMessages([])
    setChatInput('')
  }, [activeEntryId])

  // ── Close panel (with View Transition) ───────────────────────────────────
  function closePanel() {
    const doClose = () => {
      setPanelOpen(false)
      setActiveEntryId(null)
      setSummaryText(''); setFaqText(''); setActionsText('')
      setActiveTab('summary')
    }
    if ((document as any).startViewTransition) {
      ;(document as any).startViewTransition(doClose)
    } else {
      doClose()
    }
  }

  // ── Activate entry: open panel + stream Summarizer API ───────────────────
  async function handleActivate(id: string, rawText: string) {
    // Reset all tab content for the new entry
    setActiveEntryId(id)
    setSummaryText(''); setFaqText(''); setActionsText('')
    setActiveTab('summary')
    faqLoadingRef.current = false; actionsLoadingRef.current = false

    // Open the panel with a View Transition (page cross-fade)
    if ((document as any).startViewTransition) {
      ;(document as any).startViewTransition(() => setPanelOpen(true))
    } else {
      setPanelOpen(true)
    }

    // ── Summarizer API: generate a brief summary ───────────────────────────
    setSummaryStreaming(true)
    try {
      for await (const chunk of startSummarize(rawText, { simulator: useSimulator, forceError })) {
        setSummaryText((s) => s + chunk.text)
      }
    } catch (err) {
      setSummaryText('⚠ ' + (err as Error).message)
    }
    setSummaryStreaming(false)
  }

  // ── Switch tab with View Transition ──────────────────────────────────────
  // view-transition-name="panel-content" on the body div enables a targeted
  // cross-fade animation between tab panels without a full-page snapshot.
  function switchTab(tab: PanelTab) {
    if (tab === activeTab) return
    if ((document as any).startViewTransition) {
      ;(document as any).startViewTransition(() => setActiveTab(tab))
    } else {
      setActiveTab(tab)
    }
    if (tab === 'faq')     void loadFaq()
    if (tab === 'actions') void loadActions()
  }

  // ── Lazy FAQ: LanguageModel (Prompt API) ──────────────────────────────────
  async function loadFaq() {
    if (faqLoadingRef.current || faqText || !activeEntry) return
    faqLoadingRef.current = true
    setFaqStreaming(true)
    try {
      for await (const chunk of startPrompt(
        `Resultado médico: "${activeEntry.raw}"\n\nGenera 3 preguntas frecuentes que los pacientes hacen sobre este resultado con respuestas breves en lenguaje cotidiano. Formato:\n❓ [Pregunta]\n💬 [Respuesta en 1-2 oraciones]\n\n(repite el patrón para las 3 preguntas)`,
        { simulator: useSimulator }
      )) {
        setFaqText((s) => s + chunk.text)
      }
    } catch (err) {
      setFaqText('⚠ ' + (err as Error).message)
    }
    setFaqStreaming(false)
  }

  // ── Lazy Actions: LanguageModel (Prompt API) ──────────────────────────────
  async function loadActions() {
    if (actionsLoadingRef.current || actionsText || !activeEntry) return
    actionsLoadingRef.current = true
    setActionsStreaming(true)
    try {
      for await (const chunk of startPrompt(
        `Resultado médico: "${activeEntry.raw}"\n\nGenera 3 sugerencias accionables concretas para el paciente en lenguaje cotidiano. Formato:\n✓ [Verbo de acción] [qué hacer] — [beneficio en 1 oración]`,
        { simulator: useSimulator }
      )) {
        setActionsText((s) => s + chunk.text)
      }
    } catch (err) {
      setActionsText('⚠ ' + (err as Error).message)
    }
    setActionsStreaming(false)
  }

  // ── Chat: follow-up questions using LanguageModel ─────────────────────────
  // Each turn builds a context string with the medical entry + full history so
  // the model always knows what was said before. Works with both native and sim.
  async function sendChatMessage() {
    if (!chatInput.trim() || chatStreaming || !activeEntry) return
    const userMsg = chatInput.trim()
    setChatInput('')

    const history: ChatMsg[] = [...chatMessages, { role: 'user', text: userMsg }]
    setChatMessages(history)
    setChatStreaming(true)

    // Scroll to bottom after state settles
    setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)

    const prevTurns = chatMessages
      .map((m) => `${m.role === 'user' ? 'Paciente' : 'Asistente'}: ${m.text}`)
      .join('\n')

    const prompt = [
      `Resultado médico del paciente: "${activeEntry.raw}"`,
      prevTurns ? `\nHistorial de la conversación:\n${prevTurns}` : '',
      `\nNueva pregunta: "${userMsg}"`,
      '\nResponde en español, máximo 3 oraciones claras, sin alarmismos:',
    ]
      .filter(Boolean)
      .join('')

    let assistantText = ''
    try {
      for await (const chunk of startPrompt(prompt, { simulator: useSimulator })) {
        assistantText += chunk.text
        setChatMessages([...history, { role: 'assistant', text: assistantText }])
        chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      }
    } catch (err) {
      setChatMessages([...history, { role: 'assistant', text: '⚠ ' + (err as Error).message }])
    }
    setChatStreaming(false)
  }

  // ── Info Popover: Popover API positioned with getBoundingClientRect ─────────
  // CSS Anchor Positioning is still too experimental to rely on.
  // Instead we read the button's screen coordinates and set top/left directly.
  // flushSync ensures React renders the content BEFORE showPopover() is called.
  function openInfoPopover(entry: Entry, buttonEl: HTMLButtonElement) {
    const el = infoPopoverRef.current
    if (!el) return

    // 1. Update content synchronously so the popover isn't empty on open
    flushSync(() => setPopoverEntry(entry))

    // 2. Position next to the ℹ button
    const rect = buttonEl.getBoundingClientRect()
    const popoverWidth = 310
    const margin = 10
    const fitsRight = rect.right + margin + popoverWidth <= window.innerWidth
    el.style.top  = `${Math.max(8, rect.top - 40)}px`
    el.style.left = fitsRight
      ? `${rect.right + margin}px`
      : `${Math.max(8, rect.left - popoverWidth - margin)}px`

    // 3. Show in top layer (no z-index battles)
    el.showPopover()
  }

  return (
    <div className="med-shell">
      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <header className="med-topbar" role="banner">
        <div className="med-topbar__brand">
          <button
            className="menu-toggle"
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label={sidebarOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={sidebarOpen}
          >
            <span className={`menu-toggle__bar ${sidebarOpen ? 'menu-toggle__bar--open' : ''}`} />
          </button>
          <span className="med-topbar__logo" aria-hidden="true">✦</span>
          <span>
            <span className="med-topbar__name">SaludVista</span>
            <span className="med-topbar__sub">Portal Médico · HIPAA-Friendly</span>
          </span>
        </div>
        <div className="med-topbar__right">
          <span className="ai-status-pill">
            <span className={`ai-dot ${isAvailable ? 'ai-dot--live' : 'ai-dot--sim'}`} />
            {modelStatus}
          </span>
          <span className="privacy-badge">🔒 Inferencia local · 0 red</span>
          <button
            className="theme-toggle"
            onClick={() => setLightMode((v) => !v)}
            aria-label={lightMode ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
            title={lightMode ? 'Modo oscuro' : 'Modo claro'}
          >
            {lightMode ? '🌙 Oscuro' : '☀️ Claro'}
          </button>
        </div>
      </header>

      <div className="med-layout">
        {/* ── Mobile overlay ───────────────────────────────────────────── */}
        {sidebarOpen && (
          <div
            className="sidebar-overlay"
            aria-hidden="true"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* ── Left sidebar ─────────────────────────────────────────────── */}
        <aside
          className={`med-sidebar ${sidebarOpen ? 'med-sidebar--open' : ''}`}
          aria-label="Navegación del informe"
        >
          <div className="med-patient-card">
            <div className="med-patient-card__avatar" aria-hidden="true">MG</div>
            <div>
              <div className="med-patient-card__name">María García</div>
              <div className="med-patient-card__meta">ID: #4891-B · 47 años</div>
            </div>
          </div>

          <nav>
            <div className="med-nav-label">Secciones del Informe</div>
            {REPORT_SECTIONS.map((s) => (
              <button
                key={s.id}
                className={`med-nav-item ${activeSection === s.id ? 'med-nav-item--active' : ''}`}
                onClick={() => {
                  setActiveSection(s.id)
                  setActiveEntryId(null)
                  setPanelOpen(false)
                  setSummaryText(''); setFaqText(''); setActionsText('')
                  setActiveTab('summary')
                  setSidebarOpen(false)
                }}
              >
                {s.label}
              </button>
            ))}
          </nav>

          <div className="med-sidebar__info">
            <p>
              <strong>Cómo usar:</strong> Haz clic en un resultado para análisis IA en 3 vistas
              (Resumen · Preguntas · Plan). Usa <strong>ℹ</strong> para ver los datos clínicos sin IA.
            </p>
          </div>
        </aside>

        {/* ── Main content: lab table ───────────────────────────────────── */}
        <main className="med-main" aria-label="Informe médico">
          <div className="med-report-header">
            <h1 className="med-report-title">{currentSection.label}</h1>
            <span className="med-report-date">Informe del 27 may 2026</span>
          </div>

          <div className="lab-table" role="list" aria-label="Resultados de laboratorio">
            <div className="lab-table__head" aria-hidden="true">
              <div className="lab-table__head-main">
                <span>Parámetro</span>
                <span>Estado</span>
                <span>Valor · Referencia</span>
                <span>IA</span>
              </div>
              <span className="lab-table__head-info" title="Datos clínicos">ℹ</span>
            </div>

            {currentSection.entries.map((entry) => (
              <LabEntry
                key={entry.id}
                entry={entry}
                active={activeEntryId === entry.id}
                onActivate={handleActivate}
                onInfo={openInfoPopover}
              />
            ))}
          </div>

          <div className="med-disclaimer">
            <span aria-hidden="true">ℹ</span>
            Esta explicación es orientativa. Consulta siempre con tu médico antes de tomar decisiones
            clínicas. Los datos procesados nunca salen de tu dispositivo.
          </div>
        </main>

        {/* ── AI Panel ─────────────────────────────────────────────────── */}
        <AiPanel
          open={panelOpen}
          activeEntry={activeEntry}
          activeTab={activeTab}
          modelStatus={modelStatus}
          isDownloading={isDownloading}
          downloadProgress={downloadProgress}
          usingNative={usingNative}
          summaryText={summaryText}
          summaryStreaming={summaryStreaming}
          faqText={faqText}
          faqStreaming={faqStreaming}
          actionsText={actionsText}
          actionsStreaming={actionsStreaming}
          chatMessages={chatMessages}
          chatInput={chatInput}
          chatStreaming={chatStreaming}
          chatBottomRef={chatBottomRef}
          onClose={closePanel}
          onSwitchTab={switchTab}
          onChatInputChange={setChatInput}
          onSendChatMessage={sendChatMessage}
        />
      </div>

      {/* ── Info Popover (native top-layer, positioned via JS) ────────────── */}
      <InfoPopover ref={infoPopoverRef} entry={popoverEntry} />

      {/* ── Presenter Sandbox ─────────────────────────────────────────────── */}
      {createPortal(
        <PresenterSandbox
          simulatorMode={simulatorMode}
          setSimulatorMode={setSimulatorMode}
          forceError={forceError}
          setForceError={setForceError}
          downloadProgress={downloadProgress}
          isDownloading={isDownloading}
          onSimulateDownload={() => simulateDownload(4500)}
          isAvailable={isAvailable}
        />,
        document.body
      )}
    </div>
  )
}
