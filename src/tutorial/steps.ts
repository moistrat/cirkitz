import { Circuit, KINDS, Part, Pt, Wire, key } from '../sim/types'
import { Analysis } from '../sim/netlist'
import { Action } from '../state/editorState'
import { Tool } from '../editor/Canvas'
import { ladder } from '../sim/topologies'
import { makePart } from '../sim/build'

export interface Ctx {
  circuit: Circuit
  analysis: Analysis
  selected: string | null
  tool: Tool
  quizOpen: boolean
  probed: boolean
}

export interface Api {
  dispatch: (a: Action) => void
  circuit: Circuit
  setTool: (t: Tool) => void
}

export interface Guide { parts: Part[]; wires: Wire[] }

export interface Step {
  id: string
  title: string
  body: string
  /** info steps wait for the Continue button; task steps complete themselves */
  info?: boolean
  focus?: string
  setup?: (api: Api) => void
  guide?: (ctx: Ctx) => Guide | undefined
  done?: (ctx: Ctx) => boolean
  hint?: (ctx: Ctx) => string | undefined
  /** performs the step for the user ("Do it for me") */
  autofill?: (api: Api) => void
}

const REF = ladder(9, [{ kind: 'resistor' }, { kind: 'led' }])
const [REF_BAT, REF_RES, REF_LED] = REF.circuit.parts
const BULB_SPOT = { x: 14, y: 12 }

