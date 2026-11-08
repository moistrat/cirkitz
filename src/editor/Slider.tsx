import { Param } from '../learn/types'
import { formatSI } from '../sim/format'

const round2 = (x: number) => Number(x.toPrecision(2))

export function Slider({ p, value, onChange }: { p: Param; value: number; onChange: (v: number) => void }) {
  if (p.toggle) {
    return (
      <label className="slider toggle">
        <span className="slider-label">{p.label}</span>
        <input type="checkbox" checked={value === 1} onChange={(e) => onChange(e.target.checked ? 1 : 0)} />
        <span className="slider-value">{value === 1 ? 'on' : 'off'}</span>
      </label>
    )
  }
  const pos = p.log ? (Math.log(value / p.min) / Math.log(p.max / p.min)) * 1000 : value
  const set = (raw: number) => {
    if (p.log) onChange(round2(p.min * Math.pow(p.max / p.min, raw / 1000)))
    else onChange(raw)
  }
  return (
    <label className="slider">
      <span className="slider-label">{p.label}</span>
      <input
        type="range"
        min={p.log ? 0 : p.min}
        max={p.log ? 1000 : p.max}
        step={p.log ? 1 : p.step ?? 1}
        value={pos}
        onChange={(e) => set(Number(e.target.value))}
      />
      <span className="slider-value">{formatSI(value, p.unit)}</span>
    </label>
  )
}
