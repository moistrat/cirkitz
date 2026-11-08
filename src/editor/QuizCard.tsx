import { useEffect, useRef, useState } from 'react'
import { Question, checkAnswer } from '../sim/quizGen'
import { formatSI, parseSI } from '../sim/format'

interface Props {
  q: Question
  onResult?: (correct: boolean) => void
  onNext: () => void
  nextLabel?: string
}

export function QuizCard({ q, onResult, onNext, nextLabel = 'Next question' }: Props) {
  const [text, setText] = useState('')
  const [state, setState] = useState<'ask' | 'right' | 'wrong' | 'revealed'>('ask')
  const [tries, setTries] = useState(0)
  const [note, setNote] = useState('')
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setText(''); setState('ask'); setTries(0); setNote('')
    input.current?.focus()
  }, [q.id])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (state === 'right' || state === 'revealed') return onNext()
    const guess = parseSI(text)
    if (!isFinite(guess)) { setNote('Enter a number, e.g. 12, 4.7k or 25m.'); return }
    if (checkAnswer(q, guess)) {
      setState('right'); setNote('')
      if (tries === 0) onResult?.(true)
    } else {
      setTries(tries + 1)
      if (tries === 0) onResult?.(false)
      const ratio = guess / q.answer
      const mag = Math.log10(ratio)
      if (ratio > 0 && Math.abs(mag - Math.round(mag)) < 0.03 && Math.round(mag) !== 0)
        setNote('The digits are right but the unit prefix is off — check milli (m), kilo (k)…')
      else setNote(ratio > 1 ? 'Too high — try again.' : 'Too low — try again.')
      setState('wrong')
    }
  }

  const done = state === 'right' || state === 'revealed'
  return (
    <form className={`card quiz-card ${state}`} onSubmit={submit}>
      <p className="q-prompt">{q.prompt}</p>
      <div className="q-row">
        <input
          ref={input}
          value={text}
          onChange={(e) => { setText(e.target.value); if (state === 'wrong') setState('ask') }}
          placeholder="Your answer"
          inputMode="decimal"
          autoComplete="off"
          aria-label="Your answer"
          disabled={done}
        />
        <span className="unit">{q.unit}</span>
        {!done && <button className="btn primary" type="submit">Check</button>}
        {done && <button className="btn primary" type="submit" autoFocus>{nextLabel} →</button>}
      </div>
      {note && state !== 'right' && <p className="q-note">{note}</p>}
      {state === 'right' && <p className="q-good">✓ Correct! {formatSI(q.answer, q.unit)}</p>}
      {!done && tries >= 1 && (
        <button type="button" className="btn ghost" onClick={() => { setState('revealed'); setNote('') }}>
          Show answer
        </button>
      )}
      {done && (
        <div className="q-explain">
          {state === 'revealed' && <p className="q-bad">Answer: <b>{formatSI(q.answer, q.unit)}</b></p>}
          <ol>{q.explanation.map((s, i) => <li key={i}>{s}</li>)}</ol>
        </div>
      )}
    </form>
  )
}
