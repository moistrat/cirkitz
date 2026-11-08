import { Ladder, ladder } from '../sim/topologies'
import { Analysis } from '../sim/netlist'
import { formatSI } from '../sim/format'

export interface Param {
  key: string
  label: string
  unit: string
  min: number
  max: number
  value: number
  log?: boolean
  step?: number
}

export interface Lesson {
  id: string
  title: string
  summary: string
  body: string[]
  formula: string
  params: Param[]
  build: (p: Record<string, number>) => Ladder
  readouts: (a: Analysis, l: Ladder, p: Record<string, number>) => { label: string; value: string; hint?: string }[]
  tryIt: string[]
}

const cur = (a: Analysis, id: string) => Math.abs(a.parts.get(id)?.i ?? 0)
const vol = (a: Analysis, id: string) => Math.abs(a.parts.get(id)?.v ?? 0)
const R = (x: number) => formatSI(x, 'Ω')
const A = (x: number) => formatSI(x, 'A')
const V = (x: number) => formatSI(x, 'V')
const W = (x: number) => formatSI(x, 'W')

export const LESSONS: Lesson[] = [
  {
    id: 'ohm',
    title: 'Ohm’s law',
    summary: 'Voltage, current and resistance are tied together.',
    body: [
      'Voltage (V) is the “push” a battery gives charges. Resistance (R) is how much a part opposes the flow. Current (I) is how much charge actually flows each second.',
      'Georg Ohm found that for a resistor the current is proportional to the voltage and inversely proportional to the resistance. Watch the moving charges: more current means they move faster.',
      'Power is the rate energy is converted to heat: P = V × I. A resistor’s heat grows with the square of the current (P = I²R), which is why high currents get hot.',
    ],
    formula: 'I = V / R     V = I·R     P = V·I',
    params: [
      { key: 'v', label: 'Battery', unit: 'V', min: 1, max: 24, value: 9, step: 1 },
      { key: 'r', label: 'Resistor', unit: 'Ω', min: 10, max: 10000, value: 220, log: true },
    ],
    build: (p) => ladder(p.v, [{ kind: 'resistor', value: p.r }]),
    readouts: (a, l, p) => [
      { label: 'Current I', value: A(cur(a, l.top[0])), hint: `${V(p.v)} ÷ ${R(p.r)}` },
      { label: 'Voltage across R', value: V(vol(a, l.top[0])) },
      { label: 'Power P', value: W(vol(a, l.top[0]) * cur(a, l.top[0])), hint: 'V × I' },
    ],
    tryIt: ['Double the resistance. What happens to the current?', 'Double the voltage. What happens to the power?'],
  },
  {
    id: 'series',
    title: 'Series circuits',
    summary: 'One path: the same current everywhere, voltages add up.',
    body: [
      'Parts connected end to end form a series circuit. There is only one path, so the same current flows through every part, like cars on a single-lane road.',
      'Resistances add: R_total = R1 + R2 + R3. The battery voltage is shared between the resistors; a bigger resistor takes a bigger share (Kirchhoff’s voltage law).',
    ],
    formula: 'R_total = R1 + R2 + R3     I = V / R_total     V_k = I·R_k',
    params: [
      { key: 'v', label: 'Battery', unit: 'V', min: 1, max: 24, value: 12, step: 1 },
      { key: 'r1', label: 'R1', unit: 'Ω', min: 10, max: 10000, value: 100, log: true },
      { key: 'r2', label: 'R2', unit: 'Ω', min: 10, max: 10000, value: 220, log: true },
      { key: 'r3', label: 'R3', unit: 'Ω', min: 10, max: 10000, value: 330, log: true },
    ],
    build: (p) => ladder(p.v, [p.r1, p.r2, p.r3].map((value) => ({ kind: 'resistor' as const, value }))),
    readouts: (a, l, p) => [
      { label: 'R total', value: R(p.r1 + p.r2 + p.r3) },
      { label: 'Current (same everywhere)', value: A(cur(a, l.top[0])) },
      { label: 'V across R1 / R2 / R3', value: l.top.map((id) => V(vol(a, id))).join(' / '), hint: 'adds up to the battery' },
    ],
    tryIt: ['Make R3 huge. Where does almost all the voltage end up?', 'Check that the three voltages sum to the battery voltage.'],
  },
  {
    id: 'parallel',
    title: 'Parallel circuits',
    summary: 'Several paths: same voltage, currents add up.',
    body: [
      'In a parallel circuit each branch connects straight across the battery, so every branch sees the full voltage. Each branch draws its own current, I = V/R.',
      'The battery supplies the sum of the branch currents (Kirchhoff’s current law), so adding branches always lowers the total resistance. Watch the charges split at the junction.',
    ],
    formula: 'I_k = V / R_k     I_total = I1 + I2 + I3     1/R_eq = 1/R1 + 1/R2 + 1/R3',
    params: [
      { key: 'v', label: 'Battery', unit: 'V', min: 1, max: 24, value: 9, step: 1 },
      { key: 'r1', label: 'R1', unit: 'Ω', min: 10, max: 10000, value: 100, log: true },
      { key: 'r2', label: 'R2', unit: 'Ω', min: 10, max: 10000, value: 220, log: true },
      { key: 'r3', label: 'R3', unit: 'Ω', min: 10, max: 10000, value: 470, log: true },
    ],
    build: (p) => ladder(p.v, [], [p.r1, p.r2, p.r3].map((value) => ({ kind: 'resistor' as const, value }))),
    readouts: (a, l, p) => {
      const g = 1 / p.r1 + 1 / p.r2 + 1 / p.r3
      return [
        { label: 'Branch currents', value: l.branches.map((id) => A(cur(a, id))).join(' / ') },
        { label: 'Total current', value: A(cur(a, l.battery)) },
        { label: 'R equivalent', value: R(1 / g), hint: 'always smaller than the smallest branch' },
      ]
    },
    tryIt: ['Which branch carries the most current? Why?', 'Lower R3 — what happens to the total current and R equivalent?'],
  },
  {
    id: 'divider',
    title: 'Voltage dividers',
    summary: 'Two resistors in series carve out a fraction of the voltage.',
    body: [
      'A voltage divider is just a two-resistor series circuit where you care about the voltage across one of them. It is how sensors, volume knobs and level shifters work.',
      'The output across R2 is the battery voltage times R2 / (R1 + R2). Equal resistors split the voltage in half.',
    ],
    formula: 'V_out = V_in × R2 / (R1 + R2)',
    params: [
      { key: 'v', label: 'Input', unit: 'V', min: 1, max: 24, value: 12, step: 1 },
      { key: 'r1', label: 'R1 (top)', unit: 'Ω', min: 100, max: 100000, value: 1000, log: true },
      { key: 'r2', label: 'R2 (bottom)', unit: 'Ω', min: 100, max: 100000, value: 2000, log: true },
    ],
    build: (p) => ladder(p.v, [p.r1, p.r2].map((value) => ({ kind: 'resistor' as const, value }))),
    readouts: (a, l, p) => [
      { label: 'V across R2 (V_out)', value: V(vol(a, l.top[1])) },
      { label: 'Ratio R2 / (R1+R2)', value: (p.r2 / (p.r1 + p.r2)).toFixed(3), hint: 'fraction of V_in' },
      { label: 'Divider current', value: A(cur(a, l.top[0])) },
    ],
    tryIt: ['Make R1 = R2. What is V_out?', 'Make R2 ten times bigger than R1. How much of the voltage does R2 get?'],
  },
  {
    id: 'led',
    title: 'LEDs and resistors',
    summary: 'LEDs are not resistors: they drop a fixed voltage and need protection.',
    body: [
      'An LED only conducts one way and, once on, holds about 1.9 V across itself no matter the current. Without a limit, the current shoots up and the LED burns out.',
      'The series resistor takes the leftover voltage: R = (V_supply - V_LED) / I. Typical LED current is 5–20 mA. Try a tiny resistor and watch the warning.',
    ],
    formula: 'I = (V_supply − V_LED) / R     R = (V_supply − 1.9 V) / I_wanted',
    params: [
      { key: 'v', label: 'Battery', unit: 'V', min: 3, max: 24, value: 9, step: 1 },
      { key: 'r', label: 'Resistor', unit: 'Ω', min: 10, max: 10000, value: 330, log: true },
    ],
    build: (p) => ladder(p.v, [{ kind: 'resistor', value: p.r }, { kind: 'led' }]),
    readouts: (a, l, p) => {
      const i = cur(a, l.top[0])
      return [
        { label: 'LED current', value: A(i), hint: i > 0.03 ? 'Too high — LED would burn out!' : i < 0.002 ? 'Dim' : 'Healthy' },
        { label: 'LED voltage', value: V(vol(a, l.top[1])), hint: 'barely changes with current' },
        { label: 'Resistor voltage', value: V(vol(a, l.top[0])), hint: `${V(p.v)} − LED` },
      ]
    },
    tryIt: ['Pick R for ~10 mA at 9 V using the formula, then test it.', 'Drop the resistor to 10 Ω.'],
  },
  {
    id: 'bulb',
    title: 'Power and brightness',
    summary: 'Brightness follows power, and power follows V and R.',
    body: [
      'A bulb is a resistor that glows. The more power it converts (P = V²/R), the brighter it shines.',
      'Because P = V²/R, doubling the voltage quadruples the power. A smaller resistance at the same voltage means more current and more power.',
    ],
    formula: 'P = V·I = I²·R = V² / R',
    params: [
      { key: 'v', label: 'Battery', unit: 'V', min: 1, max: 24, value: 6, step: 1 },
      { key: 'r', label: 'Bulb', unit: 'Ω', min: 5, max: 1000, value: 40, log: true },
    ],
    build: (p) => ladder(p.v, [{ kind: 'bulb', value: p.r }]),
    readouts: (a, l, p) => [
      { label: 'Power', value: W(vol(a, l.top[0]) * cur(a, l.top[0])), hint: `V²/R = ${W((p.v * p.v) / p.r)}` },
      { label: 'Current', value: A(cur(a, l.top[0])) },
    ],
    tryIt: ['Double the voltage. Does the power double or quadruple?'],
  },
]
