import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { Canvas, Tool } from '../editor/Canvas'
import { QuizCard } from '../editor/QuizCard'
import { designators, SymbolBody } from '../editor/symbols'
import { PRESETS } from '../data/presets'
import { analyze, EMPTY } from '../sim/netlist'
import { decodeCircuit, encodeCircuit, isCircuit } from '../sim/build'
import { formatSI, parseSI } from '../sim/format'
import { Question, sandboxQuestion } from '../sim/quizGen'
import { Circuit, KINDS, Kind, Rot } from '../sim/types'
import { initialState, reducer } from '../state/editorState'
import { load, save } from '../state/storage'
import { Tutorial } from '../tutorial/Tutorial'
import { STEPS } from '../tutorial/steps'
import { Guide } from '../tutorial/steps'

const STORE = 'iee.sandbox.v1'
const ORDER: Kind[] = ['battery', 'resistor', 'bulb', 'led', 'switch', 'isource']

function startCircuit(): Circuit {
  const saved = load<unknown>(STORE, null)
  return isCircuit(saved) && saved.parts.length ? saved : PRESETS[0].build()
}

const TOUR_SEEN = 'iee.tutorial.seen'

export function Sandbox({ shared, tutorialRequest = 0 }: { shared?: string; tutorialRequest?: number }) {
  const [main, dispatchMain] = useReducer(reducer, undefined, () => initialState(startCircuit()))
  const [tutState, dispatchTut] = useReducer(reducer, undefined, () => initialState())
  // null = not in tutorial. The tutorial runs on its own scratch board so saved work is never touched.
  const [tour, setTour] = useState<number | null>(() => (!shared && !load<boolean>(TOUR_SEEN, false) ? 0 : null))
  const [probed, setProbed] = useState(false)
  const state = tour !== null ? tutState : main
  const dispatch = tour !== null ? dispatchTut : dispatchMain
  const [tool, setTool] = useState<Tool>({ type: 'select' })
  const [flowOn, setFlowOn] = useState(true)
  const [showValues, setShowValues] = useState(true)
  const [quiz, setQuiz] = useState<Question | null>(null)
  const [toast, setToast] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const { circuit, selected } = state

  const analysis = useMemo(() => (circuit.parts.length ? analyze(circuit) : EMPTY), [circuit])
  const names = useMemo(() => designators(circuit), [circuit])
  const part = circuit.parts.find((p) => p.id === selected)

  useEffect(() => { if (tour === null) save(STORE, main.circuit) }, [main.circuit, tour])
  useEffect(() => { if (quiz) setQuiz(null) }, [circuit]) // eslint-disable-line react-hooks/exhaustive-deps

  const startTour = () => {
    dispatchTut({ type: 'reset' })
    setTool({ type: 'select' })
    setQuiz(null)
    setProbed(false)
    setTour(0)
  }
  const endTour = () => {
    save(TOUR_SEEN, true)
    setTour(null)
    setTool({ type: 'select' })
    setQuiz(null)
  }
  const advanceTour = () => setTour((t) => (t === null ? t : Math.min(t + 1, STEPS.length - 1)))
  useEffect(() => { if (tutorialRequest > 0) startTour() }, [tutorialRequest]) // eslint-disable-line react-hooks/exhaustive-deps

  const guides: Guide | undefined = useMemo(() => {
    if (tour === null) return undefined
    return STEPS[tour].guide?.({ circuit, analysis, selected, tool, quizOpen: !!quiz, probed })
  }, [tour, circuit, analysis, selected, tool, quiz, probed])

  useEffect(() => {
    if (!shared) return
    const c = decodeCircuit(shared)
    if (c) dispatchMain({ type: 'load', circuit: c })
    history.replaceState(null, '', '#/sandbox')
  }, [shared])

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2200) }

  // keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT') return
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); dispatch({ type: e.shiftKey ? 'redo' : 'undo' }) }
      else if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); dispatch({ type: 'redo' }) }
      else if (e.key === 'Escape') { setTool({ type: 'select' }); dispatch({ type: 'select', id: null }) }
      else if ((e.key === 'Delete' || e.key === 'Backspace') && selected) { e.preventDefault(); dispatch({ type: 'remove', id: selected }) }
      else if (e.key.toLowerCase() === 'r' && !mod) {
        if (tool.type === 'place') setTool({ ...tool, rot: ((tool.rot + 1) % 4) as Rot })
        else if (selected) dispatch({ type: 'rotate', id: selected })
      } else if (e.key.toLowerCase() === 'e') setTool({ type: 'erase' })
      else if (e.key.toLowerCase() === 'v') setTool({ type: 'select' })
      else if (/^[1-6]$/.test(e.key)) setTool({ type: 'place', kind: ORDER[Number(e.key) - 1], rot: 0 })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected, tool, dispatch])

  const exportJson = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(circuit, null, 2)], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'circuit.json'
    a.click()
    URL.revokeObjectURL(url)
  }
  const importJson = async (f?: File) => {
    if (!f) return
    try {
      const c = JSON.parse(await f.text())
      if (!isCircuit(c)) throw new Error()
      dispatch({ type: 'load', circuit: c })
      flash('Circuit loaded')
    } catch { flash('That file is not a valid circuit') }
    if (fileRef.current) fileRef.current.value = ''
  }
  const share = async () => {
    const url = `${location.origin}${location.pathname}#/sandbox/${encodeCircuit(circuit)}`
    try { await navigator.clipboard.writeText(url); flash('Share link copied') }
    catch { prompt('Copy this link:', url) }
  }
  const startQuiz = () => {
    const q = sandboxQuestion(circuit, analysis)
    if (!q) flash('Build a circuit with a working loop first')
    else setQuiz(q)
  }

  const hint =
    tool.type === 'place' ? `Click the grid to place a ${KINDS[tool.kind].label}. R rotates, Esc cancels.`
    : tool.type === 'erase' ? 'Click or drag over parts and wires to delete them.'
    : 'Drag from a grid point or part terminal to draw wires. Drag parts to move them. Click a switch to toggle it. Hover a wire to probe its voltage.'

  return (
    <div className="page sandbox">
      <aside className="toolbox card">
        <h2>Parts</h2>
        {ORDER.map((k, i) => {
          const active = tool.type === 'place' && tool.kind === k
          return (
            <button key={k} className={`part-btn ${active ? 'active' : ''}`} title={KINDS[k].blurb}
              onClick={() => setTool(active ? { type: 'select' } : { type: 'place', kind: k, rot: 0 })}>
              <svg viewBox="-6 -30 76 60" width="52" height="40" aria-hidden>
                <g className="mini"><SymbolBody kind={k} closed glow={0} /></g>
              </svg>
              <span>{KINDS[k].label}<kbd>{i + 1}</kbd></span>
            </button>
          )
        })}
        <h2>Tools</h2>
        <div className="tool-row">
          <button className={`btn ${tool.type === 'select' ? 'primary' : ''}`} onClick={() => setTool({ type: 'select' })}>Wire / move <kbd>V</kbd></button>
          <button className={`btn ${tool.type === 'erase' ? 'primary' : ''}`} onClick={() => setTool({ type: 'erase' })}>Erase <kbd>E</kbd></button>
        </div>
        <h2>Examples</h2>
        <select value="" onChange={(e) => { const p = PRESETS.find((x) => x.id === e.target.value); if (p) dispatch({ type: 'load', circuit: p.build() }) }} aria-label="Load an example circuit">
          <option value="">Load an example…</option>
          {PRESETS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </aside>

      <section className="stage">
        <div className="toolbar card">
          <button className="btn" onClick={() => dispatch({ type: 'undo' })} disabled={!state.past.length} title="Undo (Ctrl/⌘Z)">Undo</button>
          <button className="btn" onClick={() => dispatch({ type: 'redo' })} disabled={!state.future.length} title="Redo">Redo</button>
          <button className="btn" onClick={() => { if (!circuit.parts.length || confirm('Clear the whole circuit?')) dispatch({ type: 'clear' }) }}>Clear</button>
          <span className="spacer" />
          <label className="check"><input type="checkbox" checked={flowOn} onChange={(e) => setFlowOn(e.target.checked)} /> Current flow</label>
          <label className="check"><input type="checkbox" checked={showValues} onChange={(e) => setShowValues(e.target.checked)} /> Values</label>
          <button className="btn" onClick={share}>Share link</button>
          <button className="btn" onClick={exportJson}>Export</button>
          <button className="btn" onClick={() => fileRef.current?.click()}>Import</button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => importJson(e.target.files?.[0])} />
        </div>

        <div className="canvas-wrap card">
          <Canvas circuit={circuit} analysis={analysis} dispatch={dispatch} editable tool={tool}
            selected={selected} flowOn={flowOn} showValues={showValues}
            hideMeasurements={!!quiz} highlight={quiz?.target}
            guides={guides} onProbe={() => setProbed(true)} />
          {!circuit.parts.length && (
            <div className="empty-hint">
              <h3>Start building</h3>
              <p>Pick a part on the left (try a Battery), click the grid to place it, then drag between the dots to wire a loop. Or load an example.</p>
            </div>
          )}
        </div>
        <p className="hint">{hint}</p>
        {toast && <div className="toast" role="status">{toast}</div>}
      {tour !== null && (
          <Tutorial index={tour} onAdvance={advanceTour} onExit={endTour} onRestart={startTour}
            ctx={{ circuit, analysis, selected, tool, quizOpen: !!quiz, probed }}
            api={{ dispatch, circuit, setTool }} />
        )}
      </section>


      <aside className="side">
        {analysis.warnings.map((w) => <div key={w} className="card warn"><b>Warning</b>{w}</div>)}

        {quiz ? (
          <div>
            <div className="card-head"><h2>Quiz: this circuit</h2><button className="btn ghost" onClick={() => setQuiz(null)}>Close</button></div>
            <QuizCard q={quiz} nextLabel="Another" onNext={() => setQuiz(sandboxQuestion(circuit, analysis) ?? null)} />
          </div>
        ) : (
          <div className="card inspector">
            {part ? (
              <>
                <h2>{names.get(part.id)} · {KINDS[part.kind].label}</h2>
                <p className="muted">{KINDS[part.kind].blurb}</p>
                {KINDS[part.kind].editable && (
                  <ValueField key={part.id + part.value} unit={KINDS[part.kind].unit} value={part.value}
                    onCommit={(v) => dispatch({ type: 'setValue', id: part.id, value: v })} />
                )}
                {part.kind === 'switch' && (
                  <button className="btn" onClick={() => dispatch({ type: 'toggleSwitch', id: part.id })}>{part.closed ? 'Open the switch' : 'Close the switch'}</button>
                )}
                <Measurements part={part} analysis={analysis} />
                <div className="tool-row">
                  <button className="btn" onClick={() => dispatch({ type: 'rotate', id: part.id })}>Rotate <kbd>R</kbd></button>
                  <button className="btn danger" onClick={() => dispatch({ type: 'remove', id: part.id })}>Delete</button>
                </div>
              </>
            ) : (
              <>
                <h2>Inspector</h2>
                <p className="muted">Click a part to see its voltage, current and power, and to change its value.</p>
                <ul className="tips">
                  <li>Charges move from + around to −. Faster = more current.</li>
                  <li>Wire color shows voltage: red is high, blue is low.</li>
                  <li>The ground symbol marks 0 V, the first battery’s negative side.</li>
                  <li>Hover any wire or terminal to read its voltage.</li>
                </ul>
              </>
            )}
            <button className="btn primary wide quiz-btn" onClick={startQuiz}>Quiz me on this circuit</button>
          </div>
        )}
      </aside>
    </div>
  )
}

