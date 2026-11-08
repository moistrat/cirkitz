import { useEffect, useState } from 'react'
import { Sandbox } from './pages/Sandbox'
import { Learn } from './pages/Learn'
import { Quiz } from './pages/Quiz'

type Page = 'sandbox' | 'learn' | 'quiz'
const TABS: { id: Page; label: string }[] = [
  { id: 'learn', label: 'Learn' },
  { id: 'sandbox', label: 'Sandbox' },
  { id: 'quiz', label: 'Quiz' },
]

function parse(): { page: Page; arg?: string } {
  const [, page, arg] = location.hash.replace(/^#/, '').split('/')
  return { page: (['sandbox', 'learn', 'quiz'] as string[]).includes(page) ? (page as Page) : 'sandbox', arg }
}

export default function App() {
  const [route, setRoute] = useState(parse)
  const [tutorialRequest, setTutorialRequest] = useState(0)

  useEffect(() => {
    const on = () => setRoute(parse())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])

  return (
    <>
      <header className="topbar">
        <a className="brand" href="#/sandbox">
          <svg viewBox="0 0 32 32" width="24" height="24" aria-hidden>
            <rect width="32" height="32" rx="6" className="logo-bg" />
            <path d="M4 16h6l2-5 4 10 3-8 2 3h7" className="logo-line" />
          </svg>
          Interactive EE
        </a>
        <nav>
          {TABS.map((t) => (
            <a key={t.id} href={`#/${t.id}`} className={route.page === t.id ? 'active' : ''}>{t.label}</a>
          ))}
        </nav>
        <button className="btn" onClick={() => { if (route.page !== 'sandbox') location.hash = '#/sandbox'; setTutorialRequest((n) => n + 1) }}>
          Tutorial
        </button>
      </header>
      <main>
        {route.page === 'sandbox' && <Sandbox shared={route.arg} tutorialRequest={tutorialRequest} />}
        {route.page === 'learn' && <Learn lessonId={route.arg} />}
        {route.page === 'quiz' && <Quiz />}
      </main>
    </>
  )
}
