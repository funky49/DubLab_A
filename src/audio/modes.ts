import type { SirenModeId } from './types';

export interface SirenModePreset {
  id: SirenModeId;
  label: string;
  chipHint: string;
  oscType: OscillatorType;
  invertPolarity: boolean;
}

export const SIREN_MODES: SirenModePreset[] = [
  {
    id: 'siren',
    label: 'SIREN',
    chipHint: 'Tri LFO → pin 5',
    oscType: 'triangle',
    invertPolarity: false,
  },
  {
    id: 'rise',
    label: 'RISE',
    chipHint: 'Ramp up RC',
    oscType: 'sawtooth',
    invertPolarity: false,
  },
  {
    id: 'fall',
    label: 'FALL',
    chipHint: 'Decay RC',
    oscType: 'sawtooth',
    invertPolarity: true,
  },
  {
    id: 'yelp',
    label: 'YELP',
    chipHint: 'Hi-Lo step',
    oscType: 'square',
    invertPolarity: false,
  },
];

export function getModePreset(id: SirenModeId): SirenModePreset {
  return SIREN_MODES.find((m) => m.id === id) ?? SIREN_MODES[0];
}
