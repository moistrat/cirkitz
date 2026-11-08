/**
 * Modified Nodal Analysis for DC circuits.
 * Node 0 is the reference (0 V). All element currents are signed a → b.
 */
export type Element =
  | { kind: 'R'; a: number; b: number; r: number }
  | { kind: 'V'; a: number; b: number; v: number } // V(a) - V(b) = v
  | { kind: 'I'; a: number; b: number; i: number } // pushes i from a to b through the element
  | { kind: 'D'; a: number; b: number } // diode, anode a, cathode b

export interface SolveResult {
  v: number[]
  /** current a → b through each element */
  i: number[]
  converged: boolean
}

export const GMIN = 1e-12
export const DIODE_N = 2
export const DIODE_VT = 0.02585
export const DIODE_IS = 1.1e-18
const NVT = DIODE_N * DIODE_VT

export const diodeI = (v: number) => DIODE_IS * (Math.exp(Math.min(v, 5) / NVT) - 1)
const diodeG = (v: number) => (DIODE_IS / NVT) * Math.exp(Math.min(v, 5) / NVT) + GMIN

function gauss(A: number[][], b: number[]): number[] | null {
  const n = b.length
  for (let c = 0; c < n; c++) {
    let p = c
    for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r
    if (Math.abs(A[p][c]) < 1e-300) return null
    if (p !== c) {
      ;[A[p], A[c]] = [A[c], A[p]]
      ;[b[p], b[c]] = [b[c], b[p]]
    }
    const piv = A[c][c]
    for (let r = c + 1; r < n; r++) {
      const f = A[r][c] / piv
      if (f === 0) continue
      const Ar = A[r]
      const Ac = A[c]
      for (let k = c; k < n; k++) Ar[k] -= f * Ac[k]
      b[r] -= f * b[c]
    }
  }
  const x = new Array<number>(n)
  for (let r = n - 1; r >= 0; r--) {
    let s = b[r]
    for (let k = r + 1; k < n; k++) s -= A[r][k] * x[k]
    x[r] = s / A[r][r]
  }
  return x
}

export function solve(nNodes: number, els: Element[]): SolveResult {
  const nv = els.filter((e) => e.kind === 'V')
  const N = nNodes - 1
  const size = N + nv.length
  const hasDiode = els.some((e) => e.kind === 'D')
  const vd = new Array<number>(els.length).fill(0) // diode voltage guesses
  let v = new Array<number>(nNodes).fill(0)
  let branch: number[] = []
  let converged = !hasDiode

  for (let iter = 0; iter < (hasDiode ? 400 : 1); iter++) {
    const A = Array.from({ length: size }, () => new Array<number>(size).fill(0))
    const rhs = new Array<number>(size).fill(0)
    const idx = (n: number) => n - 1
    const stampG = (a: number, b: number, g: number) => {
      if (a > 0) A[idx(a)][idx(a)] += g
      if (b > 0) A[idx(b)][idx(b)] += g
      if (a > 0 && b > 0) {
        A[idx(a)][idx(b)] -= g
        A[idx(b)][idx(a)] -= g
      }
    }
    const stampI = (a: number, b: number, i: number) => {
      // i flows a → b through the element: leaves a, enters b
      if (a > 0) rhs[idx(a)] -= i
      if (b > 0) rhs[idx(b)] += i
    }
    for (let n = 1; n < nNodes; n++) A[idx(n)][idx(n)] += GMIN
    let k = 0
    els.forEach((e, ei) => {
      if (e.kind === 'R') stampG(e.a, e.b, 1 / e.r)
      else if (e.kind === 'I') stampI(e.a, e.b, e.i)
      else if (e.kind === 'D') {
        const g = diodeG(vd[ei])
        stampG(e.a, e.b, g)
        stampI(e.a, e.b, diodeI(vd[ei]) - g * vd[ei])
      } else {
        const row = N + k++
        if (e.a > 0) {
          A[idx(e.a)][row] += 1
          A[row][idx(e.a)] += 1
        }
        if (e.b > 0) {
          A[idx(e.b)][row] -= 1
          A[row][idx(e.b)] -= 1
        }
        rhs[row] = e.v
      }
    })
    const x = gauss(A, rhs)
    if (!x || x.some((n) => !isFinite(n))) return { v: v.map(() => 0), i: els.map(() => 0), converged: false }
    v = [0, ...x.slice(0, N)]
    branch = x.slice(N)
    if (!hasDiode) break
    let maxDelta = 0
    els.forEach((e, ei) => {
      if (e.kind !== 'D') return
      const target = v[e.a] - v[e.b]
      let dv = target - vd[ei]
      maxDelta = Math.max(maxDelta, Math.abs(dv))
      dv = Math.max(-0.15, Math.min(0.15, dv))
      vd[ei] += dv
    })
    if (maxDelta < 1e-9) {
      converged = true
      break
    }
  }

  let k = 0
  const i = els.map((e, ei) => {
    switch (e.kind) {
      case 'R':
        return (v[e.a] - v[e.b]) / e.r
      case 'I':
        return e.i
      case 'D':
        return diodeI(v[e.a] - v[e.b]) + (v[e.a] - v[e.b]) * 0 + 0 * vd[ei]
      default:
        return branch[k++]
    }
  })
  return { v, i, converged }
}
