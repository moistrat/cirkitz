import { useEffect, useMemo, useRef, useState } from 'react'
import { Circuit, Part, Pt, Rot, key, terminals } from '../sim/types'
import { Analysis } from '../sim/netlist'
import { formatSI } from '../sim/format'
import { lPath, makePart, wirePath } from '../sim/build'
import { Action } from '../state/editorState'
import { G, GlowDefs, PartLabel, PartSymbol, brightness, designators, valueLabel } from './symbols'
import { Flow, FlowEdge } from './Flow'

export const COLS = 26
export const ROWS = 16

export type Tool =
  | { type: 'select' }
  | { type: 'erase' }
  | { type: 'place'; kind: Part['kind']; rot: Rot }

interface Props {
  circuit: Circuit
  analysis: Analysis
  dispatch?: (a: Action) => void
  editable?: boolean
  tool?: Tool
  selected?: string | null
  showValues?: boolean
  flowOn?: boolean
  /** hide measured V/I (for quizzes) */
  hideMeasurements?: boolean
  /** replace a part's value text, e.g. { r2: '?' } */
  labelOverrides?: Record<string, string>
  highlight?: string[]
  /** Fit viewBox to the circuit instead of showing the full editing grid. */
  fit?: boolean
}

const dist = (px: number, py: number, a: Pt, b: Pt) => {
  const dx = b.x - a.x, dy = b.y - a.y
  const l2 = dx * dx + dy * dy
  const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / l2))
  return Math.hypot(px - (a.x + t * dx), py - (a.y + t * dy))
}

const inGrid = (p: Pt) => p.x >= 0 && p.y >= 0 && p.x <= COLS && p.y <= ROWS

type Drag =
  | { kind: 'wire'; from: Pt }
  | { kind: 'part'; id: string; dx: number; dy: number; moved: boolean; startX: number; startY: number }
  | { kind: 'erase' }

