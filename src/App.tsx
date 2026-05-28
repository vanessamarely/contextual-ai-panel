import React, { useEffect, useRef, useState } from 'react'
import { createPortal, flushSync } from 'react-dom'
import { useBuiltInAi } from './hooks/useBuiltInAi'
import { sanitize } from './utils/sanitize'

// ─── Report data ──────────────────────────────────────────────────────────────
const REPORT_SECTIONS = [
  {
    id: 'labs',
    label: 'Resultados de Laboratorio',
    entries: [
      {
        id: 'tsh',
        term: 'TSH',
        value: '4.5 mIU/L',
        ref: '0.5 – 4.0 mIU/L',
        flag: 'high',
        raw: 'TSH 4.5 mIU/L (ref 0.5–4.0 mIU/L). Indica función tiroidea potencialmente disminuida. Requiere correlación clínica y posible seguimiento con T4 libre.',
      },
      {
        id: 'hba1c',
        term: 'HbA1c',
        value: '6.8 %',
        ref: '< 5.7 %',
        flag: 'high',
        raw: 'HbA1c 6.8% (ref <5.7%). Valores entre 5.7–6.4% indican prediabetes; ≥6.5% es criterio diagnóstico de diabetes tipo 2. Se recomienda evaluación por endocrinología.',
      },
      {
        id: 'ldl',
        term: 'LDL Colesterol',
        value: '142 mg/dL',
        ref: '< 100 mg/dL',
        flag: 'high',
        raw: 'LDL 142 mg/dL (ref <100 mg/dL). Colesterol LDL elevado. Aumenta riesgo cardiovascular. Considerar cambios de estilo de vida y posible terapia farmacológica.',
      },
      {
        id: 'creatinine',
        term: 'Creatinina',
        value: '0.9 mg/dL',
        ref: '0.6 – 1.2 mg/dL',
        flag: 'normal',
        raw: 'Creatinina 0.9 mg/dL (ref 0.6–1.2 mg/dL). Dentro del rango normal. Indica función renal adecuada para la filtración de desechos metabólicos.',
      },
    ],
  },
  {
    id: 'meds',
    label: 'Prescripciones',
    entries: [
      {
        id: 'metformin',
        term: 'Metformina 850 mg',
        value: '2×/día',
        ref: 'Con alimentos',
        flag: 'info',
        raw: 'Metformina 850mg c/12h con alimentos. Biguanida de primera línea para diabetes tipo 2. Reduce gluconeogénesis hepática. Contraindicada en insuficiencia renal severa (TFG<30).',
      },
      {
        id: 'levothyroxine',
        term: 'Levotiroxina 50 mcg',
        value: '1×/día',
        ref: 'Ayunas, 30 min antes de comer',
        flag: 'info',
        raw: 'Levotiroxina 50mcg cada mañana en ayunas. Hormona tiroidea sintética para hipotiroidismo. Evitar con calcio, hierro o antiácidos dentro de 4h. Verificar TSH en 6–8 semanas.',
      },
    ],
  },
  {
    id: 'imaging',
    label: 'Imagen Diagnóstica',
    entries: [
      {
        id: 'echo',
        term: 'Ecocardiograma',
        value: 'FE 58%',
        ref: 'Normal ≥ 55%',
        flag: 'normal',
        raw: 'Fracción de Eyección (FE) 58%. Función sistólica del ventrículo izquierdo conservada. No se evidencian alteraciones valvulares significativas. Seguimiento rutinario anual recomendado.',
      },
      {
        id: 'thyroid-us',
        term: 'Ecografía Tiroidea',
        value: 'Nódulo 6 mm',
        ref: 'TIRADS 2',
        flag: 'warning',
        raw: 'Nódulo tiroideo derecho de 6mm, TIRADS 2 (benigno). Características benignas. Sin vascularización anormal. Seguimiento ecográfico en 12 meses según guías ACR.',
      },
    ],
  },
]

const FLAG_CONFIG = {
  high:    { label: '↑ Alto',     cls: 'flag-high'    },
  low:     { label: '↓ Bajo',     cls: 'flag-low'     },
  normal:  { label: '✓ Normal',   cls: 'flag-normal'  },
  warning: { label: '⚠ Atención', cls: 'flag-warning' },
  info:    { label: 'ℹ Info',     cls: 'flag-info'    },
}

