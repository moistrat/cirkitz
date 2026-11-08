import { describe, expect, it } from 'vitest'
import { solve } from './solver'
import { analyze } from './netlist'
import { Circuit } from './types'
import { formatSI, parseSI } from './format'

describe('solver', () => {
  it('series divider', () => {
    // node0 ref, 1 = top of V, 2 = middle
    const r = solve(3, [
      { kind: 'V', a: 1, b: 0, v: 10 },
      { kind: 'R', a: 1, b: 2, r: 1000 },
      { kind: 'R', a: 2, b: 0, r: 3000 },
    ])
    expect(r.v[2]).toBeCloseTo(7.5, 6)
    expect(r.i[1]).toBeCloseTo(0.0025, 9)
    expect(r.i[0]).toBeCloseTo(-0.0025, 9) // battery discharging
  })
  it('parallel resistors', () => {
    const r = solve(2, [
      { kind: 'V', a: 1, b: 0, v: 12 },
      { kind: 'R', a: 1, b: 0, r: 100 },
      { kind: 'R', a: 1, b: 0, r: 300 },
    ])
    expect(r.i[1]).toBeCloseTo(0.12, 9)
    expect(r.i[2]).toBeCloseTo(0.04, 9)
  })
  it('current source', () => {
    const r = solve(2, [
      { kind: 'I', a: 0, b: 1, i: 0.002 },
      { kind: 'R', a: 1, b: 0, r: 1000 },
    ])
    expect(r.v[1]).toBeCloseTo(2, 6)
  })
  it('LED with resistor settles near 1.9V', () => {
    const r = solve(3, [
      { kind: 'V', a: 1, b: 0, v: 9 },
      { kind: 'R', a: 1, b: 2, r: 470 },
      { kind: 'D', a: 2, b: 0 },
    ])
    expect(r.converged).toBe(true)
    expect(r.v[2]).toBeGreaterThan(1.6)
    expect(r.v[2]).toBeLessThan(2.2)
    expect(r.i[2]).toBeCloseTo((9 - r.v[2]) / 470, 6)
  })
  it('floating nodes do not break the solve', () => {
    const r = solve(4, [
      { kind: 'V', a: 1, b: 0, v: 5 },
      { kind: 'R', a: 2, b: 3, r: 100 },
    ])
    expect(r.v.every(isFinite)).toBe(true)
  })
})

describe('analyze (editor model)', () => {
  // battery (0,0)->(2,0) rot 0: a=(0,0)+, b=(2,0)-. Resistor from (0,2) to (2,2); wires close the loop.
  const circuit: Circuit = {
    parts: [
      { id: 'b', kind: 'battery', x: 0, y: 0, rot: 0, value: 9, closed: true },
      { id: 'r', kind: 'resistor', x: 0, y: 2, rot: 0, value: 90, closed: true },
    ],
    wires: [
      { id: 'w1', a: { x: 0, y: 0 }, b: { x: 0, y: 1 } },
      { id: 'w2', a: { x: 0, y: 1 }, b: { x: 0, y: 2 } },
      { id: 'w3', a: { x: 2, y: 0 }, b: { x: 2, y: 1 } },
      { id: 'w4', a: { x: 2, y: 1 }, b: { x: 2, y: 2 } },
    ],
  }
  it('computes a simple loop and wire currents', () => {
    const a = analyze(circuit)
    expect(a.parts.get('r')!.i).toBeCloseTo(0.1, 2)
    expect(a.parts.get('r')!.v).toBeCloseTo(9, 1)
    expect(Math.abs(a.wires.get('w1')!)).toBeCloseTo(0.1, 2)
    expect(a.warnings).toEqual([])
  })
  it('warns on open circuit', () => {
    const open = { ...circuit, wires: circuit.wires.slice(0, 3) }
    expect(analyze(open).warnings.join()).toMatch(/Open circuit/)
  })
  it('warns on short', () => {
    const short: Circuit = {
      parts: [circuit.parts[0]],
      wires: [
        { id: 'a', a: { x: 0, y: 0 }, b: { x: 1, y: 0 } },
        { id: 'b', a: { x: 1, y: 0 }, b: { x: 2, y: 0 } },
      ],
    }
    expect(analyze(short).warnings.join()).toMatch(/Short/)
  })
})

describe('format', () => {
  it('formats', () => {
    expect(formatSI(0.0025, 'A')).toBe('2.5 mA')
    expect(formatSI(4700, 'Ω')).toBe('4.7 kΩ')
    expect(formatSI(0, 'V')).toBe('0 V')
  })
  it('parses', () => {
    expect(parseSI('4.7k')).toBeCloseTo(4700)
    expect(parseSI('10 mA')).toBeCloseTo(0.01)
    expect(parseSI('2M')).toBe(2e6)
    expect(parseSI('abc')).toBeNaN()
  })
})
