const PREFIXES: [number, string][] = [
  [1e9, 'G'], [1e6, 'M'], [1e3, 'k'], [1, ''], [1e-3, 'm'], [1e-6, 'µ'], [1e-9, 'n'],
]

export function formatSI(value: number, unit = '', digits = 3): string {
  if (!isFinite(value)) return `∞ ${unit}`.trim()
  const abs = Math.abs(value)
  if (abs < 1e-12) return `0 ${unit}`.trim()
  let [scale, prefix] = PREFIXES[PREFIXES.length - 1]
  for (const [s, p] of PREFIXES) {
    if (abs >= s * 0.9995) {
      scale = s
      prefix = p
      break
    }
  }
  const n = value / scale
  const str = Number(n.toPrecision(digits)).toString()
  return `${str} ${prefix}${unit}`.trim()
}

const MULT: Record<string, number> = {
  g: 1e9, G: 1e9, M: 1e6, k: 1e3, K: 1e3, m: 1e-3, u: 1e-6, 'µ': 1e-6, n: 1e-9,
}

/** Parses "4.7k", "10 mA", "2.2e3", "100Ω". Returns NaN if invalid. */
export function parseSI(input: string): number {
  const s = input.trim().replace(/[ΩωVvAa]|ohms?|volts?|amps?/g, '').trim()
  const m = s.match(/^([+-]?\d*\.?\d+(?:e[+-]?\d+)?)\s*([a-zA-Zµ]?)$/i)
  if (!m) return NaN
  const num = parseFloat(m[1])
  if (!m[2]) return num
  // 'M' (mega) vs 'm' (milli) is case-sensitive on purpose
  const mult = MULT[m[2]]
  return mult === undefined ? NaN : num * mult
}
