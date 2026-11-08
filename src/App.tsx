import { useEffect, useState } from 'react'
import { Sandbox } from './pages/Sandbox'
import { Learn } from './pages/Learn'
import { Quiz } from './pages/Quiz'
import { load, save } from './state/storage'

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
  const [theme, setTheme] = useState<'dark' | 'light'>(() =>
    load('iee.theme', window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark'))

  useEffect(() => {
    const on = () => setRoute(parse())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  useEffect(() => { document.documentElement.dataset.theme = theme; save('iee.theme', theme) }, [theme])

  return (
    <>
      <header className="topbar">
        <a className="brand" href="#/sandbox"><span className="bolt">⚡</span> Interactive EE</a>
        <nav>
          {TABS.map((t) => (
            <a key={t.id} href={`#/${t.id}`} className={route.page === t.id ? 'active' : ''}>{t.label}</a>
          ))}
        </nav>
        <button className="btn ghost" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Toggle theme">
          {theme === 'dark' ? '☀' : '☾'}
        </button>
      </header>
      <main>
        {route.page === 'sandbox' && <Sandbox shared={route.arg} />}
        {route.page === 'learn' && <Learn />}
        {route.page === 'quiz' && <Quiz />}
      </main>
    </>
  )
}
