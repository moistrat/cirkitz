import { WidgetId } from '../types'
import { Atoms } from './Atoms'
import { ColorCode } from './ColorCode'
import { IVCurve } from './IVCurve'
import { Reactance } from './Reactance'
import { Symbols } from './Symbols'
import { Transient } from './Transient'
import { Water } from './Water'
import { Wave } from './Wave'

export function Widget({ id }: { id: WidgetId }) {
  switch (id) {
    case 'atoms': return <Atoms />
    case 'water': return <Water />
    case 'wave': return <Wave />
    case 'rc': return <Transient mode="rc" />
    case 'rl': return <Transient mode="rl" />
    case 'reactance': return <Reactance />
    case 'iv': return <IVCurve />
    case 'symbols': return <Symbols />
    case 'colorcode': return <ColorCode />
  }
}
