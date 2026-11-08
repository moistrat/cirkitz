import { Circuit, Part, Rot, Wire } from '../sim/types'
import { addWires } from '../sim/build'

export interface EditorState {
  circuit: Circuit
  selected: string | null
  past: Circuit[]
  future: Circuit[]
}

export type Action =
  | { type: 'addPart'; part: Part }
  | { type: 'movePart'; id: string; x: number; y: number; commit?: boolean }
  | { type: 'rotate'; id: string }
  | { type: 'remove'; id: string }
  | { type: 'removeWire'; id: string }
  | { type: 'addWires'; wires: Wire[] }
  | { type: 'setValue'; id: string; value: number }
  | { type: 'toggleSwitch'; id: string }
  | { type: 'select'; id: string | null }
  | { type: 'load'; circuit: Circuit }
  | { type: 'clear' }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'beginDrag' }
  | { type: 'reset'; circuit?: Circuit }

const LIMIT = 100

export const initialState = (circuit: Circuit = { parts: [], wires: [] }): EditorState => ({
  circuit, selected: null, past: [], future: [],
})

function commit(s: EditorState, circuit: Circuit, selected = s.selected): EditorState {
  if (circuit === s.circuit) return { ...s, selected }
  return { circuit, selected, past: [...s.past.slice(-LIMIT), s.circuit], future: [] }
}

const mapPart = (c: Circuit, id: string, f: (p: Part) => Part): Circuit => ({
  ...c, parts: c.parts.map((p) => (p.id === id ? f(p) : p)),
})

export function reducer(s: EditorState, a: Action): EditorState {
  const c = s.circuit
  switch (a.type) {
    case 'addPart': return commit(s, { ...c, parts: [...c.parts, a.part] }, a.part.id)
    case 'beginDrag': return { ...s, past: [...s.past.slice(-LIMIT), c], future: [] }
    case 'movePart': // drag moves are applied live; beginDrag already stored history
      return { ...s, circuit: mapPart(c, a.id, (p) => ({ ...p, x: a.x, y: a.y })) }
    case 'rotate': return commit(s, mapPart(c, a.id, (p) => ({ ...p, rot: ((p.rot + 1) % 4) as Rot })))
    case 'remove':
      return commit(s, { ...c, parts: c.parts.filter((p) => p.id !== a.id) }, s.selected === a.id ? null : s.selected)
    case 'removeWire': return commit(s, { ...c, wires: c.wires.filter((w) => w.id !== a.id) })
    case 'addWires': return commit(s, addWires(c, a.wires))
    case 'setValue': return commit(s, mapPart(c, a.id, (p) => ({ ...p, value: a.value })))
    case 'toggleSwitch': return commit(s, mapPart(c, a.id, (p) => ({ ...p, closed: !p.closed })))
    case 'select': return { ...s, selected: a.id }
    case 'load': return { circuit: a.circuit, selected: null, past: [...s.past.slice(-LIMIT), c], future: [] }
    case 'reset': return initialState(a.circuit)
    case 'clear': return commit(s, { parts: [], wires: [] }, null)
    case 'undo': {
      if (!s.past.length) return s
      const prev = s.past[s.past.length - 1]
      return { circuit: prev, selected: null, past: s.past.slice(0, -1), future: [c, ...s.future] }
    }
    case 'redo': {
      if (!s.future.length) return s
      return { circuit: s.future[0], selected: null, past: [...s.past, c], future: s.future.slice(1) }
    }
  }
}
