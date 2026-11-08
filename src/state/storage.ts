/** Keys were prefixed "iee." before the app was renamed; read old values once so nothing is lost. */
const legacy = (key: string) => key.replace(/^cirkitz\./, 'iee.')

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key) ?? localStorage.getItem(legacy(key))
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}
export function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage unavailable */
  }
}
