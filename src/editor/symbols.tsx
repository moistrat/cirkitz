import { KINDS, Part, Rot, Kind, terminals } from '../sim/types'
import { PartResult } from '../sim/netlist'
import { formatSI } from '../sim/format'
import { Circuit } from '../sim/types'

export const G = 32

export function designators(c: Circuit): Map<string, string> {
  const count: Partial<Record<Kind, number>> = {}
  const out = new Map<string, string>()
  for (const p of c.parts) {
    const n = (count[p.kind] = (count[p.kind] ?? 0) + 1)
    out.set(p.id, `${KINDS[p.kind].symbol}${n}`)
  }
  return out
}

export function brightness(p: Part, r?: PartResult): number {
  if (!r) return 0
  if (p.kind === 'led') return r.i > 1e-6 ? 1 - Math.exp(-r.i / 0.008) : 0
  if (p.kind === 'bulb') return 1 - Math.exp(-Math.abs(r.p) / 0.25)
  return 0
}

export function SymbolBody({ kind, closed, glow }: { kind: Kind; closed: boolean; glow: number }) {
  switch (kind) {
    case 'resistor':
      return <polyline className="sym" points="0,0 16,0 20,-9 28,9 36,-9 44,9 48,0 64,0" />
    case 'battery':
      return (
        <g>
          <path className="sym" d="M0,0H27M37,0H64" />
          <path className="sym" d="M27,-15V15" strokeWidth={4} />
          <path className="sym" d="M37,-8V8" strokeWidth={6} />
          <text className="sym-text" x={12} y={-8} fontSize={13}>+</text>
        </g>
      )
    case 'bulb':
      return (
        <g>
          {glow > 0.01 && (
            <>
              <circle cx={32} cy={0} r={22 + glow * 22} fill="url(#glow-bulb)" opacity={glow} />
              <circle cx={32} cy={0} r={16} fill="#ffd166" opacity={glow * 0.9} />
            </>
          )}
          <path className="sym" d="M0,0H16M48,0H64" />
          <circle className="sym" cx={32} cy={0} r={16} />
          <path className="sym" d="M21,-11L43,11M21,11L43,-11" />
        </g>
      )
    case 'led':
      return (
        <g>
          {glow > 0.01 && <circle cx={32} cy={0} r={18 + glow * 24} fill="url(#glow-led)" opacity={glow} />}
          <path className="sym" d="M0,0H20M44,0H64" />
          <path className="sym" d="M20,-12V12L44,0Z" fill={glow > 0.01 ? `rgba(255,70,70,${0.3 + glow * 0.7})` : 'none'} />
          <path className="sym" d="M44,-12V12" />
          <path className="sym" d="M36,-16L44,-26M44,-26h-5M44,-26v5M44,-14L52,-24M52,-24h-5M52,-24v5" strokeWidth={1.5} />
        </g>
      )
    case 'switch':
      return (
        <g>
          <path className="sym" d="M0,0H16M48,0H64" />
          <circle className="sym-fill" cx={16} cy={0} r={3.5} />
          <circle className="sym-fill" cx={48} cy={0} r={3.5} />
          <path className="sym" d={closed ? 'M16,0L48,0' : 'M16,0L43,-19'} />
        </g>
      )
    case 'isource':
      return (
        <g>
          <path className="sym" d="M0,0H16M48,0H64" />
          <circle className="sym" cx={32} cy={0} r={16} />
          <path className="sym" d="M22,0H42M36,-5L42,0L36,5" />
        </g>
      )
  }
}

export function PartSymbol({
  part, glow = 0, ghost = false,
}: { part: Part; glow?: number; ghost?: boolean }) {
  const [a] = terminals(part)
  return (
    <g
      transform={`translate(${a.x * G},${a.y * G}) rotate(${part.rot * 90})`}
      opacity={ghost ? 0.55 : 1}
      style={{ pointerEvents: 'none' }}
    >
      <SymbolBody kind={part.kind} closed={part.closed} glow={glow} />
    </g>
  )
}

export function PartLabel({
  part, name, label, sub, rot,
}: { part: Part; name: string; label: string; sub?: string; rot: Rot }) {
  const [a, b] = terminals(part)
  const cx = ((a.x + b.x) / 2) * G
  const cy = ((a.y + b.y) / 2) * G
  const horizontal = rot === 0 || rot === 2
  const tx = horizontal ? cx : cx + 26
  const ty = horizontal ? cy - 26 : cy - 2
  const anchor = horizontal ? 'middle' : 'start'
  return (
    <g style={{ pointerEvents: 'none' }}>
      <text className="lbl" x={tx} y={ty} textAnchor={anchor}>
        <tspan fontWeight={700}>{name}</tspan> {label}
      </text>
      {sub && (
        <text className="lbl-sub" x={horizontal ? cx : tx} y={horizontal ? cy + 34 : ty + 15} textAnchor={anchor}>
          {sub}
        </text>
      )}
    </g>
  )
}

export function valueLabel(p: Part): string {
  const k = KINDS[p.kind]
  if (p.kind === 'switch') return p.closed ? 'closed' : 'open'
  if (p.kind === 'led') return ''
  return formatSI(p.value, k.unit)
}

export function GlowDefs() {
  return (
    <defs>
      <radialGradient id="glow-bulb">
        <stop offset="0%" stopColor="#ffe9a8" stopOpacity="0.95" />
        <stop offset="100%" stopColor="#ffb703" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="glow-led">
        <stop offset="0%" stopColor="#ff6b6b" stopOpacity="0.9" />
        <stop offset="100%" stopColor="#ff3b3b" stopOpacity="0" />
      </radialGradient>
    </defs>
  )
}
