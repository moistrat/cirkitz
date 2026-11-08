import { useRef, useState } from 'react'
import { formatSI } from '../../sim/format'
import { Frame, LinSlider, LogSlider, Readouts, useFrame } from './shared'

const W = 640, H = 170

export function Water() {
  const [v, setV] = useState(6)
  const [r, setR] = useState(100)
  const i = v / r
  const g = useRef<SVGGElement>(null)
  const drops = useRef(Array.from({ length: 22 }, (_, k) => k / 22))
  const speed = Math.min(0.9, 0.12 + Math.log10(1 + i / 1e-3) * 0.28)

  useFrame((dt) => {
    drops.current = drops.current.map((p, k) => {
      const n = (p + dt * speed) % 1
      const c = g.current?.children[k] as SVGCircleElement | undefined
      if (c) {
        const x = 150 + n * 360
        c.setAttribute('cx', String(x))
        c.setAttribute('cy', String(85))
      }
      return n
    })
  })

  const level = 20 + (v / 12) * 100
  const gap = 14 + 40 * Math.max(0.08, Math.min(1, 100 / r)) // pipe opening (wider = lower resistance)

  return (
    <Frame caption="The water analogy: pressure is voltage, flow rate is current, and a narrow pipe is resistance. Same relationship: more pressure or a wider pipe means more flow.">
      <svg viewBox={`0 0 ${W} ${H}`} className="wsvg" role="img" aria-label="Water tank and pipe analogy">
        <rect x={30} y={140 - level} width={100} height={level} className="w-water" />
        <rect x={30} y={20} width={100} height={120} className="w-tank" fill="none" />
        <text x={80} y={160} textAnchor="middle" className="w-t sm">tank = battery</text>
        <path d={`M130 ${85 - gap / 2} H510 M130 ${85 + gap / 2} H510`} className="w-pipe" />
        <rect x={290} y={85 - gap / 2} width={60} height={gap} className="w-pipe-fill" opacity={0} />
        <path d={`M270 ${85 - 34} L290 ${85 - gap / 2} H350 L370 ${85 - 34} M270 ${85 + 34} L290 ${85 + gap / 2} H350 L370 ${85 + 34}`} className="w-pipe thick" />
        <g ref={g}>{drops.current.map((_, k) => <circle key={k} r={3} className="w-drop" />)}</g>
        <text x={320} y={150} textAnchor="middle" className="w-t sm">narrow section = resistor</text>
        <text x={560} y={90} textAnchor="middle" className="w-t sm">flow = current</text>
      </svg>
      <div className="widget-controls">
        <LinSlider label="Pressure" value={v} min={1} max={12} onChange={setV} fmt={(x) => `${x} V`} />
        <LogSlider label="Narrowness" value={r} min={10} max={10000} onChange={setR} fmt={(x) => formatSI(x, 'Ω')} />
        <Readouts items={[['Flow (current)', formatSI(i, 'A'), `${v} V / ${formatSI(r, 'Ω')}`]]} />
      </div>
    </Frame>
  )
}
