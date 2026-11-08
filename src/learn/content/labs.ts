import { LabSpec } from '../types'
import { Analysis } from '../../sim/netlist'
import { formatSI } from '../../sim/format'
import { ladder } from '../../sim/topologies'
import { circuitFrom, makePart, pt } from '../../sim/build'

export const cur = (a: Analysis, id: string) => Math.abs(a.parts.get(id)?.i ?? 0)
export const vol = (a: Analysis, id: string) => Math.abs(a.parts.get(id)?.v ?? 0)
export const R = (x: number) => formatSI(x, 'Ω')
export const A = (x: number) => formatSI(x, 'A')
export const V = (x: number) => formatSI(x, 'V')
export const W = (x: number) => formatSI(x, 'W')

const volts = (v = 9, max = 24) => ({ key: 'v', label: 'Battery', unit: 'V', min: 1, max, value: v, step: 1 })
const res = (key: string, label: string, value: number, min = 10, max = 10000) => ({ key, label, unit: 'Ω', min, max, value, log: true })

export const ohmLab: LabSpec = {
  id: 'ohm',
  params: [volts(9), res('r', 'Resistor', 220)],
  build: (p) => ladder(p.v, [{ kind: 'resistor', value: p.r }]),
  readouts: (a, l, p) => [
    { label: 'Current I', value: A(cur(a, l.top[0])), hint: `${V(p.v)} / ${R(p.r)}` },
    { label: 'Voltage across R', value: V(vol(a, l.top[0])) },
    { label: 'Power P', value: W(vol(a, l.top[0]) * cur(a, l.top[0])), hint: 'V × I' },
  ],
}

export const bulbLab: LabSpec = {
  id: 'bulb',
  params: [volts(6), res('r', 'Bulb', 40, 5, 1000)],
  build: (p) => ladder(p.v, [{ kind: 'bulb', value: p.r }]),
  readouts: (a, l, p) => [
    { label: 'Power', value: W(vol(a, l.top[0]) * cur(a, l.top[0])), hint: `V²/R = ${W((p.v * p.v) / p.r)}` },
    { label: 'Current', value: A(cur(a, l.top[0])) },
    { label: 'Energy per hour', value: formatSI(vol(a, l.top[0]) * cur(a, l.top[0]) * 3600, 'J'), hint: 'P × 3600 s' },
  ],
}

export const switchLab: LabSpec = {
  id: 'switch',
  caption: 'Turn the switch on and off. A lamp needs a complete closed loop to light.',
  params: [{ key: 'sw', label: 'Switch closed', unit: '', min: 0, max: 1, value: 1, toggle: true }, volts(6, 12)],
  build: (p) => {
    const l = ladder(p.v, [{ kind: 'switch' }, { kind: 'bulb', value: 30 }])
    const sw = l.circuit.parts.find((x) => x.kind === 'switch')!
    sw.closed = p.sw === 1
    return l
  },
  readouts: (a, l) => [
    { label: 'Loop state', value: a.warnings.some((w) => w.startsWith('Open')) ? 'open' : 'closed', hint: 'current needs a closed loop' },
    { label: 'Current', value: A(cur(a, l.top[1])) },
    { label: 'Voltage across switch', value: V(vol(a, l.top[0])), hint: 'full battery voltage when open' },
  ],
}

export const seriesLab: LabSpec = {
  id: 'series',
  params: [volts(12), res('r1', 'R1', 100), res('r2', 'R2', 220), res('r3', 'R3', 330)],
  build: (p) => ladder(p.v, [p.r1, p.r2, p.r3].map((value) => ({ kind: 'resistor' as const, value }))),
  readouts: (a, l, p) => [
    { label: 'R total', value: R(p.r1 + p.r2 + p.r3), hint: 'R1 + R2 + R3' },
    { label: 'Current (same everywhere)', value: A(cur(a, l.top[0])) },
    { label: 'Voltage across R1 / R2 / R3', value: l.top.map((id: string) => V(vol(a, id))).join(' / '), hint: 'these add up to the battery' },
  ],
}

export const parallelLab: LabSpec = {
  id: 'parallel',
  params: [volts(9), res('r1', 'R1', 100), res('r2', 'R2', 220), res('r3', 'R3', 470)],
  build: (p) => ladder(p.v, [], [p.r1, p.r2, p.r3].map((value) => ({ kind: 'resistor' as const, value }))),
  readouts: (a, l, p) => {
    const g = 1 / p.r1 + 1 / p.r2 + 1 / p.r3
    return [
      { label: 'Branch currents', value: l.branches.map((id: string) => A(cur(a, id))).join(' / '), hint: 'each is V / R' },
      { label: 'Total current', value: A(cur(a, l.battery)), hint: 'sum of the branches' },
      { label: 'R equivalent', value: R(1 / g), hint: 'smaller than the smallest branch' },
    ]
  },
}

