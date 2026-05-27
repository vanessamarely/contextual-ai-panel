import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowRight, Cpu } from 'lucide-react'
import { useBuiltInAi } from './hooks/useBuiltInAi'
import { sanitize } from './utils/sanitize'

function Paragraph({ text, index, onActivate, active }: { text: string; index: number; onActivate: (i: number, el: HTMLElement | null) => void; active: boolean }) {
  const ref = useRef<HTMLDivElement | null>(null)
  return (
    <div
      ref={ref}
      className={`doc-paragraph panel-glass glow-border anchor-wrap ${active ? 'ring-2 ring-cyan-glow/30' : ''}`}
      onClick={() => onActivate(index, ref.current)}
      role="article"
      aria-label={`paragraph-${index}`}
      dangerouslySetInnerHTML={{ __html: sanitize(text) }}
    />
  )
}

export default function App() {
  const examples = [
    {
      id: 'web',
      title: 'Web Components',
      paragraphs: [
        `Web Components ofrecen encapsulación mediante Shadow DOM, permitiendo estilos aislados y custom elements para extender HTML nativamente.`,
      ]
    },
    {
      id: 'anchor',
      title: 'CSS Anchor Positioning',
      paragraphs: [
        `CSS Anchor Positioning permite posicionar elementos UI declarativamente respecto a un anchor en el DOM usando anchor-name y position-anchor.`,
      ]
    },
    {
      id: 'transitions',
      title: 'View Transitions',
      paragraphs: [
        `View Transitions API facilita transiciones fluidas tipo morphing entre estados sin librerías externas.`,
      ]
    },
    {
      id: 'ai',
      title: 'Built-in AI',
      paragraphs: [
        `Las APIs de Built-in AI (Summarizer, LanguageModel) ofrecen inferencia local, con soporte para streaming y monitoreo de descarga.`,
      ]
    }
  ]

  const [selectedExample, setSelectedExample] = useState(examples[0].id)
  const displayedParagraphs = examples.find((e) => e.id === selectedExample)!.paragraphs

  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [smartPos, setSmartPos] = useState<{ top: number; left: number } | null>(null)
  const smartBtnRef = useRef<HTMLButtonElement | null>(null)
  const [aiPanelOpen, setAiPanelOpen] = useState(false)
  const [streamText, setStreamText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [promptOpen, setPromptOpen] = useState(false)
  const [promptValue, setPromptValue] = useState('')
  const [promptResponse, setPromptResponse] = useState('')

  const { downloadProgress, simulateDownload, isDownloading, isAvailable, startSummarize, startPrompt } = useBuiltInAi()

  // Presenter controls
  const [presenterSimulator, setPresenterSimulator] = useState(true)
  const [presenterOffline, setPresenterOffline] = useState(false)
  const [forceError, setForceError] = useState(false)

  useEffect(() => {
    if (activeIndex === null) setSmartPos(null)
  }, [activeIndex])

  // Global escape handler to close modals
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (promptOpen) setPromptOpen(false)
        if (aiPanelOpen) setAiPanelOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [promptOpen, aiPanelOpen])

  async function handleActivate(i: number, el: HTMLElement | null) {
    setActiveIndex(i)
    if (el) {
      const rect = el.getBoundingClientRect()
      setSmartPos({ top: rect.top + rect.height / 2 + window.scrollY, left: rect.right + 12 + window.scrollX })
    }
  }

  async function openAiFromActive() {
    if ((document as any).startViewTransition) {
      ;(document as any).startViewTransition(() => setAiPanelOpen(true))
    } else {
      setAiPanelOpen(true)
    }

    const t = displayedParagraphs[activeIndex ?? 0]
    setStreamText('')
    setIsStreaming(true)
    try {
          for await (const chunk of startSummarize(t, { simulator: presenterSimulator || !isAvailable, forceError })) {
        setStreamText((s) => s + chunk.text)
      }
    } catch (err) {
      setStreamText('Error inicializando modelo: ' + (err as Error).message)
    }
    setIsStreaming(false)
  }

  async function openPromptModal() {
    if ((document as any).startViewTransition) {
      ;(document as any).startViewTransition(() => setPromptOpen(true))
    } else {
      setPromptOpen(true)
    }
  }

  async function sendPrompt() {
    setPromptResponse('')
    setIsStreaming(true)
    try {
      for await (const chunk of (startPrompt as any)(promptValue, { simulator: presenterSimulator || !isAvailable })) {
        setPromptResponse((s) => s + chunk.text)
      }
    } catch (e) {
      setPromptResponse('Error: ' + (e as Error).message)
    }
    setIsStreaming(false)
  }

  return (
    <div className="app-grid grid-bg" style={{ position: 'relative' }}>
      <div style={{ gridColumn: '1 / 2' }}>
        <section className="panel-glass glow-border p-6" aria-labelledby="docs-title">
          <div className="panel-header">
            <h2 id="docs-title" className="lead-title">Especificación de Web Components y Shadow DOM</h2>
            <div className="muted-text">Demo accesible · Transitions · Summarizer</div>
          </div>
          <div>
              <div className="sidebar-list" role="navigation" aria-label="Ejemplos">
                {examples.map((ex) => (
                  <button key={ex.id} className="sidebar-item" aria-current={selectedExample === ex.id} onClick={() => { setSelectedExample(ex.id); setActiveIndex(null) }}>{ex.title}</button>
                ))}
              </div>
              <div style={{ marginTop: 16 }}>
                {displayedParagraphs.map((p, i) => (
                  <Paragraph key={i} text={p} index={i} onActivate={handleActivate} active={activeIndex === i} />
                ))}
              </div>
          </div>
        </section>
      </div>

      {/* AI panel rendered as top-layer dialog via portal */}
      {aiPanelOpen && createPortal(
          <div id="ai-panel" role="dialog" aria-label="AI Copilot Panel" className="panel-glass glow-border p-4" style={{ border: 'none', maxWidth: 520, width: '90%', right: 24, top: 24, position: 'fixed', zIndex:40 }}>
            <div className="panel-header">
              <h3 className="lead-title">AI Copilot</h3>
              <div className="muted-text" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Cpu size={16} /> <span>{isAvailable === null ? 'Probe...' : isAvailable ? 'Native' : 'Simulator'}</span>
              </div>
            </div>
            <div className="mt-4 max-h-[60vh] overflow-auto">
              {isStreaming ? (
                <div>
                  <div className="skeleton-stream" style={{ width: '80%', marginBottom: 12 }} />
                  <pre className="whitespace-pre-wrap" style={{ color: '#E6F4FF' }}>{streamText}</pre>
                </div>
              ) : (
                <div>
                  <pre className="whitespace-pre-wrap muted-text">{streamText || 'Haz click en el Smart Trigger para generar un resumen.'}</pre>
                </div>
              )}
            </div>
            <div className="mt-4">
              <div className="text-xs muted-text">Model download</div>
              <div className="w-full bg-[rgba(255,255,255,0.03)] rounded h-2 mt-2 overflow-hidden">
                <div className="h-2" style={{ width: `${downloadProgress}%`, background: 'linear-gradient(90deg,var(--accent-cyan),var(--accent-purple))' }} />
              </div>
            </div>
            <div className="mt-4 flex justify-between gap-2">
              <div>
                <button onClick={openPromptModal} className="px-3 py-1 accent-btn">Abrir Prompt</button>
              </div>
              <div>
                <button onClick={() => setAiPanelOpen(false)} className="px-3 py-1 rounded panel-glass">Cerrar</button>
              </div>
            </div>
          </div>, document.body)
      }

      <div style={{ gridColumn: '2 / 3' }}>
        <div className={`panel-glass glow-border p-4 h-full flex flex-col`} role="complementary" aria-label="Ejemplo seleccionado">
          <div className="panel-header">
            <h3 className="lead-title">{examples.find((e) => e.id === selectedExample)?.title}</h3>
            <div className="muted-text" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Cpu size={16} /> <span>{isAvailable === null ? 'Probe...' : isAvailable ? 'Native' : 'Simulator'}</span>
            </div>
          </div>
          <div className="mt-4 flex-1 overflow-auto">
            {isStreaming ? (
              <pre className="whitespace-pre-wrap" style={{ color: '#E6F4FF' }}>{streamText}</pre>
            ) : (
              <div>
                <pre className="whitespace-pre-wrap muted-text">{(activeIndex !== null ? displayedParagraphs[activeIndex] : displayedParagraphs.join('\n\n'))}</pre>
                <div className="mt-3 flex gap-2">
                  <button className="accent-btn" onClick={() => { if (activeIndex === null) setActiveIndex(0); openAiFromActive() }}>Generar resumen</button>
                  <button className="panel-glass px-3 py-1" onClick={() => { setStreamText(''); setIsStreaming(false) }}>Limpiar</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ gridColumn: '1 / 3' }}>
        <PresenterSandbox
          onSimulateDownload={() => simulateDownload(4500)}
          downloadProgress={downloadProgress}
          isDownloading={isDownloading}
          simulatorMode={presenterSimulator}
          setSimulatorMode={setPresenterSimulator}
          offline={presenterOffline}
          setOffline={setPresenterOffline}
          forceError={forceError}
          setForceError={setForceError}
        />
      </div>

      {/* Smart Trigger fallback button */}
      {smartPos && (
        <button
          ref={smartBtnRef}
          className="accent-btn rounded-full absolute"
          onClick={openAiFromActive}
          style={{ top: smartPos.top - 16, left: smartPos.left }}
          aria-haspopup="dialog"
          aria-controls="ai-panel"
        >
          <ArrowRight />
        </button>
      )}

      {/* Prompt Modal Portal */}
      {promptOpen && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 flex items-center justify-center"
          style={{ zIndex: 60 }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setPromptOpen(false)
          }}
        >
          <div className="absolute inset-0 bg-black/50" onClick={() => setPromptOpen(false)} />
          <div className="panel-glass glow-border p-6" style={{ width: 720, maxWidth: '92%', zIndex: 62 }}>
            <div className="panel-header">
              <h3 className="lead-title">Prompt</h3>
              <button onClick={() => setPromptOpen(false)} className="panel-glass px-2 py-1">Cerrar</button>
            </div>
            <textarea aria-label="Prompt input" value={promptValue} onChange={(e) => setPromptValue(e.target.value)} placeholder="Escribe tu prompt aquí..." rows={6} className="w-full p-3 rounded mt-2" />
            <div className="flex items-center gap-3 mt-3">
              <button onClick={sendPrompt} className="accent-btn">Enviar</button>
              <button onClick={() => { setPromptValue(''); setPromptResponse('') }} className="panel-glass px-3 py-1">Limpiar</button>
              <div className="muted-text">Streaming: {isStreaming ? 'Sí' : 'No'}</div>
            </div>
            <div className="mt-4 max-h-56 overflow-auto">
              <pre className="whitespace-pre-wrap muted-text">{promptResponse || 'Respuesta aparecerá aquí.'}</pre>
            </div>
          </div>
        </div>, document.body)}
    </div>
  )
}