const segKey = (a: Pt, b: Pt) => {
  const ka = key(a), kb = key(b)
  return ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`
}
const at = (c: Circuit, ref: Part) =>
  c.parts.find((p) => p.kind === ref.kind && p.x === ref.x && p.y === ref.y && p.rot === ref.rot)
const closed = (c: Ctx) => c.circuit.parts.some((p) => p.kind === 'battery' && Math.abs(c.analysis.parts.get(p.id)?.i ?? 0) > 1e-6)
const isOpen = (c: Ctx) => c.analysis.warnings.some((w) => w.startsWith('Open circuit'))

const placeStep = (id: string, ref: Part, title: string, body: string, name: string): Step => ({
  id, title, body, focus: '.toolbox',
  setup: ({ setTool }) => setTool({ type: 'place', kind: ref.kind, rot: ref.rot }),
  guide: ({ circuit }) => (at(circuit, ref) ? undefined : { parts: [ref], wires: [] }),
  done: ({ circuit }) => !!at(circuit, ref),
  hint: ({ circuit }) =>
    circuit.parts.some((p) => p.kind === ref.kind) && !at(circuit, ref)
      ? `That ${name} is not on the dashed outline. Undo with Ctrl/Cmd+Z, or drag it onto the outline.`
      : undefined,
  autofill: ({ dispatch, circuit }) => { if (!at(circuit, ref)) dispatch({ type: 'addPart', part: { ...ref, id: makePart(ref.kind, 0, 0).id } }) },
})

export const STEPS: Step[] = [
  {
    id: 'welcome', info: true,
    title: 'Welcome to Interactive EE',
    body: 'A short hands-on tour of every mechanic: placing parts, wiring, reading measurements, editing values, undo, and quizzes. It takes about three minutes, runs on its own scratch board, and never touches your saved circuit.',
  },
  placeStep('battery', REF_BAT, 'Place a battery',
    'Every circuit needs a source. The Battery is already selected from the Parts list. Click the dashed outline on the grid to drop it there. The long plate is the positive side.', 'battery'),
  placeStep('resistor', REF_RES, 'Place a resistor',
    'Now the Resistor. Parts snap to grid points, and the small rings at each end are terminals you wire to. Click the outline.', 'resistor'),
  placeStep('led', REF_LED, 'Place an LED',
    'LEDs only conduct one way, from the flat triangle side to the bar. Place it on the outline.', 'LED'),
  {
    id: 'wires', title: 'Wire the loop',
    body: 'Drag from one terminal to the next to draw a wire. Wires snap to the grid and bend once. Follow the dashed guides until the loop is closed.',
    setup: ({ setTool }) => setTool({ type: 'select' }),
    guide: ({ circuit }) => {
      const have = new Set(circuit.wires.map((w) => segKey(w.a, w.b)))
      return { parts: [], wires: REF.circuit.wires.filter((w) => !have.has(segKey(w.a, w.b))) }
    },
    done: closed,
    autofill: ({ dispatch }) => dispatch({ type: 'addWires', wires: REF.circuit.wires }),
  },
  {
    id: 'flow', info: true, title: 'Watch the current flow',
    body: 'The loop is live. The moving charges travel from the battery positive terminal around to its negative. Faster charges mean more current. Wire color shows voltage: mint is high, slate is low, and the ground symbol marks 0 V. The Current flow switch in the toolbar pauses the animation.',
    focus: '.toolbar',
  },
  {
    id: 'inspect', title: 'Inspect a part',
    body: 'Click the resistor. The inspector shows the voltage across it, the current through it, and its power. Dividing V by I gives back its resistance, which is Ohm\'s law.',
    focus: '.inspector',
    setup: ({ setTool }) => setTool({ type: 'select' }),
    done: ({ circuit, selected }) => circuit.parts.find((p) => p.id === selected)?.kind === 'resistor',
    autofill: ({ dispatch, circuit }) => {
      const r = circuit.parts.find((p) => p.kind === 'resistor')
      if (r) dispatch({ type: 'select', id: r.id })
    },
  },
  {
    id: 'value', title: 'Change a value',
    body: 'Type a new resistance such as 2.2k into the Value box and press Enter. Higher resistance means less current, so the LED dims. Lower it to brighten the LED, but not too far or a warning appears.',
    focus: '.inspector',
    done: ({ circuit }) => { const r = circuit.parts.find((p) => p.kind === 'resistor'); return !!r && r.value !== KINDS.resistor.default },
    autofill: ({ dispatch, circuit }) => {
      const r = circuit.parts.find((p) => p.kind === 'resistor')
      if (r) dispatch({ type: 'setValue', id: r.id, value: 2200 })
    },
  },
  {
    id: 'probe', title: 'Probe a voltage',
    body: 'Hover over any wire or terminal with the Wire / move tool. A reading appears with the voltage at that point, measured against ground.',
    done: ({ probed }) => probed,
  },
  {
    id: 'erase', title: 'Break the circuit',
    body: 'Choose the Erase tool in the toolbox (or press E) and click one wire. The loop opens, current stops, and a warning explains why. Right-click also deletes anything under the cursor.',
    focus: '.toolbox',
    done: isOpen,
    autofill: ({ dispatch, circuit }) => { if (circuit.wires[0]) dispatch({ type: 'removeWire', id: circuit.wires[0].id }) },
  },
  {
    id: 'undo', title: 'Undo it',
    body: 'Mistakes are cheap. Press Ctrl/Cmd+Z, or click Undo in the toolbar, to put the wire back. Shift+Ctrl/Cmd+Z redoes.',
    focus: '.toolbar',
    setup: ({ setTool }) => setTool({ type: 'select' }),
    done: closed,
    autofill: ({ dispatch }) => dispatch({ type: 'undo' }),
  },
  {
    id: 'rotate', title: 'Rotate while placing',
    body: 'The Bulb is selected. Before you click, press R to rotate the ghost part a quarter turn so it matches the vertical outline, then click to place it.',
    focus: '.toolbox',
    setup: ({ setTool }) => setTool({ type: 'place', kind: 'bulb', rot: 0 }),
    guide: ({ circuit }) => (circuit.parts.some((p) => p.kind === 'bulb' && p.rot === 1) ? undefined
      : { parts: [makePart('bulb', BULB_SPOT.x, BULB_SPOT.y, 1, undefined, 'guide-bulb')], wires: [] }),
    done: ({ circuit }) => circuit.parts.some((p) => p.kind === 'bulb' && p.rot === 1),
    hint: ({ circuit }) => circuit.parts.some((p) => p.kind === 'bulb' && p.rot !== 1)
      ? 'That bulb is lying flat. Select it and press R to rotate it, or undo and try again.' : undefined,
    autofill: ({ dispatch }) => dispatch({ type: 'addPart', part: makePart('bulb', BULB_SPOT.x, BULB_SPOT.y, 1) }),
  },
  {
    id: 'delete', title: 'Remove a part',
    body: 'Click the bulb to select it, then press Delete. You can also drag a part to move it, or click a switch to toggle it. Bulbs and LEDs glow with the power they use.',
    setup: ({ setTool }) => setTool({ type: 'select' }),
    done: ({ circuit }) => !circuit.parts.some((p) => p.kind === 'bulb'),
    autofill: ({ dispatch, circuit }) => circuit.parts.filter((p) => p.kind === 'bulb').forEach((p) => dispatch({ type: 'remove', id: p.id })),
  },
  {
    id: 'quiz', title: 'Get quizzed',
    body: 'Click "Quiz me on this circuit" in the inspector. The measurements hide, one part is highlighted, and you work out its voltage, current or power. Answers like 4.7k or 25m work.',
    focus: '.quiz-btn',
    done: ({ quizOpen }) => quizOpen,
  },
  {
    id: 'finish', info: true, title: 'You know the controls',
    body: 'Shortcuts: 1 to 6 pick a part, R rotates, V is wire / move, E erases, Delete removes, Ctrl/Cmd+Z undoes. Use Examples for ready-made circuits and Share link to send yours to someone. The Learn tab is a full course from "what is electricity" through AC, with interactive circuits and questions, and the Quiz tab has generated problems at four levels. You can reopen this tutorial any time from the header.',
  },
]
