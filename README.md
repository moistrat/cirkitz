# Interactive EE

An interactive website for playing with and learning DC circuits. Build a circuit, watch the current flow, read live voltages and currents, and get quizzed.

- **Tutorial** – an optional, playable walkthrough (offered on first visit, reopen any time from the header) that teaches placing, wiring, measuring, editing, erasing, undo, rotating and quizzes on a scratch board, with a "Do it for me" option on every step.
- **Sandbox** – place batteries, resistors, bulbs, LEDs, switches and current sources on a grid, wire them up, and see animated charge flow (speed ∝ current, wire color ∝ voltage). Click a part to read V / I / P and edit its value. Undo/redo, save to the browser, export/import JSON, share links.
- **Learn** – a 20-lesson course in four units: foundations (charge, voltage/current/resistance, AC vs DC, reading schematics), DC analysis (Ohm's law, power, series, parallel, dividers, Kirchhoff, real sources, diodes, measuring), beyond resistors (capacitors, inductors, reactance and filters) and analysis methods (node-voltage, superposition, Thevenin, safety). Each lesson has worked examples, live circuits or interactive graphs, check questions and progress tracking.
- **Quiz** – four difficulty levels of generated circuits (V, I, R, P, equivalent resistance) with worked solutions, plus "Quiz me on this circuit" in the sandbox.

Shortcuts in the sandbox: `1`–`6` pick a part, `R` rotate, `V` wire/move, `E` erase, `Delete` remove, `Ctrl/⌘Z` undo, `Esc` cancel. Right-click deletes.

## Develop

```bash
npm install
npm run dev     # http://localhost:5173
npm test        # solver + quiz generator tests
npm run build   # type-check and production build into dist/
```

## How it works

The editor model (parts on grid points, wires as unit segments) is converted to a netlist and solved with Modified Nodal Analysis (`src/sim/solver.ts`). Wires are 1 mΩ resistors so wire currents come out of the solver and can be animated. LEDs use a Shockley diode model solved with damped Newton iteration. See [PLAN.md](PLAN.md) for the design.

Pushing to `main` deploys to GitHub Pages via `.github/workflows/deploy.yml` (enable Pages, Source: GitHub Actions in the repo settings).

Limitations: DC steady state only (no capacitors/inductors/AC yet); the LED model is a single generic ~1.9 V LED.
