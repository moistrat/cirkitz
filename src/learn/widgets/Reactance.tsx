import { useState } from 'react'
import { formatSI } from '../../sim/format'
import { Frame, LogSlider, Readouts } from './shared'

const W = 640, H = 240, PX = 54, PY = 20
const FMIN = 1, FMAX = 1e6, DBMIN = -60

export function Reactance() {
  const [r, setR] = useState(1600)
  const [c, setC] = useState(100e-9)
  const [f, setF] = useState(1000)
  const [l, setL] = useState(0.1)

  const fc = 1 / (2 * Math.PI * r * c)
  const xc = 1 / (2 * Math.PI * f * c)
  const xl = 2 * Math.PI * f * l
  const z = Math.hypot(r, xc)
  const phase = -Math.atan(xc / r) * (180 / Math.PI)
  const gain = (fq: number) => 20 * Math.log10(1 / Math.sqrt(1 + (fq / fc) ** 2))

  const plotW = W - PX - 14, plotH = H - 2 * PY - 14
  const cx = (fq: number) => PX + (Math.log10(fq / FMIN) / Math.log10(FMAX / FMIN)) * plotW
  const cy = (db: number) => PY + (-Math.max(DBMIN, db) / -DBMIN) * plotH
  const pts: string[] = []
  for (let k = 0; k <= 240; k++) {
    const fq = FMIN * Math.pow(FMAX / FMIN, k / 240)
    pts.push(`${cx(fq).toFixed(1)},${cy(gain(fq)).toFixed(1)}`)
  }
  const decades = [1, 10, 100, 1e3, 1e4, 1e5, 1e6]

  return (
    <Frame caption="A resistor in series with a capacitor, with the output taken across the capacitor (an RC low-pass filter). Low frequencies pass; high frequencies are cut. The corner is at fc = 1 / (2πRC).">
      <svg viewBox={`0 0 ${W} ${H}`} className="wsvg" role="img" aria-label="Frequency response of an RC low-pass filter">
        {[0, -20, -40, -60].map((db) => (
          <g key={db}>
            <line x1={PX} x2={W - 14} y1={cy(db)} y2={cy(db)} className="w-grid" />
            <text x={PX - 6} y={cy(db) + 4} textAnchor="end" className="w-t sm">{db} dB</text>
          </g>
        ))}
        {decades.map((d) => (
          <g key={d}>
            <line x1={cx(d)} x2={cx(d)} y1={PY} y2={PY + plotH} className="w-grid" />
            <text x={cx(d)} y={PY + plotH + 14} textAnchor="middle" className="w-t sm">{formatSI(d, 'Hz', 2)}</text>
          </g>
        ))}
        <line x1={PX} x2={W - 14} y1={cy(-3)} y2={cy(-3)} className="w-ref" />
        <text x={W - 18} y={cy(-3) - 5} textAnchor="end" className="w-t sm accent">{'−3 dB'}</text>
        <polyline points={pts.join(' ')} className="w-curve" />
        {fc >= FMIN && fc <= FMAX && <line x1={cx(fc)} x2={cx(fc)} y1={PY} y2={PY + plotH} className="w-ref" />}
        <circle cx={cx(Math.min(FMAX, Math.max(FMIN, f)))} cy={cy(gain(f))} r={5} className="w-dot" />
      </svg>
      <div className="widget-controls">
        <LogSlider label="Resistance" value={r} min={100} max={100000} onChange={setR} fmt={(n) => formatSI(n, 'Ω')} />
        <LogSlider label="Capacitance" value={c} min={10e-9} max={100e-6} onChange={setC} fmt={(n) => formatSI(n, 'F')} />
        <LogSlider label="Frequency" value={f} min={1} max={100000} onChange={setF} fmt={(n) => formatSI(n, 'Hz')} />
        <LogSlider label="Inductance" value={l} min={1e-3} max={10} onChange={setL} fmt={(n) => formatSI(n, 'H')} />
        <Readouts items={[
          ['Capacitor reactance Xᴄ', formatSI(xc, 'Ω'), '1 / (2πfC)'],
          ['Inductor reactance Xʟ', formatSI(xl, 'Ω'), '2πfL, at the same frequency'],
          ['Series RC impedance |Z|', formatSI(z, 'Ω'), '√(R² + Xᴄ²)'],
          ['Phase of current vs source', `${(-phase).toFixed(1)}° leading`, 'capacitor current leads'],
          ['Cutoff frequency fc', formatSI(fc, 'Hz')],
          ['Output / input at this f', `${gain(f).toFixed(1)} dB`, `${(Math.pow(10, gain(f) / 20) * 100).toFixed(0)}% of input`],
        ]} />
      </div>
    </Frame>
  )
}
