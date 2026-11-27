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
