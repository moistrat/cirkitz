import { useMemo, useState } from 'react'
import { LESSONS } from '../data/lessons'
import { Canvas } from '../editor/Canvas'
import { Slider } from '../editor/Slider'
import { analyze } from '../sim/netlist'
import { encodeCircuit } from '../sim/build'
import { load, save } from '../state/storage'

export function Learn() {
  const [idx, setIdx] = useState(() => Math.min(LESSONS.length - 1, load<number>('iee.lesson', 0)))
  const lesson = LESSONS[idx]
  const [params, setParams] = useState<Record<string, number>>({})
  const p = useMemo(() => {
    const out: Record<string, number> = {}
    for (const q of lesson.params) out[q.key] = params[`${lesson.id}.${q.key}`] ?? q.value
    return out
  }, [lesson, params])

  const ladder = useMemo(() => lesson.build(p), [lesson, p])
  const analysis = useMemo(() => analyze(ladder.circuit, { wireG: 1e5 }), [ladder])
  const readouts = lesson.readouts(analysis, ladder, p)

  const go = (i: number) => { setIdx(i); save('iee.lesson', i); window.scrollTo({ top: 0 }) }

  return (
    <div className="page learn">
      <nav className="lesson-nav" aria-label="Lessons">
        {LESSONS.map((l, i) => (
          <button key={l.id} className={`lesson-tab ${i === idx ? 'active' : ''}`} onClick={() => go(i)}>
            <span className="num">{i + 1}</span>
            <span><b>{l.title}</b><small>{l.summary}</small></span>
          </button>
        ))}
      </nav>

      <article className="lesson">
        <h1>{lesson.title}</h1>
        {lesson.body.map((t, i) => <p key={i}>{t}</p>)}
        <div className="formula">{lesson.formula}</div>

        <div className="lesson-lab card">
          <div className="lab-canvas">
            <Canvas circuit={ladder.circuit} analysis={analysis} fit showValues />
          </div>
          <div className="lab-controls">
            {lesson.params.map((q) => (
              <Slider key={q.key} p={q} value={p[q.key]} onChange={(v) => setParams({ ...params, [`${lesson.id}.${q.key}`]: v })} />
            ))}
            <dl className="readouts">
              {readouts.map((r) => (
                <div key={r.label}>
                  <dt>{r.label}</dt>
                  <dd>{r.value}{r.hint && <small>{r.hint}</small>}</dd>
                </div>
              ))}
            </dl>
            {analysis.warnings.length > 0 && <p className="warn"><b>Warning:</b> {analysis.warnings[0]}</p>}
          </div>
        </div>

        <h3>Try it</h3>
        <ul>{lesson.tryIt.map((t, i) => <li key={i}>{t}</li>)}</ul>

        <div className="lesson-actions">
          <a className="btn" href={`#/sandbox/${encodeCircuit(ladder.circuit)}`}>Open this circuit in the sandbox</a>
          <a className="btn" href="#/quiz">Practice with a quiz</a>
          <span className="spacer" />
          {idx > 0 && <button className="btn" onClick={() => go(idx - 1)}>Previous</button>}
          {idx < LESSONS.length - 1 && <button className="btn primary" onClick={() => go(idx + 1)}>Next lesson</button>}
        </div>
      </article>
    </div>
  )
}