export const dividerLab: LabSpec = {
  id: 'divider',
  params: [volts(12), res('r1', 'R1 (top)', 1000, 100, 100000), res('r2', 'R2 (bottom)', 2000, 100, 100000)],
  build: (p) => ladder(p.v, [p.r1, p.r2].map((value) => ({ kind: 'resistor' as const, value }))),
  readouts: (a, l, p) => [
    { label: 'V across R2 (output)', value: V(vol(a, l.top[1])) },
    { label: 'Ratio R2 / (R1+R2)', value: (p.r2 / (p.r1 + p.r2)).toFixed(3), hint: 'fraction of the input' },
    { label: 'Divider current', value: A(cur(a, l.top[0])) },
  ],
}

export const loadedDividerLab: LabSpec = {
  id: 'loaded-divider',
  caption: 'R1 = 1 kΩ and R2 = 2 kΩ would give 8 V at 12 V in. Connect a load in parallel with R2 and watch the output sag.',
  params: [res('rl', 'Load', 100000, 100, 1000000)],
  build: (p) => ladder(12, [{ kind: 'resistor', value: 1000 }], [{ kind: 'resistor', value: 2000 }, { kind: 'resistor', value: p.rl }]),
  readouts: (a, l, p) => {
    const unloaded = (12 * 2000) / 3000
    const vo = vol(a, l.branches[0])
    return [
      { label: 'Output with load', value: V(vo) },
      { label: 'Output with no load', value: V(unloaded) },
      { label: 'Sag', value: `${(((unloaded - vo) / unloaded) * 100).toFixed(1)}%`, hint: `load ${R(p.rl)}` },
    ]
  },
}

export const mixedLab: LabSpec = {
  id: 'mixed',
  params: [volts(12), res('rs', 'R1 (series)', 220), res('ra', 'R2 (parallel)', 470), res('rb', 'R3 (parallel)', 330)],
  build: (p) => ladder(p.v, [{ kind: 'resistor', value: p.rs }], [{ kind: 'resistor', value: p.ra }, { kind: 'resistor', value: p.rb }]),
  readouts: (a, l, p) => {
    const rp = (p.ra * p.rb) / (p.ra + p.rb)
    return [
      { label: 'Parallel pair R_p', value: R(rp), hint: 'R2 × R3 / (R2 + R3)' },
      { label: 'Total R_eq', value: R(p.rs + rp), hint: 'R1 + R_p' },
      { label: 'Total current', value: A(cur(a, l.battery)) },
      { label: 'Voltage across the pair', value: V(vol(a, l.branches[0])) },
      { label: 'Branch currents I2 / I3', value: `${A(cur(a, l.branches[0]))} / ${A(cur(a, l.branches[1]))}` },
    ]
  },
}

export const kirchhoffLab: LabSpec = {
  id: 'kirchhoff',
  caption: 'Verify both laws on a live circuit. The "sum" rows should always come out to (almost) exactly zero.',
  params: [volts(12), res('rs', 'R1', 220), res('ra', 'R2', 470), res('rb', 'R3', 330)],
  build: (p) => ladder(p.v, [{ kind: 'resistor', value: p.rs }], [{ kind: 'resistor', value: p.ra }, { kind: 'resistor', value: p.rb }]),
  readouts: (a, l, p) => {
    const i1 = cur(a, l.top[0]), i2 = cur(a, l.branches[0]), i3 = cur(a, l.branches[1])
    const v1 = vol(a, l.top[0]), v2 = vol(a, l.branches[0])
    const kvl = p.v - v1 - v2
    const kcl = i1 - i2 - i3
    return [
      { label: 'KVL loop 1: source − V1 − V2', value: `${V(p.v)} − ${V(v1)} − ${V(v2)}`, hint: `sum = ${Math.abs(kvl) < 1e-6 ? '0 V' : V(kvl)}` },
      { label: 'KCL at the junction: I1 − I2 − I3', value: `${A(i1)} − ${A(i2)} − ${A(i3)}`, hint: `sum = ${Math.abs(kcl) < 1e-9 ? '0 A' : A(kcl)}` },
    ]
  },
}

