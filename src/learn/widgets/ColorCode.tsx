import { useState } from 'react'
import { formatSI } from '../../sim/format'
import { Frame } from './shared'

const COLORS = [
  { n: 'Black', c: '#111111', d: 0 }, { n: 'Brown', c: '#7a4a21', d: 1 }, { n: 'Red', c: '#d6353b', d: 2 },
  { n: 'Orange', c: '#ee8a2c', d: 3 }, { n: 'Yellow', c: '#e6cf3a', d: 4 }, { n: 'Green', c: '#3ca25b', d: 5 },
  { n: 'Blue', c: '#3b6fd6', d: 6 }, { n: 'Violet', c: '#8a52c6', d: 7 }, { n: 'Grey', c: '#8d949a', d: 8 }, { n: 'White', c: '#f1f1f1', d: 9 },
]
const MULTS = [
  { n: 'Black', c: '#111111', m: 1 }, { n: 'Brown', c: '#7a4a21', m: 10 }, { n: 'Red', c: '#d6353b', m: 100 },
  { n: 'Orange', c: '#ee8a2c', m: 1e3 }, { n: 'Yellow', c: '#e6cf3a', m: 1e4 }, { n: 'Green', c: '#3ca25b', m: 1e5 },
  { n: 'Blue', c: '#3b6fd6', m: 1e6 }, { n: 'Gold', c: '#c9a24a', m: 0.1 }, { n: 'Silver', c: '#b8bec4', m: 0.01 },
]
const TOL = [{ n: 'Brown', c: '#7a4a21', t: '1%' }, { n: 'Red', c: '#d6353b', t: '2%' }, { n: 'Gold', c: '#c9a24a', t: '5%' }, { n: 'Silver', c: '#b8bec4', t: '10%' }]

export function ColorCode() {
  const [a, setA] = useState(4)
  const [b, setB] = useState(7)
  const [m, setM] = useState(2)
  const [t, setT] = useState(2)
  const value = (COLORS[a].d * 10 + COLORS[b].d) * MULTS[m].m
  const Sel = ({ label, value, set, items }: { label: string; value: number; set: (n: number) => void; items: string[] }) => (
    <label className="field"><span>{label}</span>
      <select value={value} onChange={(e) => set(Number(e.target.value))}>{items.map((n, i) => <option key={n} value={i}>{n}</option>)}</select>
    </label>
  )
  return (
    <Frame caption="Small resistors are marked with colored bands instead of numbers. Read from the end with the bands grouped together: two digits, a multiplier, then tolerance.">
      <svg viewBox="0 0 320 70" className="wsvg" style={{ maxWidth: 420 }} role="img" aria-label="Resistor with colored bands">
        <path d="M0 35H40M280 35H320" className="sym" />
        <rect x={40} y={12} width={240} height={46} rx={16} fill="#c9b79c" />
        {[COLORS[a].c, COLORS[b].c, MULTS[m].c, TOL[t].c].map((c, i) => (
          <rect key={i} x={72 + i * 40 + (i === 3 ? 22 : 0)} y={12} width={14} height={46} fill={c} />
        ))}
      </svg>
      <div className="widget-controls">
        <div className="color-selects">
          <Sel label="1st digit" value={a} set={setA} items={COLORS.map((c) => `${c.n} (${c.d})`)} />
          <Sel label="2nd digit" value={b} set={setB} items={COLORS.map((c) => `${c.n} (${c.d})`)} />
          <Sel label="Multiplier" value={m} set={setM} items={MULTS.map((c) => `${c.n} (×${formatSI(c.m, '', 2)})`)} />
          <Sel label="Tolerance" value={t} set={setT} items={TOL.map((c) => `${c.n} (${c.t})`)} />
        </div>
        <p className="readout-big">{formatSI(value, 'Ω')} <small>{'±'}{TOL[t].t}</small></p>
      </div>
    </Frame>
  )
}
