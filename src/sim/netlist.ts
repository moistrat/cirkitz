import { Circuit, Part, key, terminals } from './types'
import { Element, solve } from './solver'

export interface PartResult {
  /** V(a) − V(b) */
  v: number
  /** current a → b through the part (conventional) */
  i: number
  /** power absorbed (negative = supplying) */
  p: number
}

export interface Analysis {
  nodeV: Map<string, number>
  parts: Map<string, PartResult>
  /** current a → b along each wire segment */
  wires: Map<string, number>
  warnings: string[]
  converged: boolean
  empty: boolean
  /** grid key of the 0 V reference node */
  ref: string | null
}

export interface AnalyzeOpts {
  /** wire conductance in siemens (default 1000 = 1 mΩ) */
  wireG?: number
}

export const EMPTY: Analysis = {
  nodeV: new Map(), parts: new Map(), wires: new Map(), warnings: [], converged: true, empty: true, ref: null,
}

const clean = (x: number) => (Math.abs(x) < 1e-12 ? 0 : x)

export function analyze(c: Circuit, opts: AnalyzeOpts = {}): Analysis {
  const wireG = opts.wireG ?? 1000
  if (c.parts.length === 0) return EMPTY

  const ids = new Map<string, number>()
  const pts: string[] = []
  const reg = (k: string) => {
    if (!ids.has(k)) {
      ids.set(k, pts.length)
      pts.push(k)
    }
    return ids.get(k)!
  }
  // reference = negative terminal of the first battery, else first part's b terminal
  const bat = c.parts.find((p) => p.kind === 'battery')
  const refPart = bat ?? c.parts[0]
  reg(key(terminals(refPart)[1]))

  const els: Element[] = []
  const owner: ({ part: Part } | { wire: string })[] = []
  for (const p of c.parts) {
    const [ta, tb] = terminals(p)
    const a = reg(key(ta))
    const b = reg(key(tb))
    switch (p.kind) {
      case 'battery': els.push({ kind: 'V', a, b, v: p.value }); break
      case 'resistor':
      case 'bulb': els.push({ kind: 'R', a, b, r: Math.max(p.value, 1e-3) }); break
      case 'switch': els.push({ kind: 'R', a, b, r: p.closed ? 1e-3 : 1e9 }); break
      case 'isource': els.push({ kind: 'I', a, b, i: p.value }); break
      case 'led': els.push({ kind: 'D', a, b }); break
    }
    owner.push({ part: p })
  }
  for (const w of c.wires) {
    els.push({ kind: 'R', a: reg(key(w.a)), b: reg(key(w.b)), r: 1 / wireG })
    owner.push({ wire: w.id })
  }

  const res = solve(pts.length, els)
  const nodeV = new Map<string, number>()
  pts.forEach((k, i) => nodeV.set(k, clean(res.v[i])))
  const parts = new Map<string, PartResult>()
  const wires = new Map<string, number>()
  owner.forEach((o, ei) => {
    const i = clean(res.i[ei])
    if ('part' in o) {
      const [ta, tb] = terminals(o.part)
      const v = clean(nodeV.get(key(ta))! - nodeV.get(key(tb))!)
      parts.set(o.part.id, { v, i, p: v * i })
    } else wires.set(o.wire, i)
  })

  const warnings: string[] = []
  const maxWire = Math.max(0, ...[...wires.values()].map(Math.abs))
  if (maxWire > 25) warnings.push('Short circuit! A wire connects the battery directly across itself — huge current.')
  const sources = c.parts.filter((p) => p.kind === 'battery')
  if (sources.length && maxWire <= 25 && sources.every((s) => Math.abs(parts.get(s.id)!.i) < 1e-7))
    warnings.push('Open circuit — no complete loop, so no current flows.')
  for (const p of c.parts) {
    const r = parts.get(p.id)!
    if (p.kind === 'led' && r.i > 0.03) warnings.push('An LED is over-driven (> 30 mA). Add a series resistor!')
  }
  if (!res.converged) warnings.push('Solver did not fully converge.')

  return { nodeV, parts, wires, warnings, converged: res.converged, empty: false, ref: pts[0] }
}
