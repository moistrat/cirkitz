import { Circuit, Kind } from './types'
import { circuitFrom, makePart, pt } from './build'

export interface Spec { kind: Kind; value?: number }

export interface Ladder {
  circuit: Circuit
  battery: string
  top: string[]
  branches: string[]
}

/**
 * Standard layout used by presets, lessons and quizzes:
 * battery on the left (+ on top), a top rail with series parts, then
 * optional parallel branches hanging between the top and bottom rails.
 */
export function ladder(volts: number, top: Spec[], branches: Spec[] = []): Ladder {
  const parts = [] as ReturnType<typeof makePart>[]
  const battery = makePart('battery', 2, 4, 1, volts)
  parts.push(battery)
  const paths = [] as ReturnType<typeof pt>[][]

  const topIds: string[] = []
  let cursor = 2
  const ty = 2, by = 10
  const topPath = [pt(2, 4), pt(2, ty)]
  paths.push(topPath)
  let railStart = 2
  for (const s of top) {
    const start = cursor + 2
    const p = makePart(s.kind, start, ty, 0, s.value)
    parts.push(p)
    topIds.push(p.id)
    paths.push([pt(railStart, ty), pt(start, ty)])
    cursor = start + 2
    railStart = cursor
  }
  const branchIds: string[] = []
  let xr: number
  if (branches.length) {
    branches.forEach((s, k) => {
      const x = cursor + 3 * (k + 1)
      const p = makePart(s.kind, x, 5, 1, s.value)
      parts.push(p)
      branchIds.push(p.id)
      paths.push([pt(x, ty), pt(x, 5)], [pt(x, 7), pt(x, by)])
    })
    xr = cursor + 3 * branches.length
    paths.push([pt(railStart, ty), pt(xr, ty)])
  } else {
    xr = cursor + 2
    paths.push([pt(railStart, ty), pt(xr, ty), pt(xr, by)])
  }
  paths.push([pt(xr, by), pt(2, by), pt(2, 6)])
  return { circuit: circuitFrom(parts, paths), battery: battery.id, top: topIds, branches: branchIds }
}