function ValueField({ unit, value, onCommit }: { unit: string; value: number; onCommit: (v: number) => void }) {
  const [text, setText] = useState(formatSI(value, unit))
  const [bad, setBad] = useState(false)
  const commit = () => {
    const v = parseSI(text)
    if (isFinite(v) && v > 0) { setBad(false); onCommit(v) } else setBad(true)
  }
  return (
    <label className="field">
      <span>Value</span>
      <input className={bad ? 'bad' : ''} value={text} onChange={(e) => setText(e.target.value)}
        onBlur={commit} onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
        aria-label="Component value" />
      <small>{bad ? 'Try 4.7k, 220, 12…' : 'e.g. 4.7k, 220, 12'}</small>
    </label>
  )
}

function Measurements({ part, analysis }: { part: Circuit['parts'][number]; analysis: ReturnType<typeof analyze> }) {
  const r = analysis.parts.get(part.id)
  if (!r) return null
  const supplying = part.kind === 'battery' || part.kind === 'isource'
  const absI = Math.abs(r.i), absV = Math.abs(r.v)
  return (
    <dl className="readouts">
      <div><dt>Voltage</dt><dd>{formatSI(absV, 'V')}</dd></div>
      <div><dt>Current</dt><dd>{formatSI(absI, 'A')}</dd></div>
      <div><dt>{supplying ? 'Power supplied' : 'Power used'}</dt><dd>{formatSI(Math.abs(r.p), 'W')}</dd></div>
      {absI > 1e-9 && !supplying && part.kind !== 'switch' && (
        <div><dt>V ÷ I</dt><dd>{formatSI(absV / absI, 'Ω')}<small>{part.kind === 'led' ? 'LEDs are not constant-R' : 'Ohm’s law'}</small></dd></div>
      )}
    </dl>
  )
}
