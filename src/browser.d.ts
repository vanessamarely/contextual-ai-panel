/**
 * browser.d.ts
 * Type augmentations for browser APIs used in this project that are either
 * not yet in TypeScript's lib.dom or not in React's CSSProperties.
 *
 * – CSS Anchor Positioning  (Chrome 125+)
 * – View Transitions API    (Chrome 111+, now in TS lib.dom, extended here)
 * – Popover API             (Chrome 114+, in TS lib.dom since TS 5.2)
 * – Built-in AI (Summarizer + LanguageModel) – only type-guarded at runtime
 */

// ── CSS Anchor Positioning + View Transition name (React inline style) ────────
// React's CSSProperties does not yet include these experimental properties.
// Declaring them here removes the need for `as any` casts on inline styles.
import 'react'

declare module 'react' {
  interface CSSProperties {
    /** CSS Anchor Positioning: sets the anchor name for an element. */
    anchorName?: string
    /** CSS Anchor Positioning: references an anchor by name. */
    positionAnchor?: string
    /**
     * View Transitions API: names this element so the browser can
     * capture old/new snapshots when startViewTransition() is called.
     */
    viewTransitionName?: string
    /** CSS Anchor Positioning: positions the element relative to its anchor. */
    positionArea?: string
  }

  // The `popover` attribute (Popover API) is already in @types/react ≥18.3.
  // If your version doesn't include it, uncomment the block below:
  // interface HTMLAttributes<T> {
  //   popover?: 'auto' | 'manual' | ''
  // }
}

// ── Built-in AI globals (feature-detected at runtime, not typed by TS) ────────
// These interfaces describe the minimal surface we use. Keeping them here
// (not inline `as any`) makes the usage explicit and auditable.
export interface AISummarizerCreateOptions {
  type?: 'tl;dr' | 'key-points' | 'teaser' | 'headline'
  length?: 'short' | 'medium' | 'long'
  format?: 'plain-text' | 'markdown'
  sharedContext?: string
  expectedInputLanguages?: string[]
  signal?: AbortSignal
  monitor?: (monitor: AICreateMonitor) => void
}

export interface AICreateMonitor extends EventTarget {
  addEventListener(
    type: 'downloadprogress',
    listener: (event: AIDownloadProgressEvent) => void,
    options?: boolean | AddEventListenerOptions
  ): void
}

export interface AIDownloadProgressEvent extends Event {
  loaded: number
  total: number
}

export interface AISummarizer {
  summarizeStreaming(input: string): ReadableStream<string>
  destroy(): void
}

export interface AILanguageModelCreateOptions {
  initialPrompts?: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
  expectedInputs?: Array<{ type: string; languages?: string[] }>
  signal?: AbortSignal
  monitor?: (monitor: AICreateMonitor) => void
}

export interface AILanguageModelSession {
  promptStreaming(input: string): ReadableStream<string>
  destroy(): void
}

export interface AIApi {
  availability(): Promise<'available' | 'downloadable' | 'unavailable'>
}

export interface SummarizerApi extends AIApi {
  create(options?: AISummarizerCreateOptions): Promise<AISummarizer>
}

export interface LanguageModelApi extends AIApi {
  create(options?: AILanguageModelCreateOptions): Promise<AILanguageModelSession>
}

// Extend Window to declare the built-in AI namespaces.
// Using `var` (not `const`) so TypeScript allows direct global access
// both as `window.Summarizer` and as the bare name `Summarizer`.
declare global {
  interface Window {
    Summarizer?: SummarizerApi
    LanguageModel?: LanguageModelApi
  }
  // eslint-disable-next-line no-var
  var Summarizer: SummarizerApi | undefined
  // eslint-disable-next-line no-var
  var LanguageModel: LanguageModelApi | undefined
}