export const sourceLab: LabSpec = {
  id: 'source',
  caption: 'A real battery behaves like an ideal source in series with a small internal resistance (here 2 Ω, similar to a 9 V alkaline).',
  params: [res('rl', 'Load', 100, 1, 1000)],
  build: (p) => ladder(9, [{ kind: 'resistor', value: 2 }, { kind: 'resistor', value: p.rl }]),
  readouts: (a, l, p) => [
    { label: 'Voltage at the load', value: V(vol(a, l.top[1])), hint: 'ideal source would give 9 V' },
    { label: 'Lost inside the battery', value: V(vol(a, l.top[0])), hint: 'I × 2 Ω' },
    { label: 'Current', value: A(cur(a, l.top[0])) },
    { label: 'Efficiency', value: `${((p.rl / (p.rl + 2)) * 100).toFixed(1)}%`, hint: 'load power / total power' },
  ],
}

export const ledLab: LabSpec = {
  id: 'led',
  params: [volts(9, 24), res('r', 'Resistor', 330)],
  build: (p) => ladder(p.v, [{ kind: 'resistor', value: p.r }, { kind: 'led' }]),
  readouts: (a, l, p) => {
    const i = cur(a, l.top[0])
    return [
      { label: 'LED current', value: A(i), hint: i > 0.03 ? 'Too high: the LED would burn out' : i < 0.002 ? 'Dim' : 'Healthy' },
      { label: 'LED voltage', value: V(vol(a, l.top[1])), hint: 'barely changes with current' },
      { label: 'Resistor voltage', value: V(vol(a, l.top[0])), hint: `${V(p.v)} minus the LED drop` },
    ]
  },
}

/** Bridge-style two-node network used in the node-voltage lesson. Nodes A=(8,2) and B=(14,2). */
export function nodalCircuit(vs: number, r: [number, number, number, number]) {
  const battery = makePart('battery', 2, 4, 1, vs)
  const parts = [
    battery,
    makePart('resistor', 4, 2, 0, r[0]),
    makePart('resistor', 8, 5, 1, r[1]),
    makePart('resistor', 10, 2, 0, r[2]),
    makePart('resistor', 14, 5, 1, r[3]),
  ]
  const circuit = circuitFrom(parts, [
    [pt(2, 4), pt(2, 2), pt(4, 2)],
    [pt(6, 2), pt(10, 2)],
    [pt(12, 2), pt(14, 2)],
    [pt(8, 2), pt(8, 5)], [pt(8, 7), pt(8, 10)],
    [pt(14, 2), pt(14, 5)], [pt(14, 7), pt(14, 10)],
    [pt(14, 10), pt(2, 10), pt(2, 6)],
  ])
  return { circuit, parts }
}

export const nodalLab: LabSpec = {
  id: 'nodal',
  caption: 'The two-node network from the example. Node A sits between R1, R2 and R3; node B between R3 and R4. Try changing values and compare with the node equations.',
  params: [volts(10), res('r1', 'R1', 1000), res('r2', 'R2', 2000), res('r3', 'R3', 2000), res('r4', 'R4', 1000)],
  build: (p) => nodalCircuit(p.v, [p.r1, p.r2, p.r3, p.r4]),
  readouts: (a, b) => {
    const va = a.nodeV.get('8,2') ?? 0, vb = a.nodeV.get('14,2') ?? 0
    return [
      { label: 'Node A voltage', value: V(va) },
      { label: 'Node B voltage', value: V(vb) },
      { label: 'Current from source', value: A(cur(a, b.parts[0].id)) },
      { label: 'Current through R3 (A to B)', value: A(cur(a, b.parts[3].id)) },
    ]
  },
}

export const theveninLab: LabSpec = {
  id: 'thevenin',
  caption: 'The source network (12 V, R1 = 1 kΩ, R2 = 2 kΩ) behaves, as seen by the load, like 8 V in series with 667 Ω. Sweep the load and find where it receives the most power.',
  params: [res('rl', 'Load', 1000, 50, 20000)],
  build: (p) => ladder(12, [{ kind: 'resistor', value: 1000 }], [{ kind: 'resistor', value: 2000 }, { kind: 'resistor', value: p.rl }]),
  readouts: (a, l, p) => {
    const pl = vol(a, l.branches[1]) * cur(a, l.branches[1])
    const rth = 2000 / 3
    const vth = 8
    const pmax = (vth * vth) / (4 * rth)
    return [
      { label: 'Load voltage', value: V(vol(a, l.branches[1])), hint: `Thevenin check: ${V((vth * p.rl) / (rth + p.rl))}` },
      { label: 'Load power', value: W(pl) },
      { label: 'Best possible (R_L = R_th)', value: W(pmax), hint: `at ${R(rth)}` },
      { label: 'Fraction of the maximum', value: `${((pl / pmax) * 100).toFixed(0)}%` },
    ]
  },
}
