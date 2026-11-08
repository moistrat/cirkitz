import { useRef, useState } from 'react'
import { formatSI } from '../../sim/format'
import { Frame, LinSlider, LogSlider, Readouts, useFrame } from './shared'

type Shape = 'sine' | 'square' | 'triangle'
const W = 640, H = 220, PX = 44, PY = 20

const wave = (shape: Shape, ph: number) => {
  const x = ph - Math.floor(ph)
  if (shape === 'sine') return Math.sin(2 * Math.PI * x)
  if (shape === 'square') return x < 0.5 ? 1 : -1
  return x < 0.25 ? 4 * x : x < 0.75 ? 2 - 4 * x : 4 * x - 4
}
const RMS: Record<Shape, number> = { sine: Math.SQRT1_2, square: 1, triangle: 1 / Math.sqrt(3) }

export function Wave() {
  const [shape, setShape] = useState<Shape>('sine')
  const [amp, setAmp] = useState(5)
  const [f, setF] = useState(60)
  const [mode, setMode] = useState<'ac' | 'dc'>('ac')
  const marker = useRef<SVGGElement>(null)
  const readout = useRef<SVGTextElement>(null)
  const t = useRef(0)

  const plotW = W - PX - 12, plotH = H - 2 * PY
  const cx = (u: number) => PX + u * plotW
  const cy = (v: number) => PY + plotH / 2 - (v / amp) * (plotH / 2 - 8)
  const periods = 3
  const pts: string[] = []
  for (let k = 0; k <= 600; k++) {
    const u = k / 600
    pts.push(`${cx(u).toFixed(1)},${cy(mode === 'dc' ? amp * RMS[shape] : amp * wave(shape, u * periods)).toFixed(1)}`)
  }
  const vrms = amp * RMS[shape]

  useFrame((dt) => {
    t.current = (t.current + dt / 6) % 1 // slow motion: a full sweep takes 6 s
    const u = t.current
    const v = mode === 'dc' ? vrms : amp * wave(shape, u * periods)
    marker.current?.setAttribute('transform', `translate(${cx(u)},${cy(v)})`)
    if (readout.current) readout.current.textContent = `${v.toFixed(2)} V`
  })

  return (
    <Frame caption="Time runs left to right (shown in slow motion, three full cycles). DC holds one value. AC swings above and below zero, and the RMS value is the DC level that would heat a resistor equally.">
      <svg viewBox={`0 0 ${W} ${H}`} className="wsvg" role="img" aria-label="Voltage versus time">
        <line x1={PX} x2={W - 12} y1={cy(0)} y2={cy(0)} className="w-axis" />
        <line x1={PX} x2={PX} y1={PY} y2={H - PY} className="w-axis" />
        <text x={PX - 6} y={cy(amp) + 4} textAnchor="end" className="w-t sm">+{amp} V</text>
        <text x={PX - 6} y={cy(0) + 4} textAnchor="end" className="w-t sm">0</text>
        <text x={PX - 6} y={cy(-amp) + 4} textAnchor="end" className="w-t sm">{'−'}{amp} V</text>
        {mode === 'ac' && <line x1={PX} x2={W - 12} y1={cy(vrms)} y2={cy(vrms)} className="w-ref" />}
        {mode === 'ac' && <text x={W - 16} y={cy(vrms) - 5} textAnchor="end" className="w-t sm accent">RMS {vrms.toFixed(2)} V</text>}
        <polyline points={pts.join(' ')} className="w-curve" />
        <g ref={marker}>
          <circle r={5} className="w-dot" />
          <text ref={readout} x={9} y={-9} className="w-t sm" />
        </g>
        <text x={W / 2} y={H - 3} textAnchor="middle" className="w-t sm">time</text>
      </svg>
      <div className="widget-controls">
        <div className="seg" role="group" aria-label="Signal type">
          <button className={mode === 'ac' ? 'on' : ''} onClick={() => setMode('ac')}>AC</button>
          <button className={mode === 'dc' ? 'on' : ''} onClick={() => setMode('dc')}>DC (equivalent)</button>
        </div>
        <div className="seg" role="group" aria-label="Waveform shape">
          {(['sine', 'square', 'triangle'] as Shape[]).map((s) => (
            <button key={s} className={shape === s ? 'on' : ''} onClick={() => setShape(s)}>{s}</button>
          ))}
        </div>
        <LinSlider label="Peak" value={amp} min={1} max={12} onChange={setAmp} fmt={(v) => `${v} V`} />
        <LogSlider label="Frequency" value={f} min={1} max={1000} onChange={setF} fmt={(v) => formatSI(v, 'Hz')} />
        <Readouts items={[
          ['Period T = 1/f', formatSI(1 / f, 's')],
          ['Peak-to-peak', `${(2 * amp).toFixed(1)} V`],
          ['RMS', `${vrms.toFixed(2)} V`, shape === 'sine' ? 'peak / √2' : shape === 'square' ? 'equals the peak' : 'peak / √3'],
          ['Average over a cycle', '0 V', 'AC has no net DC component'],
        ]} />
      </div>
    </Frame>
  )
}