export function Canvas({
  circuit, analysis, dispatch, editable = false, tool = { type: 'select' }, selected = null,
  showValues = true, flowOn = true, hideMeasurements = false, labelOverrides = {}, highlight = [], fit = false,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [hover, setHover] = useState<Pt | null>(null)
  const [drag, setDrag] = useState<Drag | null>(null)
  const [wireEnd, setWireEnd] = useState<Pt | null>(null)
  const names = useMemo(() => designators(circuit), [circuit])

  // ---------- geometry ----------
  const viewBox = useMemo(() => {
    if (!fit || (!circuit.parts.length && !circuit.wires.length)) return `0 0 ${COLS * G} ${ROWS * G}`
    const xs: number[] = [], ys: number[] = []
    for (const p of circuit.parts) for (const t of terminals(p)) { xs.push(t.x); ys.push(t.y) }
    for (const w of circuit.wires) { xs.push(w.a.x, w.b.x); ys.push(w.a.y, w.b.y) }
    const pad = 2
    const x0 = Math.min(...xs) - pad, x1 = Math.max(...xs) + pad
    const y0 = Math.min(...ys) - pad, y1 = Math.max(...ys) + pad
    return `${x0 * G} ${y0 * G} ${(x1 - x0) * G} ${(y1 - y0) * G}`
  }, [circuit, fit])

  const toGridF = (e: { clientX: number; clientY: number }): Pt => {
    const svg = svgRef.current!
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const p = pt.matrixTransform(svg.getScreenCTM()!.inverse())
    return { x: p.x / G, y: p.y / G }
  }
  const snap = (p: Pt): Pt => ({ x: Math.round(p.x), y: Math.round(p.y) })

  // ---------- voltage colouring ----------
  const [vmin, vmax] = useMemo(() => {
    const vs = [...analysis.nodeV.values()]
    if (!vs.length) return [0, 1]
    return [Math.min(...vs), Math.max(...vs)]
  }, [analysis])
  const vColor = (v: number | undefined) => {
    if (v === undefined || analysis.empty) return 'var(--wire)'
    const t = vmax - vmin < 1e-9 ? 0 : (v - vmin) / (vmax - vmin)
    return `hsl(${215 - 215 * t} 85% 56%)`
  }

  // ---------- flow edges ----------
  const edges: FlowEdge[] = useMemo(() => {
    const out: FlowEdge[] = []
    for (const w of circuit.wires) out.push({ id: w.id, a: w.a, b: w.b, i: analysis.wires.get(w.id) ?? 0 })
    for (const p of circuit.parts) {
      const [a, b] = terminals(p)
      out.push({ id: p.id, a, b, i: analysis.parts.get(p.id)?.i ?? 0 })
    }
    return out
  }, [circuit, analysis])

  // ---------- junction dots ----------
  const junctions = useMemo(() => {
    const deg = new Map<string, number>()
    const bump = (p: Pt) => deg.set(key(p), (deg.get(key(p)) ?? 0) + 1)
    circuit.wires.forEach((w) => { bump(w.a); bump(w.b) })
    circuit.parts.forEach((p) => terminals(p).forEach(bump))
    return [...deg.entries()].filter(([, d]) => d !== 2).map(([k]) => {
      const [x, y] = k.split(',').map(Number)
      return { x, y, d: deg.get(k)! }
    })
  }, [circuit])

  // ---------- hit testing ----------
  const hitPart = (p: Pt): Part | undefined => {
    let best: Part | undefined, bd = 0.55
    for (const part of circuit.parts) {
      const [a, b] = terminals(part)
      const d = dist(p.x, p.y, a, b)
      if (d < bd) { bd = d; best = part }
    }
    return best
  }
  const hitTerminal = (p: Pt) => {
    const g = snap(p)
    return Math.hypot(p.x - g.x, p.y - g.y) < 0.3
  }
  const hitWire = (p: Pt) => circuit.wires.find((w) => dist(p.x, p.y, w.a, w.b) < 0.3)

  const partFits = (kind: Part['kind'], at: Pt, rot: Rot) => {
    const probe = makePart(kind, at.x, at.y, rot)
    return terminals(probe).every(inGrid)
  }

  // ---------- pointer handlers ----------
  const onDown = (e: React.PointerEvent) => {
    if (!editable || !dispatch || e.button === 2) return
    const f = toGridF(e)
    const g = snap(f)
    svgRef.current!.setPointerCapture(e.pointerId)

    if (tool.type === 'place') {
      if (partFits(tool.kind, g, tool.rot)) dispatch({ type: 'addPart', part: makePart(tool.kind, g.x, g.y, tool.rot) })
      return
    }
    if (tool.type === 'erase') {
      eraseAt(f)
      setDrag({ kind: 'erase' })
      return
    }
    const part = hitPart(f)
    const nearTerminalOfPart = part && terminals(part).some((t) => Math.hypot(f.x - t.x, f.y - t.y) < 0.3)
    if (part && !nearTerminalOfPart) {
      dispatch({ type: 'select', id: part.id })
      setDrag({ kind: 'part', id: part.id, dx: f.x - part.x, dy: f.y - part.y, moved: false, startX: part.x, startY: part.y })
      return
    }
    if (hitTerminal(f) || !part) {
      if (!part) dispatch({ type: 'select', id: null })
      setDrag({ kind: 'wire', from: g })
      setWireEnd(g)
    }
  }

  const eraseAt = (f: Pt) => {
    if (!dispatch) return
    const part = hitPart(f)
    if (part) return dispatch({ type: 'remove', id: part.id })
    const w = hitWire(f)
    if (w) dispatch({ type: 'removeWire', id: w.id })
  }

  const onMove = (e: React.PointerEvent) => {
    const f = toGridF(e)
    const g = snap(f)
    setHover(g)
    if (!drag || !dispatch) return
    if (drag.kind === 'wire') setWireEnd(inGrid(g) ? g : wireEnd)
    else if (drag.kind === 'erase') eraseAt(f)
    else if (drag.kind === 'part') {
      const part = circuit.parts.find((p) => p.id === drag.id)
      if (!part) return
      const nx = Math.round(f.x - drag.dx), ny = Math.round(f.y - drag.dy)
      if ((nx === part.x && ny === part.y)) return
      if (!terminals({ ...part, x: nx, y: ny }).every(inGrid)) return
      if (!drag.moved) {
        dispatch({ type: 'beginDrag' })
        setDrag({ ...drag, moved: true })
      }
      dispatch({ type: 'movePart', id: drag.id, x: nx, y: ny })
    }
  }

  const wirePreview = (from: Pt, to: Pt): Pt[] => {
    const dx = Math.abs(to.x - from.x), dy = Math.abs(to.y - from.y)
    return lPath(from, to, dy > dx)
  }

  const onUp = () => {
    if (drag?.kind === 'wire' && wireEnd && dispatch && (wireEnd.x !== drag.from.x || wireEnd.y !== drag.from.y)) {
      dispatch({ type: 'addWires', wires: wirePath(wirePreview(drag.from, wireEnd)) })
    }
    if (drag?.kind === 'part' && !drag.moved) {
      const p = circuit.parts.find((q) => q.id === drag.id)
      if (p?.kind === 'switch') dispatch?.({ type: 'toggleSwitch', id: p.id })
    }
    setDrag(null)
    setWireEnd(null)
  }

  const onContext = (e: React.MouseEvent) => {
    if (!editable) return
    e.preventDefault()
    eraseAt(toGridF(e))
  }

  useEffect(() => { if (!editable) setHover(null) }, [editable])

  // ---------- render ----------
  const ghost = editable && tool.type === 'place' && hover && partFits(tool.kind, hover, tool.rot)
    ? makePart(tool.kind, hover.x, hover.y, tool.rot, undefined, 'ghost') : null
  const probeKey = hover && editable && tool.type === 'select' && !drag ? key(hover) : null
  const probeV = probeKey ? analysis.nodeV.get(probeKey) : undefined
  const refPt = analysis.ref ? (analysis.ref.split(',').map(Number) as [number, number]) : null

  return (
    <svg
      ref={svgRef}
      className={`canvas ${editable ? 'editable' : ''} tool-${tool.type}`}
      viewBox={viewBox}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerLeave={() => { if (!drag) setHover(null) }}
      onContextMenu={onContext}
    >
      <GlowDefs />
      {editable && (
        <>
          <rect x={0} y={0} width={COLS * G} height={ROWS * G} fill="var(--canvas-bg)" />
          <g className="grid-dots">
            {Array.from({ length: (COLS + 1) * (ROWS + 1) }, (_, n) => (
              <circle key={n} cx={(n % (COLS + 1)) * G} cy={Math.floor(n / (COLS + 1)) * G} r={1.6} />
            ))}
          </g>
        </>
      )}

      {/* wires */}
      <g strokeLinecap="round">
        {circuit.wires.map((w) => {
          const va = analysis.nodeV.get(key(w.a)), vb = analysis.nodeV.get(key(w.b))
          const v = va !== undefined && vb !== undefined ? (va + vb) / 2 : undefined
          return (
            <line key={w.id} x1={w.a.x * G} y1={w.a.y * G} x2={w.b.x * G} y2={w.b.y * G}
              stroke={vColor(v)} strokeWidth={5} />
          )
        })}
      </g>
      {junctions.map((j) => (
        <circle key={`${j.x},${j.y}`} cx={j.x * G} cy={j.y * G} r={j.d > 2 ? 5.5 : 3.5}
          fill={vColor(analysis.nodeV.get(`${j.x},${j.y}`))} />
      ))}

      {/* parts */}
      {circuit.parts.map((p) => {
        const r = analysis.parts.get(p.id)
        const [a, b] = terminals(p)
        const isSel = selected === p.id
        const isHi = highlight.includes(p.id)
        return (
          <g key={p.id}>
            {(isSel || isHi) && (
              <line x1={a.x * G} y1={a.y * G} x2={b.x * G} y2={b.y * G}
                className={isHi ? 'hi-ring' : 'sel-ring'} strokeLinecap="round" />
            )}
            <PartSymbol part={p} glow={brightness(p, r)} />
            <circle cx={a.x * G} cy={a.y * G} r={4.5} className="terminal" />
            <circle cx={b.x * G} cy={b.y * G} r={4.5} className="terminal" />
          </g>
        )
      })}

      {/* flow animation */}
      {flowOn && !analysis.empty && <Flow edges={edges} />}

      {/* labels */}
      {circuit.parts.map((p) => {
        const r = analysis.parts.get(p.id)
        const sub = showValues && !hideMeasurements && r && p.kind !== 'switch'
          ? `${formatSI(Math.abs(r.v), 'V')} · ${formatSI(Math.abs(r.i), 'A')}` : undefined
        return (
          <PartLabel key={p.id} part={p} name={names.get(p.id)!} rot={p.rot}
            label={labelOverrides[p.id] ?? valueLabel(p)} sub={sub} />
        )
      })}

      {/* ground */}
      {refPt && !analysis.empty && (
        <g transform={`translate(${refPt[0] * G},${refPt[1] * G})`} className="ground" style={{ pointerEvents: 'none' }}>
          <path d="M0,0V10M-12,10H12M-8,15H8M-4,20H4" />
          <text x={16} y={22} className="lbl-sub">0 V</text>
        </g>
      )}

      {/* wire preview */}
      {drag?.kind === 'wire' && wireEnd && (
        <polyline className="wire-preview"
          points={wirePreview(drag.from, wireEnd).map((p) => `${p.x * G},${p.y * G}`).join(' ')} />
      )}

      {ghost && <PartSymbol part={ghost} ghost />}

      {/* probe */}
      {probeKey && hover && probeV !== undefined && (
        <g style={{ pointerEvents: 'none' }}>
          <circle cx={hover.x * G} cy={hover.y * G} r={8} className="probe-ring" />
          <g transform={`translate(${hover.x * G + 12},${hover.y * G - 30})`}>
            <rect width={96} height={22} rx={5} className="probe-box" />
            <text x={48} y={15} textAnchor="middle" className="probe-text">{formatSI(probeV, 'V')}</text>
          </g>
        </g>
      )}
    </svg>
  )
}
