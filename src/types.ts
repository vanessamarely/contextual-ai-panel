/**
 * types.ts — Shared domain types for SaludVista.
 * Imported by components, hooks, and data files.
 */

/** All valid flag severity levels */
export type FlagKey = 'high' | 'low' | 'normal' | 'warning' | 'info'

/** Visual badge configuration for each flag level */
export interface FlagConfig {
  label: string
  cls: string
}

/** A single lab/med/imaging result entry */
export interface Entry {
  id: string
  term: string
  value: string
  ref: string
  flag: FlagKey
  /** Raw clinical text used as input to the AI APIs */
  raw: string
}

/** A section grouping multiple entries (Labs / Meds / Imaging) */
export interface ReportSection {
  id: string
  label: string
  entries: Entry[]
}

/** The three tabs in the AI analysis panel */
export type PanelTab = 'summary' | 'faq' | 'actions'

/** Tab display configuration */
export interface TabConfig {
  id: PanelTab
  icon: string
  label: string
}

/** Text chunk emitted by a streaming AI response */
export interface AiChunk {
  text: string
}

/** Options for the Summarizer API call */
export interface SummarizeOptions {
  simulator?: boolean
  forceError?: boolean
}

/** Options for the Prompt API call */
export interface PromptOptions {
  simulator?: boolean
}
