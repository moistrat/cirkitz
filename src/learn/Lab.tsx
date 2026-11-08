import { useMemo, useState } from 'react'
import { Canvas } from '../editor/Canvas'
import { Slider } from '../editor/Slider'
import { analyze } from '../sim/netlist'
import { encodeCircuit } from '../sim/build'
import { LabSpec } from './types'

export function Lab({ lab }: { lab: LabSpec }) {
  const [vals, setVals] = useState<Record<string, number>>(() => Object.fromEntries(lab.params.map((p) => [p.key, p.value])))
  const built = useMemo(() => lab.build(vals), [lab, vals])
  const analysis = useMemo(() => analyze(built.circuit, { wireG: 1e5 }), [built])
  const readouts = lab.readouts(analysis, built, vals)
  return (
    <figure className="lab card">
      <div className="lab-main">
        <div className="lab-canvas">
          <Canvas circuit={built.circuit} analysis={analysis} fit showValues />
        </div>
        <div className="lab-controls">
          {lab.params.map((q) => (
            <Slider key={q.key} p={q} value={vals[q.key]} onChange={(v) => setVals({ ...vals, [q.key]: v })} />
          ))}
          <dl className="readouts">
            {readouts.map((r) => (
              <div key={r.label}>
                <dt>{r.label}</dt>
                <dd>{r.value}{r.hint && <small>{r.hint}</small>}</dd>
              </div>
            ))}
          </dl>
          {analysis.warnings.length > 0 && <p className="warn"><b>Warning</b>{analysis.warnings[0]}</p>}
        </div>
      </div>
      <figcaption>
        <span>{lab.caption ?? 'Interactive circuit. Drag the sliders and watch the numbers and the flow.'}</span>
        <a className="link" href={`#/sandbox/${encodeCircuit(built.circuit)}`}>Open in sandbox</a>
      </figcaption>
    </figure>
  )
}
