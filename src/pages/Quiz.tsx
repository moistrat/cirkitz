import { useState } from 'react'
import { Canvas } from '../editor/Canvas'
import { QuizCard } from '../editor/QuizCard'
import { LEVELS, generateQuestion } from '../sim/quizGen'
import { load, save } from '../state/storage'

interface Score { answered: number; correct: number; streak: number; best: number }
const EMPTY: Score = { answered: 0, correct: 0, streak: 0, best: 0 }

export function Quiz() {
  const [level, setLevel] = useState(() => load<number>('iee.quiz.level', 1))
  const [score, setScore] = useState<Score>(() => load('iee.quiz.score', EMPTY))
  const [q, setQ] = useState(() => generateQuestion(level))
  const [showMeasure, setShowMeasure] = useState(false)

  const changeLevel = (l: number) => { setLevel(l); save('iee.quiz.level', l); setQ(generateQuestion(l)) }
  const onResult = (ok: boolean) => {
    const next: Score = {
      answered: score.answered + 1,
      correct: score.correct + (ok ? 1 : 0),
      streak: ok ? score.streak + 1 : 0,
      best: Math.max(score.best, ok ? score.streak + 1 : 0),
    }
    setScore(next); save('iee.quiz.score', next)
  }
  const reset = () => { setScore(EMPTY); save('iee.quiz.score', EMPTY) }

  return (
    <div className="page quiz">
      <div className="quiz-top">
        <div className="levels" role="tablist">
          {LEVELS.map((l) => (
            <button key={l.level} role="tab" aria-selected={l.level === level}
              className={`level ${l.level === level ? 'active' : ''}`} onClick={() => changeLevel(l.level)}>
              <b>{l.level}. {l.name}</b><small>{l.blurb}</small>
            </button>
          ))}
        </div>
        <div className="scoreboard card">
          <div><b>{score.correct}</b><small>/ {score.answered} correct</small></div>
          <div><b>{score.streak}</b><small>streak</small></div>
          <div><b>{score.best}</b><small>best</small></div>
          <button className="btn ghost" onClick={reset}>Reset</button>
        </div>
      </div>

      <div className="quiz-body">
        <div className="card quiz-canvas">
          <Canvas circuit={q.circuit} analysis={q.analysis} fit hideMeasurements={!showMeasure}
            labelOverrides={q.overrides} highlight={q.target} />
          <label className="check">
            <input type="checkbox" checked={showMeasure} onChange={(e) => setShowMeasure(e.target.checked)} />
            Reveal measurements (peek at the answer)
          </label>
          <p className="hint">Watch the charges: faster means more current. Wire color shows voltage — blue is low, red is high.</p>
        </div>
        <QuizCard q={q} onResult={onResult} onNext={() => setQ(generateQuestion(level))} />
      </div>
    </div>
  )
}