// ─── Types ────────────────────────────────────────────────────────────────────
type PanelTab  = 'summary' | 'faq' | 'actions' | 'chat'
type Entry     = (typeof REPORT_SECTIONS)[0]['entries'][0]
type ChatMsg   = { role: 'user' | 'assistant'; text: string }

const TAB_CONFIG: { id: PanelTab; icon: string; label: string }[] = [
  { id: 'summary', icon: '✦', label: 'Resumen'        },
  { id: 'faq',     icon: '❓', label: 'Preguntas'      },
  { id: 'actions', icon: '✓', label: 'Plan de Acción'  },
  { id: 'chat',    icon: '💬', label: 'Preguntar'       },
]

// ─── LabEntry ─────────────────────────────────────────────────────────────────
// Row is a <div> so we can nest two semantic buttons:
//  1. lab-row__main  → opens the AI panel (Explicar)
//  2. lab-info-btn   → opens the CSS-anchor-positioned popover (raw data, no AI)
function LabEntry({
  entry,
  active,
  onActivate,
  onInfo,
}: {
  entry: Entry
  active: boolean
  onActivate: (id: string, text: string) => void
  onInfo: (entry: Entry, buttonEl: HTMLButtonElement) => void
}) {
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

      {/* ℹ button – passes itself so openInfoPopover can position the popover via getBoundingClientRect */}
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

// ─── StreamBlock ──────────────────────────────────────────────────────────────
// Renders skeleton shimmer while streaming, then the final content.
function StreamBlock({ text, streaming }: { text: string; streaming: boolean }) {
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
          dangerouslySetInnerHTML={{ __html: sanitize(text.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br/>')) }}
        />
      )}
      {streaming && text && <span className="stream-cursor" aria-hidden="true" />}
    </div>
  )
}

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
  const modelStatus    =
    isAvailable === null ? 'Detectando…'
    : isAvailable        ? 'Gemini Nano · Local'
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
        </div>
      </header>

      <div className="med-layout">
        {/* ── Left sidebar ─────────────────────────────────────────────── */}
        <aside className="med-sidebar" aria-label="Navegación del informe">
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
            {/* Header row mirrors the row flex layout */}
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

        {/* ── AI Panel: absolute overlay, slides in from the right ─────── */}
        <aside
          className={`med-ai-panel ${panelOpen ? 'med-ai-panel--open' : ''}`}
          aria-label="Panel de ayuda contextual con IA"
          aria-live="polite"
          role="complementary"
        >
          {/* Empty state – visible only when panel is off-screen (transform: translateX(100%)) */}
          {!panelOpen && (
            <div className="med-ai-panel__empty">
              <div className="med-ai-panel__empty-icon" aria-hidden="true">✦</div>
              <p>
                Selecciona cualquier resultado del informe para recibir Resumen, Preguntas frecuentes
                y Plan de Acción generados localmente con IA.
              </p>
              <div className="med-ai-panel__privacy">🔒 Datos procesados on-device · HIPAA-Friendly</div>
            </div>
          )}

          {/* Active panel content */}
          {panelOpen && (
            <>
              {/* ── Header ────────────────────────────────────────────── */}
              <div className="med-ai-panel__header">
                <div>
                  <div className="med-ai-panel__title">
                    {activeEntry?.term ?? 'Explicación'}
                    {activeEntry?.flag && (
                      <span
                        className={`flag-badge ${
                          FLAG_CONFIG[activeEntry.flag as keyof typeof FLAG_CONFIG]?.cls
                        }`}
                      >
                        {FLAG_CONFIG[activeEntry.flag as keyof typeof FLAG_CONFIG]?.label}
                      </span>
                    )}
                  </div>
                  <div className="med-ai-panel__subtitle">{modelStatus}</div>
                </div>
                <button
                  className="med-ai-panel__close"
                  onClick={closePanel}
                  aria-label="Cerrar panel"
                >
                  ✕
                </button>
              </div>

              {/* ── Model download progress ────────────────────────────── */}
              {isDownloading && (
                <div className="med-ai-panel__progress">
                  <div className="progress-label">
                    Cargando Gemini Nano… {downloadProgress}%
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${downloadProgress}%` }} />
                  </div>
                </div>
              )}

              {/* ── Tabs: switch with startViewTransition ──────────────── */}
              <div className="panel-tabs" role="tablist" aria-label="Vistas de análisis">
                {TAB_CONFIG.map(({ id, icon, label }) => (
                  <button
                    key={id}
                    className={`panel-tab ${activeTab === id ? 'panel-tab--active' : ''}`}
                    role="tab"
                    aria-selected={activeTab === id}
                    onClick={() => switchTab(id)}
                  >
                    <span aria-hidden="true">{icon}</span>
                    {label}
                  </button>
                ))}
              </div>

              {/* ── Tab body: view-transition-name enables targeted cross-fade ── */}
              {/* Summarizer API → 'summary' tab                                   */}
              {/* LanguageModel (Prompt API) → 'faq', 'actions', and 'chat' tabs  */}
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
                        <div
                          key={i}
                          className={`panel-chat__msg panel-chat__msg--${m.role}`}
                        >
                          {m.text}
                          {chatStreaming && i === chatMessages.length - 1 && m.role === 'assistant' && (
                            <span className="stream-cursor" aria-hidden="true" />
                          )}
                        </div>
                      ))}
                      <div ref={chatBottomRef} />
                    </div>
                    <form
                      className="panel-chat__form"
                      onSubmit={(e) => { e.preventDefault(); void sendChatMessage() }}
                    >
                      <input
                        className="panel-chat__input"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
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

              {/* ── Privacy footer (hidden for chat tab — form is already at bottom) ── */}
              {activeTab !== 'chat' && (
                <div className="panel-privacy-footer">
                  <span aria-hidden="true">🔒</span>
                  Generado localmente · 0 llamadas de red · Sin almacenamiento de datos
                </div>
              )}
            </>
          )}
        </aside>
      </div>

      {/* ── Info Popover ──────────────────────────────────────────────────── */}
      {/* Native popover="auto" → renders in the top layer (no z-index needed) */}
      {/* CSS Anchor Positioning → position-anchor set via JS to --info-{id}   */}
      {/* @position-try fallbacks ensure it stays visible near viewport edges  */}
      {/* popover attribute set imperatively in useEffect (React 18.2 does not forward it) */}
      <div
        ref={infoPopoverRef}
        id="lab-info-popover"
        className="lab-info-popover"
        aria-label="Datos clínicos del resultado"
      >
        {popoverEntry && (
          <div className="lab-info-popover__inner">
            <div className="lab-info-popover__header">
              <span className="lab-info-popover__term">{popoverEntry.term}</span>
              <span
                className={`lab-flag ${
                  FLAG_CONFIG[popoverEntry.flag as keyof typeof FLAG_CONFIG]?.cls
                }`}
              >
                {FLAG_CONFIG[popoverEntry.flag as keyof typeof FLAG_CONFIG]?.label}
              </span>
            </div>
            <div className="lab-info-popover__value">
              <strong>{popoverEntry.value}</strong>
              <span className="lab-info-popover__ref">Referencia: {popoverEntry.ref}</span>
            </div>
            <p className="lab-info-popover__raw">{popoverEntry.raw}</p>
            <div className="lab-info-popover__note">
              ℹ Datos clínicos brutos · No es una interpretación de IA
            </div>
          </div>
        )}
      </div>

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

// ─── PresenterSandbox ────────────────────────────────────────────────────────
function PresenterSandbox({
  simulatorMode, setSimulatorMode,
  forceError,    setForceError,
  downloadProgress, isDownloading,
  onSimulateDownload, isAvailable,
}: {
  simulatorMode: boolean;   setSimulatorMode: (v: boolean) => void
  forceError: boolean;      setForceError: (v: boolean) => void
  downloadProgress: number; isDownloading: boolean
  onSimulateDownload: () => void
  isAvailable: boolean | null
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`presenter-sandbox ${open ? 'presenter-sandbox--open' : ''}`}>
      <button className="presenter-sandbox__toggle" onClick={() => setOpen((v) => !v)}>
        {open ? '▼ Ocultar sandbox' : '▲ Controles demo'}
      </button>
      {open && (
        <div className="presenter-sandbox__body">
          <label className="sandbox-ctrl">
            <input type="checkbox" checked={simulatorMode} onChange={() => setSimulatorMode(!simulatorMode)} />
            Modo Simulador (sin Gemini Nano)
          </label>
          <label className="sandbox-ctrl">
            <input type="checkbox" checked={forceError} onChange={() => setForceError(!forceError)} />
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
