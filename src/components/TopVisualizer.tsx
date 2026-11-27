import React, { useEffect, useRef, useState } from 'react';
import type { DubSirenEngine } from '../audio/DubSirenEngine';

export type VizMode = 'wave' | 'bars' | 'spec';

const VIZ_STORAGE_KEY = 'dublab.viz.v1';

const BANDS = [
  { min: 20, max: 60, color: '#6b5cff' },
  { min: 60, max: 250, color: '#3d8bfd' },
  { min: 250, max: 500, color: '#2ec4b6' },
  { min: 500, max: 2000, color: '#3ecf8e' },
  { min: 2000, max: 4000, color: '#e8c547' },
  { min: 4000, max: 6000, color: '#e8a54b' },
  { min: 6000, max: 20000, color: '#e26d5a' },
];

function bandColorForHz(hz: number): string {
  for (const b of BANDS) {
    if (hz >= b.min && hz <= b.max) return b.color;
  }
  return '#3ecf8e';
}

function hzToNote(hz: number): string {
  if (hz < 20) return '--';
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const midi = Math.round(69 + 12 * Math.log2(hz / 440));
  const name = notes[((midi % 12) + 12) % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${name}${octave}`;
}

export function loadVizMode(): VizMode {
  try {
    const v = localStorage.getItem(VIZ_STORAGE_KEY);
    if (v === 'wave' || v === 'bars' || v === 'spec') return v;
  } catch {
    // ignore
  }
  return 'wave';
}

interface TopVisualizerProps {
  engine: DubSirenEngine;
  ctxState: AudioContextState | 'uninitialized';
  gated: boolean;
  onFrameSample?: (peak: number, lfoLevel: number) => void;
}

export const TopVisualizer: React.FC<TopVisualizerProps> = ({
  engine,
  ctxState,
  gated,
  onFrameSample,
}) => {
  const [mode, setMode] = useState<VizMode>(() => loadVizMode());
  const [readout, setReadout] = useState<string>('IDLE');
  const [clipping, setClipping] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const modeRef = useRef<VizMode>(mode);
  const ctxStateRef = useRef(ctxState);
  const gatedRef = useRef(gated);
  const onFrameRef = useRef(onFrameSample);

  modeRef.current = mode;
  ctxStateRef.current = ctxState;
  gatedRef.current = gated;
  onFrameRef.current = onFrameSample;

  const cycleMode = () => {
    const order: VizMode[] = ['wave', 'bars', 'spec'];
    const next = order[(order.indexOf(mode) + 1) % order.length];
    setMode(next);
    try {
      localStorage.setItem(VIZ_STORAGE_KEY, next);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const c2d = canvas.getContext('2d');
    if (!c2d) return;

    const reducedMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const minIntervalMs = reducedMotion ? 50 : 0;

    let raf = 0;
    let lastDraw = 0;
    let timeBuf: Uint8Array<ArrayBuffer> | null = null;
    let freqBuf: Uint8Array<ArrayBuffer> | null = null;
    const barPeaks = new Float32Array(48);
    let specImg: ImageData | null = null;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.floor(rect.width * dpr));
      const h = Math.max(1, Math.floor(rect.height * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        specImg = null;
      }
      return { w, h, dpr };
    };

    const drawIdle = (w: number, h: number, dpr: number) => {
      c2d.fillStyle = '#0e1613';
      c2d.fillRect(0, 0, w, h);
      c2d.strokeStyle = 'rgba(62, 207, 142, 0.25)';
      c2d.lineWidth = Math.max(1, dpr);
      c2d.beginPath();
      c2d.moveTo(0, h / 2);
      c2d.lineTo(w, h / 2);
      c2d.stroke();
      setReadout('▶ Play to see sound');
      setClipping(false);
    };

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (document.hidden) return;
      if (minIntervalMs > 0 && now - lastDraw < minIntervalMs) return;
      lastDraw = now;

      const { w, h, dpr } = resize();
      const analyser = engine.getAnalyser();
      const ctx = engine.getContext();
      const isRunning = ctxStateRef.current === 'running' && analyser && ctx;

      if (!isRunning) {
        drawIdle(w, h, dpr);
        onFrameRef.current?.(0, engine.getLfoLevel());
        return;
      }

      if (!timeBuf || timeBuf.length !== analyser.fftSize) {
        timeBuf = new Uint8Array(new ArrayBuffer(analyser.fftSize));
      }
      if (!freqBuf || freqBuf.length !== analyser.frequencyBinCount) {
        freqBuf = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
      }

      analyser.getByteTimeDomainData(timeBuf);
      analyser.getByteFrequencyData(freqBuf);

      let peak = 0;
      for (let i = 0; i < timeBuf.length; i++) {
        const v = Math.abs((timeBuf[i] - 128) / 128);
        if (v > peak) peak = v;
      }
      setClipping(peak >= 0.98);
      onFrameRef.current?.(peak, engine.getLfoLevel());

      // Dominant Hz readout
      let maxBin = 0;
      let maxVal = 0;
      for (let i = 1; i < freqBuf.length; i++) {
        if (freqBuf[i] > maxVal) {
          maxVal = freqBuf[i];
          maxBin = i;
        }
      }
      if (gatedRef.current && maxVal > 12) {
        const domHz = (maxBin * ctx.sampleRate) / analyser.fftSize;
        setReadout(`${Math.round(domHz)} Hz · ${hzToNote(domHz)}`);
      } else if (!gatedRef.current) {
        setReadout('IDLE');
      }

      const activeMode = modeRef.current;
      const accent =
        getComputedStyle(document.documentElement).getPropertyValue('--viz-accent').trim() ||
        '#3ecf8e';

      if (activeMode === 'wave') {
        c2d.fillStyle = '#0e1613';
        c2d.fillRect(0, 0, w, h);

        // Center reference line
        c2d.strokeStyle = 'rgba(142, 166, 153, 0.2)';
        c2d.lineWidth = Math.max(1, dpr);
        c2d.beginPath();
        c2d.moveTo(0, h / 2);
        c2d.lineTo(w, h / 2);
        c2d.stroke();

        // Rising zero-crossing trigger for steady 555 standing wave
        let trig = 0;
        const limit = Math.floor(timeBuf.length * 0.5);
        for (let i = 1; i < limit; i++) {
          if (timeBuf[i - 1] < 128 && timeBuf[i] >= 128) {
            trig = i;
            break;
          }
        }
        const span = Math.min(512, timeBuf.length - trig);
        c2d.strokeStyle = accent;
        c2d.lineWidth = 2 * dpr;
        c2d.beginPath();
        for (let x = 0; x < w; x++) {
          const idx = trig + Math.floor((x / w) * (span - 1));
          const norm = (timeBuf[idx] - 128) / 128;
          const y = h / 2 - norm * (h * 0.42);
          if (x === 0) c2d.moveTo(x, y);
          else c2d.lineTo(x, y);
        }
        c2d.stroke();
      } else if (activeMode === 'bars') {
        c2d.fillStyle = '#0e1613';
        c2d.fillRect(0, 0, w, h);

        const bars = 48;
        const minHz = 40;
        const maxHz = 8000;
        const binHz = ctx.sampleRate / analyser.fftSize;
        const bw = w / bars;

        for (let b = 0; b < bars; b++) {
          const f0 = minHz * Math.pow(maxHz / minHz, b / bars);
          const f1 = minHz * Math.pow(maxHz / minHz, (b + 1) / bars);
          const i0 = Math.max(0, Math.floor(f0 / binHz));
          const i1 = Math.min(freqBuf.length - 1, Math.ceil(f1 / binHz));
          let m = 0;
          for (let k = i0; k <= i1; k++) {
            const v = freqBuf[k] / 255;
            if (v > m) m = v;
          }
          barPeaks[b] = Math.max(m, barPeaks[b] * 0.92);
          const barH = m * (h - 6 * dpr);
          const x = b * bw;
          c2d.fillStyle = bandColorForHz((f0 + f1) * 0.5);
          c2d.fillRect(x + dpr * 0.5, h - barH, Math.max(1, bw - dpr), barH);

          const py = h - barPeaks[b] * (h - 6 * dpr) - 2 * dpr;
          c2d.fillStyle = '#e8a54b';
          c2d.fillRect(x + dpr * 0.5, Math.max(0, py), Math.max(1, bw - dpr), 2 * dpr);
        }
      } else {
        // SPEC: scrolling log-frequency spectrogram
        if (!specImg || specImg.width !== w || specImg.height !== h) {
          specImg = c2d.createImageData(w, h);
          const d = specImg.data;
          for (let i = 0; i < d.length; i += 4) {
            d[i] = 14;
            d[i + 1] = 22;
            d[i + 2] = 19;
            d[i + 3] = 255;
          }
        }
        const d = specImg.data;
        for (let y = 0; y < h; y++) {
          const row = y * w * 4;
          d.copyWithin(row, row + 4, row + w * 4);
        }
        const minHz = 40;
        const maxHz = 8000;
        const binHz = ctx.sampleRate / analyser.fftSize;
        for (let y = 0; y < h; y++) {
          const frac = 1 - y / Math.max(1, h - 1);
          const hz = minHz * Math.pow(maxHz / minHz, frac);
          const bin = Math.min(freqBuf.length - 1, Math.max(0, Math.round(hz / binHz)));
          const m = freqBuf[bin] / 255;
          const k = (y * w + w - 1) * 4;
          d[k] = Math.min(255, Math.floor(m * 40 + m * m * 200));
          d[k + 1] = Math.min(255, Math.floor(14 + m * 180));
          d[k + 2] = Math.min(255, Math.floor(19 + m * 130));
          d[k + 3] = 255;
        }
        c2d.putImageData(specImg, 0, 0);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
    };
  }, [engine]);

  return (
    <div
      className={`viz-sticky ${clipping ? 'clipping' : ''}`}
      data-testid="top-visualizer"
      data-viz-mode={mode}
      role="button"
      tabIndex={0}
      aria-label={`Visualizer mode ${mode}. Tap to cycle WAVE, BARS, SPEC.`}
      onClick={cycleMode}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          cycleMode();
        }
      }}
    >
      <canvas ref={canvasRef} className="viz-canvas" data-testid="viz-canvas" />
      <span className="viz-chip-left" data-testid="viz-mode-chip">
        {mode.toUpperCase()}
      </span>
      <span className="viz-chip-right" data-testid="viz-readout">
        {readout}
      </span>
    </div>
  );
};
