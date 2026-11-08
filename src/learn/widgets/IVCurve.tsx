import { useState } from 'react'
import { formatSI } from '../../sim/format'
import { diodeI } from '../../sim/solver'
import { Frame, LinSlider, LogSlider, Readouts } from './shared'

const W = 640, H = 240, PX = 52, PY = 18
const VMIN = -1, VMAX = 3, IMAX = 0.03

export function IVCurve() {
  const [r, setR] = useState(150)
  const [v, setV] = useState(1.5)
  const plotW = W - PX - 14, plotH = H - 2 * PY - 14
  const cx = (x: number) => PX + ((x - VMIN) / (VMAX - VMIN)) * plotW
  const cy = (i: number) => PY + plotH - ((Math.max(-0.004, Math.min(IMAX, i)) + 0.004) / (IMAX + 0.004)) * plotH
  const rp: string[] = [], dp: string[] = []
  for (let k = 0; k <= 200; k++) {
    const x = VMIN + ((VMAX - VMIN) * k) / 200
    rp.push(`${cx(x).toFixed(1)},${cy(x / r).toFixed(1)}`)
    dp.push(`${cx(x).toFixed(1)},${cy(diodeI(x)).toFixed(1)}`)
  }
  return (
    <Frame caption="Current versus voltage. A resistor is a straight line through the origin (the slope is 1/R), which is what Ohm's law says. An LED is not a straight line: almost nothing flows until about 1.8 V, then current climbs steeply.">
      <svg viewBox={`0 0 ${W} ${H}`} className="wsvg" role="img" aria-label="I-V curves of a resistor and an LED">
        <line x1={PX} x2={W - 14} y1={cy(0)} y2={cy(0)} className="w-axis" />
        <line x1={cx(0)} x2={cx(0)} y1={PY} y2={PY + plotH} className="w-axis" />
        {[0, 10, 20, 30].map((ma) => (
          <g key={ma}>
            <line x1={PX} x2={W - 14} y1={cy(ma / 1000)} y2={cy(ma / 1000)} className="w-grid" />
            <text x={PX - 6} y={cy(ma / 1000) + 4} textAnchor="end" className="w-t sm">{ma} mA</text>
          </g>
        ))}
        {[-1, 0, 1, 2, 3].map((x) => (
          <text key={x} x={cx(x)} y={PY + plotH + 14} textAnchor="middle" className="w-t sm">{x} V</text>
        ))}
        <polyline points={rp.join(' ')} className="w-curve alt" />
        <polyline points={dp.join(' ')} className="w-curve" />
        <line x1={cx(v)} x2={cx(v)} y1={PY} y2={PY + plotH} className="w-ref" />
        <text x={W - 20} y={PY + 12} textAnchor="end" className="w-t sm accent">LED</text>
        <text x={W - 20} y={PY + 28} textAnchor="end" className="w-t sm">resistor</text>
      </svg>
      <div className="widget-controls">
        <LinSlider label="Voltage" value={v} min={-1} max={3} step={0.05} onChange={setV} fmt={(n) => `${n.toFixed(2)} V`} />
        <LogSlider label="Resistor" value={r} min={50} max={1000} onChange={setR} fmt={(n) => formatSI(n, 'Ω')} />
        <Readouts items={[
          ['Resistor current', formatSI(v / r, 'A'), 'V / R, proportional to V'],
          ['LED current', formatSI(diodeI(v), 'A'), v < 1.5 ? 'essentially off' : 'steeply rising'],
        ]} />
      </div>
    </Frame>
  )
}
