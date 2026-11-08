import { useEffect, useRef } from 'react'
import { Pt } from '../sim/types'
import { G } from './symbols'

export interface FlowEdge {
  id: string
  a: Pt
  b: Pt
  /** conventional current a → b, amps */
  i: number
}

const SPACING = 0.5 // grid units between charges
const MIN_I = 1e-7

/** cells per second, log-compressed so 1 mA and 1 A are both watchable */
export const flowSpeed = (i: number) => Math.min(6, 0.8 + 1.4 * Math.log10(1 + Math.abs(i) / 1e-4))

export function Flow({ edges }: { edges: FlowEdge[] }) {
  const gRef = useRef<SVGGElement>(null)
  const edgesRef = useRef(edges)
  edgesRef.current = edges
  const phases = useRef(new Map<string, number>())

  useEffect(() => {
    const g = gRef.current!
    let raf = 0
    let last = performance.now()
    const circles: SVGCircleElement[] = []
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      let used = 0
      for (const e of edgesRef.current) {
        if (Math.abs(e.i) < MIN_I) continue
        const dx = e.b.x - e.a.x, dy = e.b.y - e.a.y
        const len = Math.hypot(dx, dy)
        const dir = e.i > 0 ? 1 : -1
        const ph = ((phases.current.get(e.id) ?? 0) + dt * flowSpeed(e.i)) % SPACING
        phases.current.set(e.id, ph)
        // start at the upstream end; keep phase in the upstream frame so chains line up
        const n = Math.floor((len - ph) / SPACING) + 1
        for (let k = 0; k < n; k++) {
          const s = ph + k * SPACING
          if (s > len) break
          const t = dir > 0 ? s / len : 1 - s / len
          let c = circles[used]
          if (!c) {
            c = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
            c.setAttribute('r', '3.2')
            c.setAttribute('class', 'charge')
            g.appendChild(c)
            circles.push(c)
          }
          c.style.display = ''
          c.setAttribute('cx', String((e.a.x + dx * t) * G))
          c.setAttribute('cy', String((e.a.y + dy * t) * G))
          used++
        }
      }
      for (let k = used; k < circles.length; k++) circles[k].style.display = 'none'
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      circles.forEach((c) => c.remove())
    }
  }, [])

  return <g ref={gRef} style={{ pointerEvents: 'none' }} />
}
