import { useEffect, useRef, useState } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// useBuiltInAi
//
// Abstraction over Chrome's built-in AI APIs:
//   • Summarizer API  → startSummarize()
//   • LanguageModel   → startPrompt()
//
// Pattern (mirrors the spec JS example):
//   const availability = await Summarizer.availability()
//   if (availability === 'available') { create immediately }
//   else if (availability === 'downloadable') { create with download monitor }
//
// All streaming functions yield { text: string } chunks so callers never
// interact with ReadableStream or the native API objects directly.
// When the native API is absent the hook falls back to a simulated stream.
// ─────────────────────────────────────────────────────────────────────────────

export interface AiChunk {
  text: string
}

export function useBuiltInAi() {
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [isDownloading, setIsDownloading]       = useState(false)
  const [isAvailable, setIsAvailable]           = useState<boolean | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // ── Feature-detect on mount ───────────────────────────────────────────────
  // `Summarizer` is now a typed global (see browser.d.ts → `var Summarizer`).
  // We check for it directly without casting window to any.
  useEffect(() => {
    let mounted = true
    void (async () => {
      try {
        if (typeof Summarizer === 'undefined') {
          console.info('[SaludVista] Summarizer API no disponible en este navegador. Usando simulador.')
          if (mounted) setIsAvailable(false)
          return
        }
        const av = await Summarizer.availability()
        console.info(`[SaludVista] Summarizer.availability() → "${av}"`)
        if (mounted) setIsAvailable(av !== 'unavailable')
      } catch (err) {
        console.warn('[SaludVista] Error al detectar Summarizer API:', err)
        if (mounted) setIsAvailable(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  // ── Simulated download progress (presenter demo only) ────────────────────
  function simulateDownload(totalMs = 4000): void {
    setIsDownloading(true)
    setDownloadProgress(0)
    const start = Date.now()
    abortRef.current = new AbortController()
    const tick = (): void => {
      if (!abortRef.current) return
      const p = Math.min(100, Math.round(((Date.now() - start) / totalMs) * 100))
      setDownloadProgress(p)
      if (p >= 100) {
        setIsDownloading(false)
        abortRef.current = null
      } else {
        setTimeout(tick, 150 + Math.random() * 250)
      }
    }
    tick()
  }

  function cancelDownload(): void {
    abortRef.current?.abort()
    abortRef.current = null
    setIsDownloading(false)
  }

  // ── Shared: word-by-word simulator stream ────────────────────────────────
  async function* simulatedStream(text: string): AsyncGenerator<AiChunk> {
    for (const token of text.split(/(\s+)/).filter(Boolean)) {
      await new Promise<void>((r) => setTimeout(r, 30 + Math.random() * 55))
      yield { text: token }
    }
  }

  // ── Summarizer API ────────────────────────────────────────────────────────
  // Follows the exact spec pattern:
  //   availability === 'available'    → create immediately (no monitor needed)
  //   availability === 'downloadable' → create with downloadprogress monitor
  async function* startSummarize(
    sourceText: string,
    opts?: { simulator?: boolean; forceError?: boolean }
  ): AsyncGenerator<AiChunk> {
    if (opts?.forceError) {
      throw new Error('Error de API forzado para demo')
    }

    const useNative = isAvailable && !opts?.simulator && typeof Summarizer !== 'undefined'
    console.info(`[SaludVista] startSummarize → ${useNative ? '🤖 Gemini Nano (nativo)' : '🎭 Simulador'}`)

    if (useNative) {
      // Assign to a const so TypeScript's type narrowing is stable across await boundaries.
      const summarizerApi = Summarizer   // SummarizerApi (never undefined — guarded above)
      if (!summarizerApi) {
        yield* simulatedStream(buildFallbackSummary(sourceText))
        return
      }

      const availability = await summarizerApi.availability()
      console.info(`[SaludVista] Summarizer.availability() → "${availability}"`)

      if (availability === 'unavailable') {
        yield* simulatedStream(buildFallbackSummary(sourceText))
        return
      }

      const ctrl = new AbortController()
      abortRef.current = ctrl

      // Type inferred from SummarizerApi.create() — no `any` needed.
      let summarizer: Awaited<ReturnType<typeof summarizerApi.create>> | undefined

      try {
        if (availability === 'available') {
          // Model already on device — create without monitor
          summarizer = await summarizerApi.create({
            type: 'key-points',
            length: 'short',
            format: 'markdown',
            sharedContext: 'Panel de ayuda médico contextual. Explica en lenguaje cotidiano.',
            expectedInputLanguages: ['es', 'en'],
            signal: ctrl.signal,
          })
        } else {
          // availability === 'downloadable' — show download progress
          setIsDownloading(true)
          summarizer = await summarizerApi.create({
            type: 'key-points',
            length: 'short',
            format: 'markdown',
            sharedContext: 'Panel de ayuda médico contextual. Explica en lenguaje cotidiano.',
            expectedInputLanguages: ['es', 'en'],
            signal: ctrl.signal,
            monitor(m) {
              m.addEventListener('downloadprogress', (e) => {
                const p = Math.round(e.loaded * 100)
                console.info(`[SaludVista] Descargando Gemini Nano: ${p}%`)
                setDownloadProgress(p)
                if (p >= 100) setIsDownloading(false)
              })
            },
          })
        }

        console.info('[SaludVista] Summarizer creado ✓ — iniciando stream')
        const stream = summarizer.summarizeStreaming(sourceText)
        for await (const chunk of stream) {
          if (ctrl.signal.aborted) break
          yield { text: typeof chunk === 'string' ? chunk : String(chunk) }
        }
        console.info('[SaludVista] Summarizer stream completado ✓')
        return
      } catch (err) {
        console.warn('[SaludVista] Summarizer falló, cayendo al simulador:', err)
        // Fall through to simulator
      } finally {
        ctrl.abort()
        summarizer?.destroy()
        abortRef.current = null
        setIsDownloading(false)
      }
    }

    yield* simulatedStream(buildFallbackSummary(sourceText))
  }

  // ── LanguageModel (Prompt API) ────────────────────────────────────────────
  // Same availability pattern as Summarizer.
  async function* startPrompt(
    promptText: string,
    opts?: { simulator?: boolean }
  ): AsyncGenerator<AiChunk> {
    const useNative = isAvailable && !opts?.simulator && typeof LanguageModel !== 'undefined'
    console.info(`[SaludVista] startPrompt → ${useNative ? '🤖 LanguageModel (nativo)' : '🎭 Simulador'}`)

    if (useNative) {
      const languageModelApi = LanguageModel
      if (!languageModelApi) {
        yield* simulatedStream(buildSimulatedPromptReply(promptText))
        return
      }

      const availability = await languageModelApi.availability()
      console.info(`[SaludVista] LanguageModel.availability() → "${availability}"`)

      if (availability === 'unavailable') {
        yield* simulatedStream(buildSimulatedPromptReply(promptText))
        return
      }

      const ctrl = new AbortController()
      abortRef.current = ctrl

      let session: Awaited<ReturnType<typeof languageModelApi.create>> | undefined

      try {
        session = await languageModelApi.create({
          expectedInputs: [{ type: 'text', languages: ['es', 'en'] }],
          initialPrompts: [
            {
              role: 'system',
              content:
                'Eres un asistente médico de confianza. Explica conceptos clínicos en ' +
                'lenguaje cotidiano, sin alarmismos. Responde siempre en español.',
            },
          ],
          signal: ctrl.signal,
          // Monitor always included — only fires on actual download
          monitor(m) {
            m.addEventListener('downloadprogress', (e) => {
              const p = Math.round(e.loaded * 100)
              console.info(`[SaludVista] Descargando LanguageModel: ${p}%`)
              setDownloadProgress(p)
            })
          },
        })
        console.info('[SaludVista] LanguageModel session creada ✓ — iniciando stream')
        const stream = session.promptStreaming(promptText)
        for await (const chunk of stream) {
          if (ctrl.signal.aborted) break
          yield { text: typeof chunk === 'string' ? chunk : String(chunk) }
        }
        console.info('[SaludVista] LanguageModel stream completado ✓')
        return
      } catch (err) {
        console.warn('[SaludVista] LanguageModel falló, cayendo al simulador:', err)
        // Fall through to simulator
      } finally {
        ctrl.abort()
        session?.destroy()
        abortRef.current = null
      }
    }

    yield* simulatedStream(buildSimulatedPromptReply(promptText))
  }

  return {
    downloadProgress,
    isDownloading,
    isAvailable,
    simulateDownload,
    cancelDownload,
    startSummarize,
    startPrompt,
  }
}

// ─── Simulator helpers ────────────────────────────────────────────────────────

function buildFallbackSummary(src: string): string {
  const excerpt = src.split('.').filter(Boolean).slice(0, 2).join('.').trim()
  return (
    `${excerpt}.\n\n` +
    `**Puntos clave:**\n\n` +
    `- Este valor requiere correlación con tu historial clínico.\n` +
    `- Habla con tu médico para interpretar el resultado en tu contexto.\n` +
    `- Procesado localmente — ningún dato sale del dispositivo.\n\n` +
    `🔒 Inferencia local · 0 llamadas de red.`
  )
}

function buildSimulatedPromptReply(prompt: string): string {
  const isFaq     = prompt.includes('preguntas frecuentes')
  const isActions = prompt.includes('sugerencias accionables')

  if (isFaq) {
    return (
      `❓ ¿Por qué está alterado este resultado?\n` +
      `💬 Los valores fuera del rango de referencia pueden deberse a múltiples factores: ` +
      `alimentación, estrés, medicación o condiciones de salud subyacentes. ` +
      `Tu médico evaluará el contexto completo.\n\n` +
      `❓ ¿Debo modificar mi medicación actual?\n` +
      `💬 No cambies ni suspendas ningún tratamiento sin indicación médica. ` +
      `Lleva este informe a tu próxima consulta para revisarlo juntos.\n\n` +
      `❓ ¿Cuándo debo repetir el análisis?\n` +
      `💬 En general se recomienda repetirlo en 4–8 semanas para confirmar tendencias, ` +
      `aunque tu médico indicará el intervalo adecuado según tu caso.\n\n` +
      `🔒 Generado localmente · 0 llamadas de red.`
    )
  }

  if (isActions) {
    return (
      `✓ Agenda una cita con tu médico — Comparte este informe y discute el plan de ` +
      `seguimiento apropiado para tu situación específica.\n\n` +
      `✓ Registra tus síntomas diariamente — Anota cómo te sientes cada día; ` +
      `esta información es clave para el diagnóstico y el ajuste del tratamiento.\n\n` +
      `✓ Consulta sobre cambios de estilo de vida — Pregunta a tu médico o nutricionista ` +
      `qué ajustes en dieta y actividad física pueden complementar el tratamiento.\n\n` +
      `🔒 Generado localmente · 0 llamadas de red.`
    )
  }

  const excerpt = prompt.split('.').slice(0, 1).join('.').trim()
  return (
    `Sobre: "${excerpt}".\n\n` +
    `Este resultado requiere atención médica. El valor está fuera del rango de referencia, ` +
    `lo que puede señalar cambios que merecen seguimiento.\n\n` +
    `🔒 Generado localmente · 0 llamadas de red.`
  )
}
