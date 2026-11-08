import { Analysis } from '../sim/netlist'
import { Circuit } from '../sim/types'

export interface Param {
  key: string
  label: string
  unit: string
  min: number
  max: number
  value: number
  log?: boolean
  step?: number
  /** renders a checkbox; value is 0 or 1 */
  toggle?: boolean
}

export interface Built { circuit: Circuit; [k: string]: any } // eslint-disable-line @typescript-eslint/no-explicit-any

export interface Readout { label: string; value: string; hint?: string }

export interface LabSpec {
  id: string
  caption?: string
  params: Param[]
  build: (p: Record<string, number>) => Built
  readouts: (a: Analysis, b: Built, p: Record<string, number>) => Readout[]
}

export type WidgetId =
  | 'atoms' | 'water' | 'wave' | 'rc' | 'rl' | 'reactance' | 'iv' | 'symbols' | 'colorcode'

export type Block =
  | { t: 'h'; text: string }
  | { t: 'p'; text: string }
  | { t: 'list'; items: string[]; ordered?: boolean }
  | { t: 'callout'; kind: 'key' | 'note' | 'warn'; title?: string; text: string }
  | { t: 'formula'; lines: string[]; caption?: string }
  | { t: 'example'; title: string; problem: string; steps: string[]; answer: string }
  | { t: 'table'; head: string[]; rows: string[][]; caption?: string }
  | { t: 'lab'; lab: LabSpec }
  | { t: 'widget'; id: WidgetId; caption?: string }
  | { t: 'check'; id: string; q: string; options: string[]; correct: number; explain: string }

export interface Lesson {
  id: string
  title: string
  summary: string
  /** estimated minutes */
  minutes: number
  /** shown at the top: what you will be able to do */
  goals: string[]
  blocks: Block[]
}

export interface Unit {
  id: string
  title: string
  blurb: string
  lessons: Lesson[]
}
