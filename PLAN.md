# Cirkitz — Plan

An interactive website for playing with and learning DC circuits. You build a circuit, watch the current flow, read live voltages/currents, and get quizzed.

## Goals
1. **Visualize** a circuit and how electricity flows (animated charge carriers whose speed/density track current; wire color tracks voltage).
2. **Build**: drag components onto a grid, wire them, edit values, toggle switches.
3. **Measure**: click any component for V, I, P, R; probe node voltages.
4. **Learn**: short interactive lessons (Ohm's law, series, parallel, dividers, LEDs).
5. **Quiz**: auto-generated circuits, answer for V / I / R / P, instant feedback with worked solution; also quiz on your own sandbox circuit.

## Tech
- Vite + React + TypeScript, no UI/state libraries (plain CSS, `useReducer`).
- SVG canvas for the editor (crisp, easy hit-testing, easy animation).
- Vitest for solver tests.
- Static site, deployable to GitHub Pages (workflow included).

## Architecture
```
src/
  sim/        pure TS, no React
    types.ts      component/wire/netlist types
    solver.ts     Modified Nodal Analysis (+ Newton iteration for LEDs)
    netlist.ts    editor model -> netlist -> results
    quizGen.ts    random circuit generators for the quiz
    format.ts     SI formatting / parsing (1.2 kΩ, 4.7mA)
  editor/     Canvas, symbols, toolbox, inspector, flow animation
  pages/      Sandbox, Learn, Quiz
  data/       presets and lessons
```

### Circuit model
- Grid-based: each component has two terminals on grid points (rotatable). Wires connect grid points. Nodes = connected grid points.
- Wires are modeled as 1 mΩ resistors so *wire currents* come out of the solver (needed for flow animation). A tiny leak conductance to ground on each node keeps floating sub-circuits solvable.
- Components: battery, resistor, bulb, LED, switch, current source.
- Solver: MNA with Gaussian elimination; LED uses Shockley diode with damped Newton.
- Warnings: short circuit, open circuit, over-current LED/bulb burnout indicator.

## Milestones
1. Plan (this file)
2. Framework: Vite/React/TS, layout, tabs, theming
3. Solver + tests
4. Editor: place, rotate, wire, delete, edit values, undo, save/load (localStorage, JSON export)
5. Flow animation + voltage coloring + measurements
6. Learn mode + presets
7. Quiz mode (generated + sandbox)
8. Polish: responsive, keyboard shortcuts, README, Pages deploy, GitHub repo

## Done when
Fully working site: build a circuit from scratch, see flow, read values, finish lessons, and take quizzes, with passing tests and a clean production build.
