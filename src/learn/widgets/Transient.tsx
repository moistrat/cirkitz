import { useRef, useState } from 'react'
import { formatSI } from '../../sim/format'
import { Frame, LinSlider, LogSlider, Readouts, useFrame } from './shared'

const W = 640, H = 230, PX = 52, PY = 22

export function Transient({ mode }: { mode: 'rc' | 'rl' }) {
  const rc = mode === 'rc'
  const [v, setV] = useState(9)
  const [r, setR] = useState(rc ? 10000 : 100)
  const [x, setX] = useState(rc ? 100e-6 : 0.1) // C in farads, or L in henries
  const [charging, setCharging] = useState(true)
  const tau = rc ? r * x : x / r
  const marker = useRef<SVGGElement>(null)
  const readout = useRef<SVGTextElement>(null)
  const prog = useRef(0)

  const plotW = W - PX - 14, plotH = H - 2 * PY - 14
  const span = 5 // show 5 time constants
  const frac = (n: number) => (charging ? 1 - Math.exp(-n * span) : Math.exp(-n * span))
  const cx = (u: number) => PX + u * plotW
  const cy = (f: number) => PY + plotH - f * plotH
  const pts: string[] = []
  for (let k = 0; k <= 200; k++) pts.push(`${cx(k / 200).toFixed(1)},${cy(frac(k / 200)).toFixed(1)}`)
  const final = rc ? v : v / r
  const unit = rc ? 'V' : 'A'

  useFrame((dt) => {
    prog.current = (prog.current + dt / 5) % 1.15 // pause briefly at the end
    const u = Math.min(1, prog.current)
    const f = frac(u)
    marker.current?.setAttribute('transform', `translate(${cx(u)},${cy(f)})`)
    if (readout.current) readout.current.textContent = `${formatSI(f * final, unit)} at ${formatSI(u * span * tau, 's')}`
  })

  const tauX = cx(1 / span)
  const tauF = charging ? 1 - Math.exp(-1) : Math.exp(-1)

  return (
    <Frame caption={rc
      ? 'A capacitor charging through a resistor. The voltage rises quickly at first, then slows as the gap to the source shrinks. After one time constant it has covered 63% of the way.'
      : 'Current growing in an inductor through a resistor. The inductor fights the change, so current ramps up gradually and settles at V/R.'}>
      <svg viewBox={`0 0 ${W} ${H}`} className="wsvg" role="img" aria-label="Charging curve">
        <line x1={PX} x2={W - 14} y1={cy(0)} y2={cy(0)} className="w-axis" />
        <line x1={PX} x2={PX} y1={PY} y2={cy(0)} className="w-axis" />
        <line x1={PX} x2={W - 14} y1={cy(1)} y2={cy(1)} className="w-grid" />
        <text x={PX - 6} y={cy(1) + 4} textAnchor="end" className="w-t sm">{formatSI(final, unit)}</text>
        <text x={PX - 6} y={cy(0) + 4} textAnchor="end" className="w-t sm">0</text>
        {[1, 2, 3, 4, 5].map((n) => (
          <g key={n}>
            <line x1={cx(n / span)} x2={cx(n / span)} y1={cy(0)} y2={cy(0) + 5} className="w-axis" />
            <text x={cx(n / span)} y={cy(0) + 18} textAnchor="middle" className="w-t sm">{n}{'τ'}</text>
          </g>
        ))}
        <line x1={tauX} x2={tauX} y1={cy(tauF)} y2={cy(0)} className="w-ref" />
        <line x1={PX} x2={tauX} y1={cy(tauF)} y2={cy(tauF)} className="w-ref" />
        <text x={tauX + 6} y={cy(tauF) - 6} className="w-t sm accent">{charging ? '63.2%' : '36.8%'} at {'τ'}</text>
        <polyline points={pts.join(' ')} className="w-curve" />
        <g ref={marker}><circle r={5} className="w-dot" /><text ref={readout} x={-8} y={-12} textAnchor="end" className="w-t sm" /></g>
      </svg>
      <div className="widget-controls">
        <div className="seg" role="group" aria-label="Direction">
          <button className={charging ? 'on' : ''} onClick={() => setCharging(true)}>{rc ? 'Charging' : 'Energizing'}</button>
          <button className={!charging ? 'on' : ''} onClick={() => setCharging(false)}>{rc ? 'Discharging' : 'De-energizing'}</button>
        </div>
        <LinSlider label="Source" value={v} min={1} max={24} onChange={setV} fmt={(n) => `${n} V`} />
        <LogSlider label="Resistance" value={r} min={rc ? 100 : 10} max={rc ? 100000 : 10000} onChange={setR} fmt={(n) => formatSI(n, 'Ω')} />
        {rc
          ? <LogSlider label="Capacitance" value={x} min={1e-6} max={10e-3} onChange={setX} fmt={(n) => formatSI(n, 'F')} />
          : <LogSlider label="Inductance" value={x} min={1e-3} max={10} onChange={setX} fmt={(n) => formatSI(n, 'H')} />}
        <Readouts items={[
          [`Time constant τ`, formatSI(tau, 's'), rc ? 'τ = R × C' : 'τ = L / R'],
          ['Practically settled (5τ)', formatSI(5 * tau, 's'), 'over 99%'],
          [rc ? 'Final voltage' : 'Final current', formatSI(final, unit)],
        ]} />
      </div>
    </Frame>
  )
}
