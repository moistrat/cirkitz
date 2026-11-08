export type Pt = { x: number; y: number }
export type Kind = 'battery' | 'resistor' | 'bulb' | 'led' | 'switch' | 'isource'
export type Rot = 0 | 1 | 2 | 3

export interface Part {
  id: string
  kind: Kind
  x: number
  y: number
  rot: Rot
  /** V for battery, Ω for resistor/bulb, A for current source. Unused for led/switch. */
  value: number
  /** switch only */
  closed: boolean
}

/** A unit-length wire segment between two adjacent grid points. */
export interface Wire {
  id: string
  a: Pt
  b: Pt
}

export interface Circuit {
  parts: Part[]
  wires: Wire[]
}

export const PART_LEN = 2

export const key = (p: Pt) => `${p.x},${p.y}`

/** Terminal a is the "+" / anode / start; b is the other end. */
export function terminals(p: Part): [Pt, Pt] {
  const a = { x: p.x, y: p.y }
  const d = [
    { x: PART_LEN, y: 0 },
    { x: 0, y: PART_LEN },
    { x: -PART_LEN, y: 0 },
    { x: 0, y: -PART_LEN },
  ][p.rot]
  return [a, { x: p.x + d.x, y: p.y + d.y }]
}

export interface KindInfo {
  label: string
  unit: string
  symbol: string
  default: number
  editable: boolean
  blurb: string
}

export const KINDS: Record<Kind, KindInfo> = {
  battery: { label: 'Battery', unit: 'V', symbol: 'V', default: 9, editable: true, blurb: 'Ideal voltage source. The long plate is +.' },
  resistor: { label: 'Resistor', unit: 'Ω', symbol: 'R', default: 100, editable: true, blurb: 'Limits current. V = I·R.' },
  bulb: { label: 'Bulb', unit: 'Ω', symbol: 'L', default: 20, editable: true, blurb: 'A resistor that glows with power P = V·I.' },
  led: { label: 'LED', unit: '', symbol: 'D', default: 0, editable: false, blurb: 'Only conducts one way (anode → cathode), drops ~1.9 V. Needs a resistor!' },
  switch: { label: 'Switch', unit: '', symbol: 'S', default: 0, editable: false, blurb: 'Click to open/close the circuit.' },
  isource: { label: 'Current source', unit: 'A', symbol: 'I', default: 0.01, editable: true, blurb: 'Forces a fixed current in the arrow direction.' },
}