function PresenterSandbox({ onSimulateDownload, downloadProgress, isDownloading, simulatorMode, setSimulatorMode, offline, setOffline, forceError, setForceError }: { onSimulateDownload: () => void; downloadProgress: number; isDownloading: boolean; simulatorMode: boolean; setSimulatorMode: (m: boolean) => void; offline: boolean; setOffline: (m: boolean) => void; forceError: boolean; setForceError: (m: boolean) => void }) {
  const [open, setOpen] = useState(true)

  return (
    <div className="panel-glass glow-border p-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <button className="px-3 py-1 panel-glass rounded" onClick={() => setOpen((s) => !s)}>{open ? 'Collapse' : 'Expand'}</button>
        <label className="flex items-center gap-2 text-sm muted-text">
          <input aria-label="Modo simulador" type="checkbox" checked={simulatorMode} onChange={() => setSimulatorMode(!simulatorMode)} /> Modo Simulador
        </label>
        <label className="flex items-center gap-2 text-sm muted-text">
          <input aria-label="Forzar offline" type="checkbox" checked={offline} onChange={() => setOffline(!offline)} /> Forzar Offline
        </label>
        <label className="flex items-center gap-2 text-sm muted-text">
          <input aria-label="Forzar error" type="checkbox" checked={forceError} onChange={() => setForceError(!forceError)} /> Forzar Error
        </label>
        <button className="accent-btn" onClick={onSimulateDownload}>Forzar descarga ({downloadProgress}%)</button>
      </div>
      <div className="text-sm muted-text">Status: {isDownloading ? 'Descargando...' : 'Idle'}</div>
    </div>
  )
}
