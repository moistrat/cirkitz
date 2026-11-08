import { Circuit } from './types'
import { analyze, Analysis } from './netlist'
import { formatSI } from './format'
import { ladder } from './topologies'

export type Unit = 'V' | 'A' | 'Ω' | 'W'

export interface Question {
  id: string
  level: number
  circuit: Circuit
  analysis: Analysis
  prompt: string
  unit: Unit
  answer: number
  /** relative tolerance, e.g. 0.03 = ±3% */
  tol: number
  explanation: string[]
  target: string[]
  overrides: Record<string, string>
}

export type Rng = () => number
export const mulberry = (seed: number): Rng => () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

const pick = <T,>(r: Rng, xs: T[]) => xs[Math.floor(r() * xs.length)]
const E_R = [100, 150, 220, 330, 470, 680, 1000, 1500, 2200, 3300, 4700, 10000]
const EASY_R = [100, 200, 220, 330, 470, 500, 1000, 2000, 4700]
const VOLTS = [3, 5, 6, 9, 12, 15, 24]

const f = {
  V: (x: number) => formatSI(x, 'V'),
  A: (x: number) => formatSI(x, 'A'),
  R: (x: number) => formatSI(x, 'Ω'),
  W: (x: number) => formatSI(x, 'W'),
}

let qn = 0
const WIRE_G = 1e5

function distinct(r: Rng, pool: number[], n: number): number[] {
  const out: number[] = []
  while (out.length < n) {
    const v = pick(r, pool)
    if (!out.includes(v) || pool.length <= out.length) out.push(v)
  }
  return out
}

function finish(q: Omit<Question, 'id' | 'analysis'>): Question {
  return { ...q, id: `q${qn++}`, analysis: analyze(q.circuit, { wireG: WIRE_G }) }
}

/** Build question text + answer from analysis of the circuit */
function lvl1(r: Rng): Question {
  const V = pick(r, [5, 9, 12, 10, 6])
  const R = pick(r, EASY_R)
  const L = ladder(V, [{ kind: 'resistor', value: R }])
  const a = analyze(L.circuit, { wireG: WIRE_G })
  const rid = L.top[0]
  const I = Math.abs(a.parts.get(rid)!.i)
  const kind = pick(r, ['I', 'P', 'R', 'V'] as const)
  const base = { level: 1, circuit: L.circuit, tol: 0.03, target: [rid], overrides: {} as Record<string, string> }
  if (kind === 'I')
    return finish({ ...base, prompt: `The battery is ${f.V(V)} and R1 is ${f.R(R)}. What current flows through R1?`, unit: 'A', answer: I,
      explanation: ['Ohm’s law: I = V / R.', `I = ${f.V(V)} / ${f.R(R)} = ${f.A(I)}.`] })
  if (kind === 'P')
    return finish({ ...base, prompt: `The battery is ${f.V(V)} and R1 is ${f.R(R)}. How much power does R1 dissipate?`, unit: 'W', answer: V * I,
      explanation: ['First the current: I = V / R.', `I = ${f.V(V)} / ${f.R(R)} = ${f.A(I)}.`, `Power: P = V × I = ${f.V(V)} × ${f.A(I)} = ${f.W(V * I)}.`] })
  if (kind === 'R')
    return finish({ ...base, overrides: { [rid]: '?' }, prompt: `An ammeter in this loop reads ${f.A(I)} with a ${f.V(V)} battery. What is the resistance of R1?`, unit: 'Ω', answer: R,
      explanation: ['Rearrange Ohm’s law: R = V / I.', `R = ${f.V(V)} / ${f.A(I)} = ${f.R(R)}.`] })
  return finish({ ...base, overrides: { [L.battery]: '?' }, prompt: `R1 is ${f.R(R)} and the current through it is ${f.A(I)}. What is the battery voltage?`, unit: 'V', answer: V,
    explanation: ['Ohm’s law: V = I × R.', `V = ${f.A(I)} × ${f.R(R)} = ${f.V(V)}.`] })
}

