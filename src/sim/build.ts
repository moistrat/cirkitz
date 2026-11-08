import { Circuit, KINDS, Kind, Part, Pt, Rot, Wire, key } from './types'

let counter = 0
export const uid = (prefix: string) => `${prefix}${Date.now().toString(36)}${(counter++).toString(36)}${Math.random().toString(36).slice(2, 5)}`

export function makePart(kind: Kind, x: number, y: number, rot: Rot = 0, value?: number, id?: string): Part {
  return { id: id ?? uid('p'), kind, x, y, rot, value: value ?? KINDS[kind].default, closed: true }
}

const segKey = (a: Pt, b: Pt) => {
  const ka = key(a), kb = key(b)
  return ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`
}

/** Splits a polyline (axis-aligned or diagonal-free L path) into unit-length wire segments. */
export function wirePath(points: Pt[]): Wire[] {
  const out: Wire[] = []
  for (let i = 0; i + 1 < points.length; i++) {
    let { x, y } = points[i]
    const t = points[i + 1]
    while (x !== t.x || y !== t.y) {
      const nx = x + Math.sign(t.x - x)
      const ny = x !== t.x ? y : y + Math.sign(t.y - y)
      out.push({ id: uid('w'), a: { x, y }, b: { x: nx, y: ny } })
      x = nx
      y = ny
    }
  }
  return out
}

/** Route p → q with one bend (horizontal first, or vertical first). */
export function lPath(p: Pt, q: Pt, verticalFirst = false): Pt[] {
  if (p.x === q.x || p.y === q.y) return [p, q]
  return verticalFirst ? [p, { x: p.x, y: q.y }, q] : [p, { x: q.x, y: p.y }, q]
}

export function addWires(c: Circuit, add: Wire[]): Circuit {
  const have = new Set(c.wires.map((w) => segKey(w.a, w.b)))
  const fresh = add.filter((w) => {
    const k = segKey(w.a, w.b)
    if (have.has(k)) return false
    have.add(k)
    return true
  })
  return fresh.length ? { ...c, wires: [...c.wires, ...fresh] } : c
}

export function circuitFrom(parts: Part[], paths: Pt[][]): Circuit {
  let c: Circuit = { parts, wires: [] }
  for (const p of paths) c = addWires(c, wirePath(p))
  return c
}

export const pt = (x: number, y: number): Pt => ({ x, y })

export function isCircuit(x: unknown): x is Circuit {
  const c = x as Circuit
  return !!c && Array.isArray(c.parts) && Array.isArray(c.wires) &&
    c.parts.every((p) => p && p.kind in KINDS && Number.isFinite(p.x) && Number.isFinite(p.y) && [0, 1, 2, 3].includes(p.rot) && Number.isFinite(p.value)) &&
    c.wires.every((w) => w && Number.isFinite(w.a?.x) && Number.isFinite(w.a?.y) && Number.isFinite(w.b?.x) && Number.isFinite(w.b?.y))
}

export function encodeCircuit(c: Circuit): string {
  const json = JSON.stringify(c)
  return btoa(unescape(encodeURIComponent(json))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function decodeCircuit(s: string): Circuit | null {
  try {
    const b64 = s.replace(/-/g, '+').replace(/_/g, '/')
    const c = JSON.parse(decodeURIComponent(escape(atob(b64))))
    return isCircuit(c) ? c : null
  } catch {
    return null
  }
}
