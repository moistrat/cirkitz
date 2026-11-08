import { ReactNode, useState } from 'react'
import { Block } from './types'
import { Lab } from './Lab'
import { Widget } from './widgets'

export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

/** Renders **bold** and `code` inline markup. */
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) => {
    if (part.startsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>
    if (part.startsWith('`')) return <code key={i}>{part.slice(1, -1)}</code>
    return part
  })
}

function Check({ b, onCorrect }: { b: Extract<Block, { t: 'check' }>; onCorrect: (id: string) => void }) {
  const [pick, setPick] = useState<number | null>(null)
  const [shown, setShown] = useState(false)
  const right = pick === b.correct
  return (
    <div className={`check-q card ${shown ? (right ? 'right' : 'wrong') : ''}`}>
      <p className="eyebrow">Check your understanding</p>
      <p className="cq">{inline(b.q)}</p>
      <div role="radiogroup" aria-label={b.q} className="opts">
        {b.options.map((o, i) => (
          <label key={i} className={`opt ${shown && i === b.correct ? 'is-right' : ''} ${shown && pick === i && !right ? 'is-wrong' : ''}`}>
            <input type="radio" name={b.id} checked={pick === i} onChange={() => { setPick(i); setShown(false) }} />
            <span>{inline(o)}</span>
          </label>
        ))}
      </div>
      <div className="check-row">
        <button className="btn" disabled={pick === null} onClick={() => { setShown(true); if (pick === b.correct) onCorrect(b.id) }}>Check answer</button>
        {shown && <span className={right ? 'q-good' : 'q-bad'}>{right ? 'Correct.' : 'Not quite. Try another option.'}</span>}
      </div>
      {shown && right && <p className="explain">{inline(b.explain)}</p>}
    </div>
  )
}

export function Blocks({ blocks, onCorrect }: { blocks: Block[]; onCorrect: (id: string) => void }) {
  return (
    <>
      {blocks.map((b, i) => {
        switch (b.t) {
          case 'h': return <h2 key={i} id={slug(b.text)} className="lh">{b.text}</h2>
          case 'p': return <p key={i}>{inline(b.text)}</p>
          case 'list': {
            const L = b.ordered ? 'ol' : 'ul'
            return <L key={i}>{b.items.map((t, k) => <li key={k}>{inline(t)}</li>)}</L>
          }
          case 'callout':
            return (
              <aside key={i} className={`callout ${b.kind}`}>
                <b>{b.title ?? (b.kind === 'key' ? 'Key idea' : b.kind === 'warn' ? 'Watch out' : 'Note')}</b>
                <p>{inline(b.text)}</p>
              </aside>
            )
          case 'formula':
            return (
              <div key={i} className="formula">
                {b.lines.map((l, k) => <div key={k}>{l}</div>)}
                {b.caption && <small>{b.caption}</small>}
              </div>
            )
          case 'example':
            return (
              <div key={i} className="example">
                <p className="eyebrow">Worked example: {b.title}</p>
                <p className="problem">{inline(b.problem)}</p>
                <ol>{b.steps.map((s, k) => <li key={k}>{inline(s)}</li>)}</ol>
                <p className="answer">{inline(b.answer)}</p>
              </div>
            )
          case 'table':
            return (
              <div key={i} className="table-wrap">
                <table>
                  <thead><tr>{b.head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
                  <tbody>{b.rows.map((r, k) => <tr key={k}>{r.map((c, j) => <td key={j}>{inline(c)}</td>)}</tr>)}</tbody>
                </table>
                {b.caption && <small>{b.caption}</small>}
              </div>
            )
          case 'lab': return <Lab key={b.lab.id} lab={b.lab} />
          case 'widget': return <Widget key={i} id={b.id} />
          case 'check': return <Check key={b.id} b={b} onCorrect={onCorrect} />
        }
      })}
    </>
  )
}
