export interface BomItem {
  qty: string;
  part: string;
  note: string;
  stage: 'core' | 'lfo' | 'shaper' | 'echo';
}

export interface ControlMapRow {
  control: string;
  physicalPart: string;
  role: string;
}

export interface WiringStep {
  step: string;
  title: string;
  bullets: string[];
}

export const BOM_ITEMS: BomItem[] = [
  { qty: '2', part: 'TLC555 / LMC555 (CMOS) or NE555', note: 'Chip A = audio astable · Chip B = LFO. CMOS ideal at 5 V', stage: 'core' },
  { qty: '2', part: 'DIP-8 IC sockets', note: 'Avoid soldering chips directly', stage: 'core' },
  { qty: '4', part: '10 kΩ linear pots', note: 'Pitch (R2), Rate, Depth, Volume', stage: 'core' },
  { qty: '1', part: '4.7 kΩ resistor (R1)', note: 'Audio astable R1', stage: 'core' },
  { qty: '1', part: '100 nF ceramic (C1)', note: 'Audio timing cap (583 Hz–3.06 kHz)', stage: 'core' },
  { qty: '2', part: '10 nF ceramic', note: 'Pin 5 CTRL bypass to GND', stage: 'core' },
  { qty: '1', part: '470 Ω resistor + Red LED', note: 'Series resistor for 5 V (~6.4 mA); never connect LED bare', stage: 'core' },
  { qty: '1', part: '10 µF + 100 µF electrolytic', note: 'Output DC block (10 µF) & +5 V rail bypass (100 µF)', stage: 'core' },
  { qty: '1', part: '5 V supply + switch', note: 'USB 5 V, 3×AA (4.5 V), or regulated 5 V. Never 9 V on CMOS/PT2399', stage: 'core' },
  { qty: '1', part: 'Momentary push-button + 6.35 mm jack', note: 'Trigger gate & line out', stage: 'core' },
  { qty: '1', part: '100 µF electrolytic (LFO C)', note: 'Slow LFO timing (~0.58–3.06 Hz)', stage: 'lfo' },
  { qty: '1', part: 'MCP6002 op-amp (or LM358)', note: 'Single-supply 5 V wave shaper, IN+ biased at Vcc/2 = 2.5 V', stage: 'shaper' },
  { qty: '1', part: 'PT2399 / PE2399 echo module', note: 'Runs on the same +5 V rail · ~50 ms–1 s practical delay', stage: 'echo' },
];

export const CONTROL_MAP: ControlMapRow[] = [
  { control: 'Pitch', physicalPart: '10 kΩ pot (R2)', role: 'Audio 555 astable timing' },
  { control: 'Rate', physicalPart: '10 kΩ pot', role: 'LFO 555 timing resistance' },
  { control: 'Depth', physicalPart: '10 kΩ pot', role: 'LFO → Audio pin 5 (CV) attenuator' },
  { control: 'Volume', physicalPart: '10 kΩ pot', role: 'Output divider (line-level attenuation)' },
  { control: 'Trigger', physicalPart: 'Momentary button', role: 'Gates pin 3 output' },
  { control: 'Mode (4×)', physicalPart: 'RC / diode presets', role: 'LFO wave shapes into pin 5' },
  { control: 'Time / FB / Wet / Tone', physicalPart: 'PT2399 module pots', role: 'Echo delay, repeats, mix, LP' },
  { control: 'Echo Cut', physicalPart: 'Momentary N.C. switch', role: 'Mutes wet return live' },
];

export const WIRING_STEPS: WiringStep[] = [
  {
    step: '0',
    title: 'Safety first',
    bullets: [
      'Check electrolytic capacitor polarity (+ to +5 V, stripe to GND) before powering up.',
      'Use +5 V (USB 5 V, 3×AA, or regulated 5 V). Never feed 9 V into a CMOS 555 or PT2399.',
      'Always wire a series resistor (470 Ω default ≈ 6.4 mA) with the LED.',
    ],
  },
  {
    step: '1',
    title: 'Audio 555 oscillator (test alone first)',
    bullets: [
      'Seat Audio 555 in DIP-8 socket: pin 8 & pin 4 → +5 V rail, pin 1 → GND rail.',
      'Wire R1 = 4.7 kΩ (pin 8 → pin 7), Pitch pot R2 = 10 kΩ (pin 7 → pin 6/2), C1 = 100 nF (pin 2 → GND).',
      'Add 10 nF from pin 5 to GND. Pin 3 → Trigger switch → 10 µF DC block → Volume pot → jack.',
      'Power on and test Pitch sweep (583 Hz–3.06 kHz formula band). Pin 5 should read ~3.33 V.',
    ],
  },
  {
    step: '2',
    title: 'LFO 555 into pin 5',
    bullets: [
      'Wire second 555 with 100 µF timing cap and Rate pot (~0.58–3.06 Hz).',
      'Route LFO pin 3 through Depth pot into Audio 555 pin 5 (CTRL).',
      'Raise Depth and sweep Rate: siren pitch modulation appears.',
    ],
  },
  {
    step: '3',
    title: 'Op-amp shaper + RC filters',
    bullets: [
      'Bias MCP6002 IN+ at Vcc/2 = 2.5 V using two 10 kΩ resistors (+5 V / GND) and 10 µF to GND.',
      'AC-couple Audio 555 into IN− with integrator cap Cf to shape square → triangle/saw.',
      'Add passive HPF/LPF RC stages before the output Volume pot.',
    ],
  },
  {
    step: '4',
    title: 'PT2399 echo upgrade (locked in early tiers)',
    bullets: [
      'Power PT2399 from the same +5 V rail with 100 nF + 10 µF decoupling at VCC.',
      'Split post-trigger dry and wet PT2399 IN/OUT, mixing back before Volume.',
    ],
  },
];

export const DEBUG_ROWS = [
  { symptom: 'No sound', check: 'Check GND continuity, pin 8 = +5 V, pin 4 = +5 V, pin 5 ≈ 3.33 V, trigger & jack.' },
  { symptom: 'Whistles with knobs at rest', check: 'Check pot wiper wiring on Pitch / Depth.' },
  { symptom: 'No siren sweep', check: 'Verify LFO pin 8/1 power, Depth pot wiper, and link to Audio pin 5.' },
  { symptom: 'LED burnt / dim', check: 'Never omit series R! 470 Ω gives ~6.4 mA at 5 V (Vf ≈ 2 V).' },
];
