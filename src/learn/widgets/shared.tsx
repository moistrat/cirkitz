import { ReactNode, useEffect, useRef } from 'react'

/** Calls fn(dtSeconds, nowSeconds) every animation frame. */
export function useFrame(fn: (dt: number, now: number) => void) {
  const ref = useRef(fn)
  ref.current = fn
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const tick = (t: number) => {
      ref.current(Math.min(0.05, (t - last) / 1000), t / 1000)
      last = t
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])
}

export function Frame({ children, caption }: { children: ReactNode; caption?: string }) {
  return (
    <figure className="widget card">
      {children}
      {caption && <figcaption><span>{caption}</span></figcaption>}
    </figure>
  )
}

export function Row({ label, children, value }: { label: string; children: ReactNode; value: string }) {
  return (
    <label className="slider">
      <span className="slider-label">{label}</span>
      {children}
      <span className="slider-value">{value}</span>
    </label>
  )
}

export const logMap = (pos: number, min: number, max: number) => min * Math.pow(max / min, pos / 1000)
export const logPos = (v: number, min: number, max: number) => (Math.log(v / min) / Math.log(max / min)) * 1000
export const round2 = (x: number) => Number(x.toPrecision(2))

export function LogSlider({ label, value, min, max, onChange, fmt }: {
  label: string; value: number; min: number; max: number; onChange: (v: number) => void; fmt: (v: number) => string
}) {
  return (
    <Row label={label} value={fmt(value)}>
      <input type="range" min={0} max={1000} value={logPos(value, min, max)}
        onChange={(e) => onChange(round2(logMap(Number(e.target.value), min, max)))} />
    </Row>
  )
}

export function LinSlider({ label, value, min, max, step = 1, onChange, fmt }: {
  label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; fmt: (v: number) => string
}) {
  return (
    <Row label={label} value={fmt(value)}>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </Row>
  )
}

export function Readouts({ items }: { items: [string, string, string?][] }) {
  return (
    <dl className="readouts">
      {items.map(([k, v, h]) => (
        <div key={k}><dt>{k}</dt><dd>{v}{h && <small>{h}</small>}</dd></div>
      ))}
    </dl>
  )
}
