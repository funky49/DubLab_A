# DubLab

Offline-capable Vite + TypeScript PWA dub siren teaching instrument for electronics students, modeling an **NJD-style dual NE555 + PT2399** topology inspired by the BeniDub DS01e UX.

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

## Control → chip mapping

- **Pitch** → Audio NE555 timing pot (`R2`, 200 Hz–4 kHz band)
- **Rate** → LFO NE555 timing resistance (0.1–20 Hz)
- **Depth** → LFO attenuator into Audio NE555 **pin 5 (CV)**
- **Mode (`SIREN` / `RISE` / `FALL` / `YELP`)** → LFO modulation waveform presets into pin 5
- **Trigger / Latch / Hold** → Output gate from pin 3 & LFO pause
- **Time / Feedback / Echo Vol / Tone / Echo Cut** → PT2399 wet delay loop (~50 ms–1 s)
- **Volume** → Output level attenuator

## Top visualizer & views

- **Sticky 72 px Visualizer** (`WAVE` / `BARS` / `SPEC`): tap to cycle modes (persisted in `dublab.viz.v1`). Driven by a single dead-end master `AnalyserNode` (`fftSize 2048`).
- **View switcher**: toggle between `Circuit`, `Knobs`, `Both`, and `Schematic` in Play mode (persisted in `dublab.view.v1`). Schematic grows with placed parts, shows numbered pins, formula values, and animates live signal & LED glow.
- **LED + series resistor**: calculates current and brightness (`--led-b`), and warns if the LED is placed without a resistor.

## Progressive Build → Play loop

- **Level 0 (Core)**: Single NE555 square oscillator (`Pitch`, `Trigger`, `Volume`)
- **Level 1 (LFO Sweep)**: Unlock via quiz or Level 0 build check → second NE555 (`Rate`, `Depth`, 4 siren modes) into pin 5
- **Level 2–3**: Op-amp wave shaper (`TRI` / `SAW`) and passive RC `LPF` / `HPF`
- **Level 4 (Stub)**: PT2399 echo upgrade (locked stub)

## Breadboard curriculum

Open the **Build** tab for the offline breadboard block layout, BOM, ordered wiring steps, control-to-part mapping, bench checklist, and debug guide (also available offline at `/docs/breadboard-curriculum.md`).

## Signal flow view

The live circuit diagram sits above the controls and mirrors the hardware path:
- **NE555 LFO** pulses amber at `Rate` and feeds Audio NE555 **pin 5 (CV)** scaled by `Depth`.
- **NE555 Audio** drives the **Gate** (green when active) and splits into dry + **PT2399 Echo** wet loop (`Time`, `Feedback`, `Tone`, `Echo Cut`).
- Touching any knob or button highlights its corresponding chip block or edge.

- **Pitch** → Audio NE555 timing pot (`R2`, 200 Hz–4 kHz band)
- **Rate** → LFO NE555 timing resistance (0.1–20 Hz)
- **Depth** → LFO attenuator into Audio NE555 **pin 5 (CV)**
- **Mode (`SIREN` / `RISE` / `FALL` / `YELP`)** → LFO modulation waveform presets into pin 5
- **Trigger / Latch / Hold** → Output gate from pin 3 & LFO pause
- **Time / Feedback / Echo Vol / Tone / Echo Cut** → PT2399 wet delay loop (~50 ms–1 s)
- **Volume** → Output level attenuator