function lvl2(r: Rng): Question {
  const V = pick(r, VOLTS)
  const n = pick(r, [2, 2, 3])
  const Rs = distinct(r, E_R, n)
  const L = ladder(V, Rs.map((value) => ({ kind: 'resistor' as const, value })))
  const a = analyze(L.circuit, { wireG: WIRE_G })
  const Req = Rs.reduce((s, x) => s + x, 0)
  const I = V / Req
  const names = Rs.map((_, k) => `R${k + 1}`)
  const k = Math.floor(r() * n)
  const ask = pick(r, ['I', 'V', 'V', 'P', 'Req'] as const)
  const desc = Rs.map((x, j) => `${names[j]} = ${f.R(x)}`).join(', ')
  const base = { level: 2, circuit: L.circuit, tol: 0.03, overrides: {} as Record<string, string> }
  const step1 = `In series the resistances add: R_eq = ${names.join(' + ')} = ${f.R(Req)}.`
  const step2 = `Same current flows through every part: I = V / R_eq = ${f.V(V)} / ${f.R(Req)} = ${f.A(I)}.`
  void a
  if (ask === 'I')
    return finish({ ...base, target: [L.battery], prompt: `A ${f.V(V)} battery drives ${n} series resistors: ${desc}. What current flows in the loop?`, unit: 'A', answer: I, explanation: [step1, step2] })
  if (ask === 'Req')
    return finish({ ...base, target: [L.battery], prompt: `Resistors ${desc} are in series across a ${f.V(V)} battery. What is the total (equivalent) resistance the battery sees?`, unit: 'Ω', answer: Req, explanation: [step1] })
  if (ask === 'V')
    return finish({ ...base, target: [L.top[k]], prompt: `A ${f.V(V)} battery drives series resistors: ${desc}. What is the voltage across ${names[k]}?`, unit: 'V', answer: I * Rs[k],
      explanation: [step1, step2, `Voltage across ${names[k]}: V = I × R = ${f.A(I)} × ${f.R(Rs[k])} = ${f.V(I * Rs[k])}.`, 'Shortcut: voltage divides in proportion to resistance.'] })
  return finish({ ...base, target: [L.top[k]], prompt: `A ${f.V(V)} battery drives series resistors: ${desc}. How much power does ${names[k]} dissipate?`, unit: 'W', answer: I * I * Rs[k],
    explanation: [step1, step2, `Power: P = I² × R = (${f.A(I)})² × ${f.R(Rs[k])} = ${f.W(I * I * Rs[k])}.`] })
}

function lvl3(r: Rng): Question {
  const V = pick(r, VOLTS)
  const n = pick(r, [2, 3])
  const Rs = distinct(r, E_R, n)
  const L = ladder(V, [], Rs.map((value) => ({ kind: 'resistor' as const, value })))
  const names = Rs.map((_, k) => `R${k + 1}`)
  const Is = Rs.map((x) => V / x)
  const Itot = Is.reduce((s, x) => s + x, 0)
  const Req = V / Itot
  const k = Math.floor(r() * n)
  const desc = Rs.map((x, j) => `${names[j]} = ${f.R(x)}`).join(', ')
  const ask = pick(r, ['I', 'Itot', 'Req', 'P'] as const)
  const base = { level: 3, circuit: L.circuit, tol: 0.03, overrides: {} as Record<string, string> }
  const s1 = `Every branch is connected directly across the battery, so each has the full ${f.V(V)}.`
  const sk = `Branch current: I = V / R = ${f.V(V)} / ${f.R(Rs[k])} = ${f.A(Is[k])}.`
  const sTot = `Branch currents add at the junction: I_total = ${Is.map(f.A).join(' + ')} = ${f.A(Itot)}.`
  if (ask === 'I')
    return finish({ ...base, target: [L.branches[k]], prompt: `A ${f.V(V)} battery feeds parallel resistors: ${desc}. What current flows through ${names[k]}?`, unit: 'A', answer: Is[k], explanation: [s1, sk] })
  if (ask === 'P')
    return finish({ ...base, target: [L.branches[k]], prompt: `A ${f.V(V)} battery feeds parallel resistors: ${desc}. How much power does ${names[k]} dissipate?`, unit: 'W', answer: V * Is[k], explanation: [s1, sk, `P = V × I = ${f.V(V)} × ${f.A(Is[k])} = ${f.W(V * Is[k])}.`] })
  if (ask === 'Itot')
    return finish({ ...base, target: [L.battery], prompt: `A ${f.V(V)} battery feeds parallel resistors: ${desc}. What total current does the battery supply?`, unit: 'A', answer: Itot, explanation: [s1, `Each branch: I = V / R gives ${Is.map(f.A).join(', ')}.`, sTot] })
  return finish({ ...base, target: [L.battery], prompt: `Resistors ${desc} are in parallel across ${f.V(V)}. What is the equivalent resistance?`, unit: 'Ω', answer: Req,
    explanation: [s1, sTot, `R_eq = V / I_total = ${f.V(V)} / ${f.A(Itot)} = ${f.R(Req)}.`, `(Equivalently 1/R_eq = ${Rs.map((x) => `1/${f.R(x)}`).join(' + ')}.)`] })
}

