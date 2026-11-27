import type { EngineCapabilities } from '../audio/types';

export type PartId =
  | 'audio-555'
  | 'pitch-pot'
  | 'trigger-btn'
  | 'volume-pot'
  | 'lfo-555'
  | 'rate-pot'
  | 'depth-pot'
  | 'opamp-shaper'
  | 'lpf-rc'
  | 'hpf-rc'
  | 'pt2399-echo';

export type PartKind = 'ic' | 'pot' | 'switch' | 'filter' | 'echo';

export interface PartDef {
  id: PartId;
  name: string;
  shortName: string;
  tier: number;
  kind: PartKind;
  needs: PartId[];
  enables: string;
  chipNote: string;
}

export interface TierDef {
  tier: number;
  title: string;
  subtitle: string;
  quizId?: string;
  buildRequirement?: PartId[];
  lockedReason?: string;
}

export const PARTS: PartDef[] = [
  {
    id: 'audio-555',
    name: 'Audio NE555',
    shortName: 'Audio 555',
    tier: 0,
    kind: 'ic',
    needs: [],
    enables: 'Astable square oscillator (200 Hz–4 kHz)',
    chipNote: 'U1 · Pin 3 out, Pin 5 CTRL',
  },
  {
    id: 'pitch-pot',
    name: 'Pitch Pot (R2)',
    shortName: 'Pitch 10k',
    tier: 0,
    kind: 'pot',
    needs: ['audio-555'],
    enables: 'Pitch frequency knob',
    chipNote: '10 kΩ timing pot on pins 6/7',
  },
  {
    id: 'trigger-btn',
    name: 'Trigger Switch',
    shortName: 'Trigger',
    tier: 0,
    kind: 'switch',
    needs: ['audio-555'],
    enables: 'Gate switch (Latch / Momentary)',
    chipNote: 'S1 gates pin 3 output',
  },
  {
    id: 'volume-pot',
    name: 'Volume Pot',
    shortName: 'Volume 10k',
    tier: 0,
    kind: 'pot',
    needs: ['audio-555'],
    enables: 'Line-level output attenuator',
    chipNote: '10 kΩ output divider after 10 µF',
  },
  {
    id: 'lfo-555',
    name: 'LFO NE555',
    shortName: 'LFO 555',
    tier: 1,
    kind: 'ic',
    needs: ['audio-555'],
    enables: 'Siren modulation modes + Hold',
    chipNote: 'U3 slow astable (100 µF)',
  },
  {
    id: 'rate-pot',
    name: 'Rate Pot',
    shortName: 'Rate 10k',
    tier: 1,
    kind: 'pot',
    needs: ['lfo-555'],
    enables: 'LFO Rate knob (0.1–20 Hz)',
    chipNote: 'Controls LFO 555 timing R',
  },
  {
    id: 'depth-pot',
    name: 'Depth Pot → Pin 5',
    shortName: 'Depth → p5',
    tier: 1,
    kind: 'pot',
    needs: ['lfo-555'],
    enables: 'CV sweep depth into Audio pin 5',
    chipNote: 'Attenuates LFO → U1 pin 5',
  },
  {
    id: 'opamp-shaper',
    name: 'Op-Amp Shaper',
    shortName: 'Op-Amp',
    tier: 2,
    kind: 'ic',
    needs: ['audio-555'],
    enables: 'Triangle & Sawtooth waveforms',
    chipNote: 'U2 single-supply integrator',
  },
  {
    id: 'lpf-rc',
    name: 'RC Low-Pass Filter',
    shortName: 'LPF RC',
    tier: 3,
    kind: 'filter',
    needs: ['audio-555'],
    enables: 'Master Low-Pass cutoff knob',
    chipNote: 'Tames harsh square harmonics',
  },
  {
    id: 'hpf-rc',
    name: 'RC High-Pass Filter',
    shortName: 'HPF RC',
    tier: 3,
    kind: 'filter',
    needs: ['audio-555'],
    enables: 'Master High-Pass cutoff knob',
    chipNote: 'Cuts sub-bass thump',
  },
  {
    id: 'pt2399-echo',
    name: 'PT2399 Echo Module',
    shortName: 'PT2399',
    tier: 4,
    kind: 'echo',
    needs: ['audio-555', 'trigger-btn'],
    enables: 'Echo Time, Feedback, Wet, Tone, Cut',
    chipNote: 'Locked upgrade stub (~50ms–1s)',
  },
];

export const TIERS: TierDef[] = [
  {
    tier: 0,
    title: 'Level 0: Core 555',
    subtitle: 'Bare NE555 square oscillator + Pitch, Trigger, Volume',
    buildRequirement: ['audio-555', 'pitch-pot', 'trigger-btn', 'volume-pot'],
  },
  {
    tier: 1,
    title: 'Level 1: LFO Sweep',
    subtitle: 'Second NE555 modulating pin 5 CV (Rate + Depth + Modes)',
    quizId: 'quiz-l1',
    buildRequirement: ['lfo-555', 'rate-pot', 'depth-pot'],
  },
  {
    tier: 2,
    title: 'Level 2: Op-Amp Shaper',
    subtitle: 'Wave shaper unlocks Triangle & Sawtooth',
    quizId: 'quiz-l2',
    buildRequirement: ['opamp-shaper'],
  },
  {
    tier: 3,
    title: 'Level 3: RC Filters',
    subtitle: 'Passive Low-Pass & High-Pass tone shaping',
    quizId: 'quiz-l3',
    buildRequirement: ['lpf-rc', 'hpf-rc'],
  },
  {
    tier: 4,
    title: 'Level 4: PT2399 Echo',
    subtitle: 'Onboard delay chip (locked stub — future curriculum)',
    lockedReason: 'Future hardware module (locked stub)',
  },
];

export function deriveCapabilities(placed: PartId[]): EngineCapabilities {
  const has = (id: PartId) => placed.includes(id);
  return {
    lfo: has('lfo-555') && (has('rate-pot') || has('depth-pot')),
    opamp: has('opamp-shaper'),
    lpf: has('lpf-rc'),
    hpf: has('hpf-rc'),
    echo: has('pt2399-echo'),
  };
}
