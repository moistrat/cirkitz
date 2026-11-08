import { describe, expect, it } from 'vitest'
import { generateQuestion, mulberry, checkAnswer } from './quizGen'

describe('quiz generation', () => {
  for (const level of [1, 2, 3, 4]) {
    it(`level ${level} questions are well-formed`, () => {
      const rng = mulberry(level * 1000)
      for (let n = 0; n < 150; n++) {
        const q = generateQuestion(level, rng)
        expect(q.analysis.warnings).toEqual([])
        expect(isFinite(q.answer) && q.answer > 0).toBe(true)
        expect(q.explanation.length).toBeGreaterThan(0)
        expect(checkAnswer(q, q.answer)).toBe(true)
        expect(checkAnswer(q, q.answer * 1.5)).toBe(false)
        expect(q.target.every((id) => q.circuit.parts.some((p) => p.id === id))).toBe(true)
      }
    })
  }
  it('answers agree with the solver for series/parallel measurements', () => {
    const rng = mulberry(7)
    for (let n = 0; n < 100; n++) {
      const q = generateQuestion(3, rng)
      const m = q.analysis.parts.get(q.target[0])!
      const solver = q.unit === 'A' ? Math.abs(m.i) : q.unit === 'W' ? Math.abs(m.p) : q.unit === 'V' ? Math.abs(m.v) : null
      if (solver !== null) expect(Math.abs(solver - q.answer) / q.answer).toBeLessThan(0.01)
    }
  })
})