function lvl4(r: Rng): Question {
  const V = pick(r, VOLTS.filter((v) => v >= 5))
  const type = pick(r, ['mixed', 'mixed', 'led'] as const)
  if (type === 'led') {
    const Vf = 1.9
    const Vs = pick(r, [5, 9, 12])
    const R = pick(r, [220, 330, 470, 680, 1000].filter((x) => (Vs - Vf) / x < 0.025))
    const L = ladder(Vs, [{ kind: 'resistor', value: R }, { kind: 'led' }])
    const a = analyze(L.circuit, { wireG: WIRE_G })
    const I = Math.abs(a.parts.get(L.top[0])!.i)
    return finish({
      level: 4, circuit: L.circuit, tol: 0.1, target: [L.top[0]], overrides: {}, unit: 'A', answer: I,
      prompt: `A ${f.V(Vs)} battery powers a ${f.R(R)} resistor in series with an LED. Assume the LED drops about ${f.V(Vf)}. What current flows (to within ~10%)?`,
      explanation: [`The LED holds roughly ${f.V(Vf)} across itself, so the resistor gets the rest: ${f.V(Vs)} − ${f.V(Vf)} = ${f.V(Vs - Vf)}.`, `I = V_R / R = ${f.V(Vs - Vf)} / ${f.R(R)} = ${f.A((Vs - Vf) / R)}.`, 'That is why LEDs always need a series resistor.'],
    })
  }
  const [Rs, Ra, Rb] = distinct(r, E_R, 3)
  const L = ladder(V, [{ kind: 'resistor', value: Rs }], [{ kind: 'resistor', value: Ra }, { kind: 'resistor', value: Rb }])
  const Rp = (Ra * Rb) / (Ra + Rb)
  const Req = Rs + Rp
  const It = V / Req
  const Vp = It * Rp
  const desc = `R1 = ${f.R(Rs)} in series with a parallel pair R2 = ${f.R(Ra)} and R3 = ${f.R(Rb)}`
  const ask = pick(r, ['Vp', 'It', 'Ib', 'Ps', 'Req'] as const)
  const base = { level: 4, circuit: L.circuit, tol: 0.03, overrides: {} as Record<string, string> }
  const e1 = `Parallel pair first: R_p = (R2 × R3) / (R2 + R3) = ${f.R(Rp)}.`
  const e2 = `Now it is a simple series loop: R_eq = R1 + R_p = ${f.R(Req)}.`
  const e3 = `Total current: I = V / R_eq = ${f.V(V)} / ${f.R(Req)} = ${f.A(It)}.`
  const e4 = `The pair gets V_p = I × R_p = ${f.A(It)} × ${f.R(Rp)} = ${f.V(Vp)}.`
  switch (ask) {
    case 'Vp': return finish({ ...base, target: [L.branches[0], L.branches[1]], prompt: `A ${f.V(V)} battery drives ${desc}. What is the voltage across R2?`, unit: 'V', answer: Vp, explanation: [e1, e2, e3, e4, 'Both parallel resistors share the same voltage.'] })
    case 'It': return finish({ ...base, target: [L.battery], prompt: `A ${f.V(V)} battery drives ${desc}. What total current does the battery supply?`, unit: 'A', answer: It, explanation: [e1, e2, e3] })
    case 'Ib': return finish({ ...base, target: [L.branches[1]], prompt: `A ${f.V(V)} battery drives ${desc}. What current flows through R3?`, unit: 'A', answer: Vp / Rb, explanation: [e1, e2, e3, e4, `I₃ = V_p / R3 = ${f.V(Vp)} / ${f.R(Rb)} = ${f.A(Vp / Rb)}.`] })
    case 'Ps': return finish({ ...base, target: [L.top[0]], prompt: `A ${f.V(V)} battery drives ${desc}. How much power does R1 dissipate?`, unit: 'W', answer: It * It * Rs, explanation: [e1, e2, e3, `P = I² × R1 = (${f.A(It)})² × ${f.R(Rs)} = ${f.W(It * It * Rs)}.`] })
    default: return finish({ ...base, target: [L.battery], prompt: `What is the total resistance the battery sees? (${desc}.)`, unit: 'Ω', answer: Req, explanation: [e1, e2] })
  }
}

