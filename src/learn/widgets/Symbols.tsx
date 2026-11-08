import { ReactNode } from 'react'
import { SymbolBody } from '../../editor/symbols'

const S = (d: string) => <path className="sym" d={d} />

interface Sym { name: string; role: string; unit: string; draw: ReactNode }

const SYMS: Sym[] = [
  { name: 'Battery / DC source', role: 'Supplies energy. The longer plate is +.', unit: 'volt (V)', draw: <SymbolBody kind="battery" closed glow={0} /> },
  { name: 'Resistor', role: 'Limits current, drops voltage.', unit: 'ohm (Ω)', draw: <SymbolBody kind="resistor" closed glow={0} /> },
  { name: 'Lamp', role: 'A resistor that gives off light.', unit: 'ohm (Ω)', draw: <SymbolBody kind="bulb" closed glow={0} /> },
  { name: 'LED', role: 'Diode that lights up. Current flows with the arrow.', unit: 'volt drop ~2 V', draw: <SymbolBody kind="led" closed glow={0} /> },
  { name: 'Switch', role: 'Opens or closes the path.', unit: '-', draw: <SymbolBody kind="switch" closed glow={0} /> },
  { name: 'Current source', role: 'Forces a fixed current.', unit: 'ampere (A)', draw: <SymbolBody kind="isource" closed glow={0} /> },
  { name: 'Capacitor', role: 'Stores energy in an electric field.', unit: 'farad (F)', draw: <g>{S('M0,0H26M38,0H64')}{S('M26,-16V16M38,-16V16')}</g> },
  { name: 'Inductor', role: 'Stores energy in a magnetic field.', unit: 'henry (H)', draw: <g>{S('M0,0H12')}{S('M12,0a6,8 0 0 1 10,0a6,8 0 0 1 10,0a6,8 0 0 1 10,0a6,8 0 0 1 10,0')}{S('M52,0H64')}</g> },
  { name: 'AC source', role: 'Voltage that alternates, like the wall outlet.', unit: 'volt rms (V)', draw: <g>{S('M0,0H16M48,0H64')}<circle className="sym" cx={32} cy={0} r={16} />{S('M22,0q5,-10 10,0t10,0')}</g> },
  { name: 'Ground', role: 'The 0 V reference point.', unit: '-', draw: <g transform="translate(32,-14)">{S('M0,0V14M-14,14H14M-9,20H9M-4,26H4')}</g> },
  { name: 'Fuse', role: 'Sacrificial wire that melts on too much current.', unit: 'ampere rating (A)', draw: <g>{S('M0,0H14M50,0H64')}<rect className="sym" x={14} y={-8} width={36} height={16} rx={3} />{S('M14,0H50')}</g> },
  { name: 'Junction / wires', role: 'A dot means connected. Crossing with no dot means not.', unit: '-', draw: <g>{S('M0,0H64M32,-16V16')}<circle className="sym-fill" cx={32} cy={0} r={4.5} /></g> },
]

export function Symbols() {
  return (
    <div className="symgrid">
      {SYMS.map((s) => (
        <div className="symcell" key={s.name}>
          <svg viewBox="-6 -30 76 60" aria-hidden><g className="mini">{s.draw}</g></svg>
          <div>
            <b>{s.name}</b>
            <p>{s.role}</p>
            <small>Unit: {s.unit}</small>
          </div>
        </div>
      ))}
    </div>
  )
}
