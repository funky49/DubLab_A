export type SirenModeId = 'siren' | 'rise' | 'fall' | 'yelp';
export type WaveShape = 'square' | 'triangle' | 'sawtooth';
export type TriggerMode = 'latch' | 'momentary';

export interface SirenParams {
  pitchHz: number;
  lfoRateHz: number;
  lfoDepth: number;
  lfoHold: boolean;
  mode: SirenModeId;
  triggerMode: TriggerMode;
  echoTimeMs: number;
  echoFeedback: number;
  echoWet: number;
  echoToneHz: number;
  echoCut: boolean;
  volume: number;
  wave: WaveShape;
  lpfHz: number;
  hpfHz: number;
}

export interface EngineCapabilities {
  lfo: boolean;
  opamp: boolean;
  lpf: boolean;
  hpf: boolean;
  echo: boolean;
}

export interface EngineDiagnostics {
  state: AudioContextState | 'uninitialized';
  gated: boolean;
  gateGain: number;
  dryGain: number;
  volume: number;
  echoCut: boolean;
  peak: number;
}

export const DEFAULT_PARAMS: SirenParams = {
  pitchHz: 680,
  lfoRateHz: 3.2,
  lfoDepth: 0.65,
  lfoHold: false,
  mode: 'siren',
  triggerMode: 'latch',
  echoTimeMs: 280,
  echoFeedback: 0.48,
  echoWet: 0.42,
  echoToneHz: 2400,
  echoCut: false,
  volume: 0.85,
  wave: 'square',
  lpfHz: 8000,
  hpfHz: 60,
};

export const PARAM_RANGES = {
  pitchHz: { min: 200, max: 4000, step: 1 },
  lfoRateHz: { min: 0.1, max: 20, step: 0.1 },
  lfoDepth: { min: 0, max: 1, step: 0.01 },
  echoTimeMs: { min: 50, max: 1000, step: 5 },
  echoFeedback: { min: 0, max: 0.85, step: 0.01 },
  echoWet: { min: 0, max: 1, step: 0.01 },
  echoToneHz: { min: 400, max: 6500, step: 10 },
  volume: { min: 0, max: 1, step: 0.01 },
  lpfHz: { min: 300, max: 12000, step: 10 },
  hpfHz: { min: 30, max: 1500, step: 5 },
} as const;
