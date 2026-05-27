import { useEffect, useRef, useState } from 'react'

export function useBuiltInAi() {
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null)
  const controllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    // Detect availability of Summarizer API in window.ai (async probe)
    let mounted = true
    ;(async () => {
      try {
        // best-effort check
        const anyWin = window as any
        if (anyWin?.Summarizer && typeof anyWin.Summarizer.availability === 'function') {
          const availability = await anyWin.Summarizer.availability()
          if (mounted) setIsAvailable(availability !== 'unavailable')
        } else {
          if (mounted) setIsAvailable(false)
        }
      } catch (e) {
        if (mounted) setIsAvailable(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  function simulateDownload(totalMs = 4000) {
    setIsDownloading(true)
    setDownloadProgress(0)
    const start = Date.now()
    controllerRef.current = new AbortController()
    const tick = () => {
      if (!controllerRef.current) return
      const elapsed = Date.now() - start
      const p = Math.min(100, Math.round((elapsed / totalMs) * 100))
      setDownloadProgress(p)
      if (p >= 100) {
        setIsDownloading(false)
        controllerRef.current = null
      } else {
        setTimeout(tick, 150 + Math.random() * 250)
      }
    }
    tick()
  }

  function cancelDownload() {
    controllerRef.current?.abort()
    controllerRef.current = null
    setIsDownloading(false)
  }

  async function* simulatedStream(text: string) {
    // Break into tokens (words/punctuation)
    const tokens = text.split(/(\s+)/).filter(Boolean)
    for (const t of tokens) {
      const delay = 30 + Math.random() * 50
      await new Promise((r) => setTimeout(r, delay))
      yield { text: t }
    }
  }

  async function* startSummarize(sourceText: string, opts?: { simulator?: boolean; forceError?: boolean }) {
    const anyWin = window as any
    if (opts?.forceError) {
      // simulate initialization error
      throw new Error('Forced initialization error')
    }
    // If real Summarizer available and not forcing simulator
    if (isAvailable && !opts?.simulator && anyWin?.Summarizer) {
      // Demonstrative streaming using Summarizer.create + monitor
      try {
        const options = {
          sharedContext: 'This is a scientific article',
          type: 'key-points',
          format: 'markdown',
          length: 'medium',
          monitor(m: any) {
            m.addEventListener('downloadprogress', (e: any) => {
              setDownloadProgress(Math.round((e.loaded || 0) * 100))
            })
          }
        }
        if (navigator.userActivation?.isActive) {
          const summarizer = await anyWin.Summarizer.create(options)
          const reader = await summarizer.stream(sourceText)
          // reader is assumed to be async iterable
          for await (const chunk of reader) {
            yield chunk
          }
        } else {
          // require user activation
          yield* simulatedStream('User activation required for native Summarizer.')
        }
      } catch (e) {
        // fallback to simulated
        for await (const c of simulatedStream(fallbackText(sourceText))) {
          yield c
        }
      }
    } else {
      // Simulator fallback (word-by-word)
      for await (const c of simulatedStream(fallbackText(sourceText))) {
        yield c
      }
    }
  }

  function fallbackText(src: string) {
    // Simple summarization fallback: take first sentences and append key points hint
    const first = src.split('.').slice(0, 2).join('.').trim()
    return `${first}.\n\n- Key point 1\n- Key point 2\n- Key point 3`
  }

  return {
    downloadProgress,
    isDownloading,
    isAvailable,
    simulateDownload,
    cancelDownload,
    startSummarize,
    // Prompt API: accepts user prompt and streams responses (native if available, else simulated)
    async *startPrompt(promptText: string, opts?: { simulator?: boolean }) {
      const anyWin = window as any
      // If there is a LanguageModel or Prompt API available
      try {
        if (isAvailable && !opts?.simulator && anyWin?.LanguageModel && typeof anyWin.LanguageModel.create === 'function') {
          const model = await anyWin.LanguageModel.create({ name: 'builtin' })
          if (model && model.stream) {
            const reader = await model.stream(promptText)
            for await (const chunk of reader) {
              yield chunk
            }
            return
          }
        }
      } catch (e) {
        // fallback to simulated
      }

      // Simulator fallback: tokenized stream
      for await (const t of simulatedStream(simulatedPromptReply(promptText))) {
        yield t
      }
    }
  }
}

function simulatedPromptReply(prompt: string) {
  // naive echo with a bit of summarization
  const short = prompt.split('.').slice(0, 2).join('.').trim()
  return `Respuesta simulada basada en: ${short}.\n\nSugerencias:\n- Idea A\n- Idea B\n`;
}
