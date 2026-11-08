import { useEffect, useRef, useState } from 'react'
import { Api, Ctx, STEPS } from './steps'

interface Props {
  index: number
  ctx: Ctx
  api: Api
  onAdvance: () => void
  onExit: () => void
  onRestart: () => void
}

const Check = () => (
  <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden>
    <path d="M3 8.5l3.2 3L13 4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export function Tutorial({ index, ctx, api, onAdvance, onExit, onRestart }: Props) {
  const step = STEPS[index]
  const entered = useRef(-1)
  const [complete, setComplete] = useState(false)
  const doneNow = !step.info && !!step.done?.(ctx)

  // one-time setup per step
  useEffect(() => {
    if (entered.current === index) return
    entered.current = index
    setComplete(false)
    step.setup?.(api)
  }) // eslint-disable-line react-hooks/exhaustive-deps

  // spotlight a piece of UI
  useEffect(() => {
    if (!step.focus) return
    const el = document.querySelector(step.focus)
    el?.classList.add('tour-focus')
    return () => el?.classList.remove('tour-focus')
  }, [step.focus, index])

  // auto-advance shortly after the task is completed
  useEffect(() => {
    if (!doneNow) return
    setComplete(true)
    const t = setTimeout(onAdvance, 950)
    return () => clearTimeout(t)
  }, [doneNow, index]) // eslint-disable-line react-hooks/exhaustive-deps

  const hint = step.hint?.(ctx)

  if (index === 0) {
    return (
      <div className="tour-backdrop" role="dialog" aria-modal="true" aria-labelledby="tour-title">
        <div className="tour-welcome">
          <p className="eyebrow">Interactive tutorial</p>
          <h2 id="tour-title">{step.title}</h2>
          <p>{step.body}</p>
          <ul>
            <li>Build a battery, resistor and LED circuit yourself</li>
            <li>Read voltage, current and power, and change values</li>
            <li>Break it, undo it, and take a quick quiz</li>
          </ul>
          <div className="tour-actions">
            <button className="btn primary" onClick={onAdvance} autoFocus>Start the tutorial</button>
            <button className="btn" onClick={onExit}>No thanks</button>
          </div>
          <p className="muted small">You can open it again any time from the Tutorial button in the header.</p>
        </div>
      </div>
    )
  }

  const total = STEPS.length - 1
  return (
    <div className="tour-card" role="dialog" aria-live="polite" aria-labelledby="tour-title">
      <div className="tour-top">
        <span className="eyebrow">Tutorial, step {index} of {total}</span>
        <button className="link" onClick={onExit}>Exit</button>
      </div>
      <div className="tour-progress" aria-hidden><i style={{ width: `${(index / total) * 100}%` }} /></div>
      <h3 id="tour-title">{step.title}</h3>
      <p>{step.body}</p>
      {hint && !complete && <p className="tour-hint">{hint}</p>}
      {complete && <p className="tour-done"><Check /> Done</p>}
      <div className="tour-actions">
        {step.info ? (
          index === STEPS.length - 1 ? (
            <>
              <button className="btn primary" onClick={onExit} autoFocus>Finish</button>
              <button className="btn" onClick={onRestart}>Restart</button>
            </>
          ) : (
            <button className="btn primary" onClick={onAdvance} autoFocus>Continue</button>
          )
        ) : (
          !complete && (
            <button className="btn" onClick={() => { step.autofill?.(api); if (!step.autofill) onAdvance() }}
              title={step.autofill ? 'Performs this step for you' : 'Skip this step'}>
              {step.autofill ? 'Do it for me' : 'Skip step'}
            </button>
          )
        )}
      </div>
    </div>
  )
}
