import { describe, expect, it } from 'vitest'
import { LESSONS, UNITS } from './content'
import { analyze } from '../sim/netlist'
import { LabSpec } from './types'

const labs: LabSpec[] = LESSONS.flatMap((l) => l.blocks.flatMap((b) => (b.t === 'lab' ? [b.lab] : [])))

describe('course content', () => {
  it('has unique lesson ids and check ids', () => {
    const ids = LESSONS.map((l) => l.id)
    expect(new Set(ids).size).toBe(ids.length)
    const checks = LESSONS.flatMap((l) => l.blocks.flatMap((b) => (b.t === 'check' ? [b.id] : [])))
    expect(new Set(checks).size).toBe(checks.length)
  })
  it('every lesson is substantial and has goals and questions', () => {
    for (const l of LESSONS) {
      expect(l.goals.length, l.id).toBeGreaterThanOrEqual(2)
      expect(l.blocks.filter((b) => b.t === 'check').length, l.id).toBeGreaterThanOrEqual(2)
      expect(l.blocks.filter((b) => ['h', 'p', 'list', 'callout', 'example'].includes(b.t)).length, l.id).toBeGreaterThanOrEqual(5)
    }
    expect(UNITS.length).toBe(4)
  })
  it('check questions are well formed', () => {
    for (const l of LESSONS) for (const b of l.blocks) {
      if (b.t !== 'check') continue
      expect(b.options.length, b.id).toBeGreaterThanOrEqual(3)
      expect(b.correct, b.id).toBeGreaterThanOrEqual(0)
      expect(b.correct, b.id).toBeLessThan(b.options.length)
      expect(new Set(b.options).size, b.id).toBe(b.options.length)
    }
  })
  it('contains no emoji', () => {
    const text = JSON.stringify(LESSONS)
    expect(/[\u{1F000}-\u{1FFFF}\u{2705}\u{2714}\u{2728}\u{26A0}\u{2B50}]/u.test(text)).toBe(false)
  })
})

describe('interactive labs', () => {
  it('has labs', () => expect(labs.length).toBeGreaterThanOrEqual(10))
  for (const lab of labs) {
    it(`lab ${lab.id} solves at default, min and max parameters`, () => {
      const sets = [
        Object.fromEntries(lab.params.map((p) => [p.key, p.value])),
        Object.fromEntries(lab.params.map((p) => [p.key, p.min])),
        Object.fromEntries(lab.params.map((p) => [p.key, p.toggle ? 0 : p.max])),
      ]
      for (const vals of sets) {
        const built = lab.build(vals)
        const a = analyze(built.circuit, { wireG: 1e5 })
        for (const r of a.parts.values()) {
          expect(isFinite(r.v) && isFinite(r.i)).toBe(true)
        }
        const out = lab.readouts(a, built, vals)
        expect(out.length).toBeGreaterThan(0)
        for (const o of out) expect(o.value).not.toMatch(/NaN|undefined/)
      }
    })
  }
  it('nodal lab matches the worked example (VA = 60/11, VB = 20/11)', () => {
    const lab = labs.find((l) => l.id === 'nodal')!
    const vals = Object.fromEntries(lab.params.map((p) => [p.key, p.value]))
    const built = lab.build(vals)
    const a = analyze(built.circuit, { wireG: 1e5 })
    expect(a.nodeV.get('8,2')!).toBeCloseTo(60 / 11, 2)
    expect(a.nodeV.get('14,2')!).toBeCloseTo(20 / 11, 2)
  })
  it('thevenin lab matches V_L = 4.8 V at R_L = 1k', () => {
    const lab = labs.find((l) => l.id === 'thevenin')!
    const vals = { rl: 1000 }
    const built = lab.build(vals)
    const a = analyze(built.circuit, { wireG: 1e5 })
    expect(Math.abs(a.parts.get(built.branches[1])!.v)).toBeCloseTo(4.8, 2)
  })
  it('mixed lab matches the worked series-parallel example', () => {
    const lab = labs.find((l) => l.id === 'mixed')!
    const vals = { v: 12, rs: 220, ra: 470, rb: 330 }
    const built = lab.build(vals)
    const a = analyze(built.circuit, { wireG: 1e5 })
    expect(Math.abs(a.parts.get(built.battery)!.i)).toBeCloseTo(0.02899, 4)
    expect(Math.abs(a.parts.get(built.branches[0])!.v)).toBeCloseTo(5.621, 2)
  })
})
