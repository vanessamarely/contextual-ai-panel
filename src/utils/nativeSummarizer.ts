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

  const options = {
    type: 'key-points',
    length: 'short',
    format: 'markdown',
    sharedContext: 'Asistente UX in-app.',
    monitor: opts.monitor
  }

  const summarizer = await Summarizer.create(options)
  let closed = false

  const cleanup = async () => {
    if (closed) return
    closed = true
    try {
      await summarizer.destroy?.()
    } catch (err) {
      // best-effort cleanup; log but do not throw
      // eslint-disable-next-line no-console
      console.warn('summarizer.destroy failed', err)
    }
  }

  try {
    // prefer summarizeStreaming if available
    const stream = summarizer.summarizeStreaming ? summarizer.summarizeStreaming(text) : (await summarizer.stream?.(text))
    if (!stream) throw new Error('Summarizer does not provide a streaming interface')

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