export function generateQuestion(level: number, rng: Rng = Math.random): Question {
  return [lvl1, lvl2, lvl3, lvl4][Math.max(1, Math.min(4, level)) - 1](rng)
}

export const LEVELS = [
  { level: 1, name: 'Ohm’s law', blurb: 'One resistor: V, I, R, P.' },
  { level: 2, name: 'Series', blurb: 'Resistors in a row, voltage dividers.' },
  { level: 3, name: 'Parallel', blurb: 'Branches, total current, equivalent R.' },
  { level: 4, name: 'Combined', blurb: 'Series + parallel, and LEDs.' },
]

export function checkAnswer(q: Pick<Question, 'answer' | 'tol'>, guess: number): boolean {
  if (!isFinite(guess)) return false
  return Math.abs(guess - q.answer) <= Math.abs(q.answer) * q.tol + 1e-12
}

export function sandboxQuestion(c: Circuit, a: Analysis, rng: Rng = Math.random): Question | null {
  const cands = c.parts.filter((p) => ['resistor', 'bulb', 'led', 'battery'].includes(p.kind) && a.parts.has(p.id))
  if (a.empty || !cands.length) return null
  const live = cands.filter((p) => Math.abs(a.parts.get(p.id)!.i) > 1e-6)
  if (!live.length) return null
  const p = pick(rng, live)
  const r = a.parts.get(p.id)!
  const label = `${p.kind === 'battery' ? 'battery' : p.kind}`
  const qs: [Unit, number, string][] = p.kind === 'battery'
    ? [['A', Math.abs(r.i), `What total current does the ${label} supply?`], ['W', Math.abs(r.p), `How much power does the ${label} deliver?`]]
    : [['V', Math.abs(r.v), `What is the voltage across the highlighted ${label}?`], ['A', Math.abs(r.i), `What current flows through the highlighted ${label}?`], ['W', Math.abs(r.p), `How much power does the highlighted ${label} use?`]]
  const [unit, answer, prompt] = pick(rng, qs)
  const hasLed = c.parts.some((q) => q.kind === 'led')
  return {
    id: `s${qn++}`, level: 0, circuit: c, analysis: a, prompt, unit, answer, tol: hasLed ? 0.08 : 0.03,
    explanation: [`Look at the circuit: the simulator says ${unit === 'V' ? f.V(answer) : unit === 'A' ? f.A(answer) : f.W(answer)}.`,
      'Use Ohm’s law (V = I·R), P = V·I, and the series/parallel rules to work it out.'],
    target: [p.id], overrides: {},
  }
}
