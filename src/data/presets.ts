import { Circuit } from '../sim/types'
import { ladder } from '../sim/topologies'

export interface Preset { id: string; name: string; build: () => Circuit }

export const PRESETS: Preset[] = [
  { id: 'led', name: 'LED + resistor', build: () => ladder(9, [{ kind: 'resistor', value: 330 }, { kind: 'led' }]).circuit },
  { id: 'ohm', name: 'Single resistor', build: () => ladder(9, [{ kind: 'resistor', value: 100 }]).circuit },
  { id: 'switch', name: 'Switch + bulb', build: () => ladder(9, [{ kind: 'switch' }, { kind: 'bulb', value: 40 }]).circuit },
  { id: 'series', name: 'Series resistors', build: () => ladder(12, [{ kind: 'resistor', value: 100 }, { kind: 'resistor', value: 220 }, { kind: 'resistor', value: 330 }]).circuit },
  { id: 'divider', name: 'Voltage divider', build: () => ladder(12, [{ kind: 'resistor', value: 1000 }, { kind: 'resistor', value: 2000 }]).circuit },
  { id: 'parallel', name: 'Parallel resistors', build: () => ladder(9, [], [{ kind: 'resistor', value: 100 }, { kind: 'resistor', value: 200 }, { kind: 'resistor', value: 300 }]).circuit },
  { id: 'bulbs', name: 'Parallel bulbs', build: () => ladder(9, [{ kind: 'switch' }], [{ kind: 'bulb', value: 50 }, { kind: 'bulb', value: 25 }]).circuit },
  { id: 'mixed', name: 'Series + parallel', build: () => ladder(12, [{ kind: 'resistor', value: 220 }], [{ kind: 'resistor', value: 470 }, { kind: 'resistor', value: 330 }]).circuit },
  { id: 'isrc', name: 'Current source', build: () => ladder(9, [{ kind: 'resistor', value: 330 }], [{ kind: 'isource', value: 0.01 }]).circuit },
]
