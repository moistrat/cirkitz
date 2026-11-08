import { useEffect, useMemo, useState } from 'react'
import { LESSONS, UNITS, unitOf } from '../learn/content'
import { Blocks, slug } from '../learn/Blocks'
import { load, save } from '../state/storage'

interface Progress { done: string[]; correct: string[] }
const KEY = 'iee.learn.v2'
const EMPTY: Progress = { done: [], correct: [] }

const Tick = () => (
  <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden>
    <path d="M3 8.5l3.2 3L13 4.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export function Learn({ lessonId }: { lessonId?: string }) {
  const [progress, setProgress] = useState<Progress>(() => load(KEY, EMPTY))
  const fallback = load<string>('iee.lesson2', LESSONS[0].id)
  const id = LESSONS.some((l) => l.id === lessonId) ? lessonId! : LESSONS.some((l) => l.id === fallback) ? fallback : LESSONS[0].id
  const idx = LESSONS.findIndex((l) => l.id === id)
  const lesson = LESSONS[idx]
  const unit = unitOf(id)!

  useEffect(() => { save('iee.lesson2', id); window.scrollTo({ top: 0 }) }, [id])

  const update = (p: Progress) => { setProgress(p); save(KEY, p) }
  const checkIds = useMemo(() => lesson.blocks.flatMap((b) => (b.t === 'check' ? [b.id] : [])), [lesson])
  const isDone = (lid: string) => progress.done.includes(lid)

  const onCorrect = (cid: string) => {
    if (progress.correct.includes(cid)) return
    const correct = [...progress.correct, cid]
    const allRight = checkIds.every((c) => correct.includes(c))
    update({ correct, done: allRight && !progress.done.includes(id) ? [...progress.done, id] : progress.done })
  }
  const toggleDone = () =>
    update({ ...progress, done: isDone(id) ? progress.done.filter((x) => x !== id) : [...progress.done, id] })

  const go = (lid: string) => { location.hash = `#/learn/${lid}` }
  const headings = lesson.blocks.flatMap((b) => (b.t === 'h' ? [b.text] : []))
  const doneCount = LESSONS.filter((l) => isDone(l.id)).length
  const answered = checkIds.filter((c) => progress.correct.includes(c)).length

  return (
    <div className="page learn">
      <aside className="lesson-nav" aria-label="Course contents">
        <div className="course-progress">
          <div className="cp-top"><b>Course progress</b><span>{doneCount} / {LESSONS.length}</span></div>
          <div className="cp-bar"><i style={{ width: `${(doneCount / LESSONS.length) * 100}%` }} /></div>
        </div>
        {UNITS.map((u, ui) => (
          <div key={u.id} className="unit">
            <h2><span>Unit {ui + 1}</span> {u.title}</h2>
            {u.lessons.map((l) => (
              <button key={l.id} className={`lesson-tab ${l.id === id ? 'active' : ''}`} onClick={() => go(l.id)} aria-current={l.id === id ? 'page' : undefined}>
                <span className={`tick ${isDone(l.id) ? 'on' : ''}`}>{isDone(l.id) && <Tick />}</span>
                <span><b>{l.title}</b><small>{l.minutes} min</small></span>
              </button>
            ))}
          </div>
        ))}
      </aside>

      <article className="lesson">
        <p className="eyebrow">Unit {UNITS.indexOf(unit) + 1}: {unit.title} &middot; Lesson {idx + 1} of {LESSONS.length} &middot; about {lesson.minutes} min</p>
        <h1>{lesson.title}</h1>
        <p className="lead">{lesson.summary}</p>
        <div className="goals">
          <b>By the end you will be able to</b>
          <ul>{lesson.goals.map((g) => <li key={g}>{g}</li>)}</ul>
        </div>

        <Blocks key={lesson.id} blocks={lesson.blocks} onCorrect={onCorrect} />

        <div className="lesson-footer">
          <div className="done-row">
            <button className={`btn ${isDone(id) ? '' : 'primary'}`} onClick={toggleDone}>
              {isDone(id) ? 'Completed. Click to undo' : 'Mark lesson complete'}
            </button>
            {checkIds.length > 0 && <span className="muted small">{answered} of {checkIds.length} questions answered correctly. Answering all correctly completes the lesson.</span>}
          </div>
          <div className="lesson-actions">
            <a className="btn" href="#/quiz">Practice in the Quiz</a>
            <a className="btn" href="#/sandbox">Open the Sandbox</a>
            <span className="spacer" />
            {idx > 0 && <button className="btn" onClick={() => go(LESSONS[idx - 1].id)}>Previous: {LESSONS[idx - 1].title}</button>}
            {idx < LESSONS.length - 1 && <button className="btn primary" onClick={() => go(LESSONS[idx + 1].id)}>Next: {LESSONS[idx + 1].title}</button>}
          </div>
        </div>
      </article>

      <nav className="toc" aria-label="On this page">
        <h2>On this page</h2>
        {headings.map((h) => (
          <a key={h} href={`#/learn/${id}`} onClick={(e) => { e.preventDefault(); document.getElementById(slug(h))?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}>{h}</a>
        ))}
        {checkIds.length > 0 && <a href={`#/learn/${id}`} onClick={(e) => { e.preventDefault(); document.querySelector('.check-q')?.scrollIntoView({ behavior: 'smooth', block: 'center' }) }}>Check your understanding</a>}
      </nav>
    </div>
  )
}
