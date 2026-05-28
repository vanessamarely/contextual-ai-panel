export type SummarizerOptions = {
  requireUserActivation?: boolean
  monitor?: any
  signal?: AbortSignal
}

export async function streamNativeSummarizer(text: string, onChunk: (chunk: string) => void, opts: SummarizerOptions = {}) {
  const win = globalThis as any
  if (!('Summarizer' in win)) {
    throw new Error('Summarizer not present in global scope')
  }

  const Summarizer = win.Summarizer
  if (typeof Summarizer.availability === 'function') {
    const status = await Summarizer.availability()
    if (status === 'unavailable') throw new Error('Summarizer unavailable')
  }

  if (opts.requireUserActivation && !(navigator as any).userActivation?.isActive) {
    throw new Error('User activation required to create Summarizer')
  }

  const ctrl = new AbortController()
  if (opts.signal) {
    // forward external abort to our internal controller
    opts.signal.addEventListener('abort', () => ctrl.abort(), { once: true })
  }

  const options = {
    type: 'key-points',
    length: 'short',
    format: 'markdown',
    sharedContext: 'Panel de ayuda médico contextual. Explica en lenguaje cotidiano.',
    expectedInputLanguages: ['es', 'en'],
    signal: ctrl.signal,
    monitor: opts.monitor,
  }

  const summarizer = await Summarizer.create(options)
  let closed = false

  const cleanup = async () => {
    if (closed) return
    closed = true
    // Architecture step 6: abort + destroy per slides deck
    ctrl.abort()
    try {
      await summarizer.destroy?.()
    } catch (err) {
      console.warn('summarizer.destroy failed', err)
    }
  }

  try {
    // Per MDN + slides deck: use summarizeStreaming() (not stream())
    if (typeof summarizer.summarizeStreaming !== 'function') {
      throw new Error('Summarizer does not support summarizeStreaming')
    }
    const stream = summarizer.summarizeStreaming(text)
    if (!stream) throw new Error('summarizeStreaming returned no stream')

    for await (const c of stream) {
      if (opts.signal?.aborted) break
      try {
        const chunkText = typeof c === 'string' ? c : (c?.text ?? String(c))
        onChunk(chunkText)
      } catch (e) {
        // swallow chunk handler errors but continue
        console.warn('chunk handler error', e)
      }
    }
  } finally {
    await cleanup()
  }
}
