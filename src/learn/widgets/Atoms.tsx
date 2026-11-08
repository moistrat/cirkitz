import { useRef, useState } from 'react'
import { Frame, LinSlider, useFrame } from './shared'

const W = 640, H = 150, N = 26

interface E { x: number; y: number }

export function Atoms() {
  const [material, setMaterial] = useState<'copper' | 'rubber'>('copper')
  const [volts, setVolts] = useState(6)
  const g = useRef<SVGGElement>(null)
  const es = useRef<E[]>(Array.from({ length: N }, () => ({ x: 40 + Math.random() * (W - 80), y: 30 + Math.random() * (H - 60) })))
  const drift = material === 'copper' ? volts * 9 : 0

  useFrame((dt) => {
    const jitter = material === 'copper' ? 55 : 10
    es.current.forEach((e, i) => {
      e.x += (Math.random() - 0.5) * jitter * dt * 6 + drift * dt
      e.y += (Math.random() - 0.5) * jitter * dt * 6
      if (e.x > W - 36) e.x = 36
      if (e.x < 36) e.x = W - 36
      e.y = Math.max(26, Math.min(H - 26, e.y))
      const c = g.current?.children[i] as SVGCircleElement | undefined
      if (c) { c.setAttribute('cx', String(e.x)); c.setAttribute('cy', String(e.y)) }
    })
  })

  const ions = []
  for (let r = 0; r < 3; r++) for (let c = 0; c < 14; c++) ions.push({ x: 60 + c * 40 + (r % 2) * 20, y: 38 + r * 37 })

  return (
    <Frame caption="Simplified view of a wire: fixed positive ions form the lattice, and free electrons wander randomly. A voltage adds a gentle net drift toward the positive terminal.">
      <svg viewBox={`0 0 ${W} ${H}`} className="wsvg" role="img" aria-label="Electrons drifting through a metal lattice">
        <rect x={30} y={16} width={W - 60} height={H - 32} rx={6} className="w-box" />
        {ions.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={6} className="w-ion" />)}
        <g ref={g}>
          {es.current.map((_, i) => <circle key={i} r={3.2} className={material === 'copper' ? 'w-e' : 'w-e dim'} />)}
        </g>
        <text x={8} y={H / 2 + 4} className="w-t">{'−'}</text>
        <text x={W - 16} y={H / 2 + 4} className="w-t">+</text>
      </svg>
      <div className="widget-controls">
        <div className="seg" role="group" aria-label="Material">
          <button className={material === 'copper' ? 'on' : ''} onClick={() => setMaterial('copper')}>Copper (conductor)</button>
          <button className={material === 'rubber' ? 'on' : ''} onClick={() => setMaterial('rubber')}>Rubber (insulator)</button>
        </div>
        <LinSlider label="Voltage" value={volts} min={0} max={12} onChange={setVolts} fmt={(v) => `${v} V`} />
        <p className="muted small">
          {material === 'copper'
            ? volts === 0 ? 'No voltage: the electrons jiggle randomly but go nowhere on average.' : 'Electrons drift toward + (electron flow). Conventional current is drawn the opposite way, toward the negative terminal.'
            : 'Rubber holds its electrons tightly bound to atoms. There are almost no free charges, so even at 12 V essentially nothing flows.'}
        </p>
      </div>
    </Frame>
  )
}
