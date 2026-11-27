# DubLab

Offline-capable Vite + TypeScript PWA dub siren teaching instrument for electronics students, modeling an **NJD-style dual NE555/TLC555 + PT2399** topology on a **+5 V power rail**, inspired by the BeniDub DS01e UX.

## Power rail (+5 V)

- **Supply**: USB 5 V, 3×AA (4.5 V), or regulated 5 V. CMOS **TLC555/LMC555** is ideal; bipolar NE555 also works (~3.3 V output).
- **Pin 5 (CTRL)**: idles at `2/3 Vcc = 3.33 V`.
- **Op-amp shaper**: single-supply **MCP6002** biased at `Vcc/2 = 2.5 V` (`2 × 10 kΩ + 10 µF`); LM358 maxes out near ~3.5 V.
- **LED + series resistor**: `I = (5 V − Vf) / R`, default `470 Ω` (~`6.4 mA` with `Vf = 2.0 V`); options `100 Ω`, `330 Ω`, `470 Ω`, `1 kΩ`. Omitting the resistor burns the LED.
- **PT2399 echo**: runs directly on the same `+5 V` rail (locked upgrade stub in Tier 4).

## Run locally

```bash
npm install
npm run dev
```

Or build and preview:

```bash
npm run build
npm run preview
```

Verify headless Pixel viewport (412×915, DPR 2.625):

```bash
node scripts/verify-v7.mjs
```

## Control → chip mapping

- **Pitch** → Audio NE555 timing pot (`R2`, 200 Hz–4 kHz app band; `583 Hz–3.06 kHz` with `R1=4.7k, R2=10k, C1=100n`)
- **Rate** → LFO NE555 timing resistance (0.1–20 Hz; `0.58–3.06 Hz` breadboard `100 µF` default)
- **Depth** → LFO attenuator into Audio NE555 **pin 5 (CV)**
- **Mode (`SIREN` / `RISE` / `FALL` / `YELP`)** → LFO modulation waveform presets into pin 5
- **Trigger / Latch / Hold** → Output gate from pin 3 & LFO pause
- **Wave (`SQR` / `TRI` / `SAW`)** → Op-amp integrator shaper (Level 2)
- **HPF / LPF** → Passive RC filters (Level 3)
- **Volume** → Output level attenuator

## Top visualizer & views

- **Sticky 72 px Visualizer** (`WAVE` / `BARS` / `SPEC`): tap to cycle modes (persisted in `dublab.viz.v1`). Driven by a single dead-end master `AnalyserNode` (`fftSize 2048`).
- **View switcher**: toggle between `Circuit`, `Knobs`, `Both`, and `Schematic` in Play mode (persisted in `dublab.view.v1`). Schematic grows with placed parts, shows numbered pins, +5 V rail flags, 2.5 V op-amp bias divider, formula values, and animates live signal & LED glow.

## Progressive Build → Play loop

- **Level 0 (Core)**: Audio NE555 square oscillator (`Pitch`, `Trigger`, `Volume`) + optional `LED` & series resistor
- **Level 1 (LFO Sweep)**: Unlock via quiz or Level 0 build check → second NE555 (`Rate`, `Depth`, 4 siren modes) into pin 5
- **Level 2–3**: Op-amp wave shaper (`TRI` / `SAW`) and passive RC `LPF` / `HPF`
- **Level 4 (Stub)**: PT2399 echo upgrade (locked stub)

## Breadboard curriculum

Open the **Build** tab for the offline breadboard block layout, BOM, ordered wiring steps, control-to-part mapping, bench checklist, and debug guide (also available offline at `/docs/breadboard-curriculum.md`).
