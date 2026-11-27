export interface QuizQuestion {
  id: string;
  prompt: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

export interface QuizDef {
  id: string;
  tierToUnlock: number;
  title: string;
  questions: QuizQuestion[];
}

export const QUIZZES: Record<string, QuizDef> = {
  'quiz-l1': {
    id: 'quiz-l1',
    tierToUnlock: 1,
    title: 'Level 1 Unlock Quiz — LFO & Pin 5 CV',
    questions: [
      {
        id: 'q1-pin5',
        prompt: 'Which NE555 pin receives the LFO control voltage to bend the siren pitch?',
        options: ['Pin 1 (GND)', 'Pin 5 (CTRL)', 'Pin 8 (VCC)'],
        answerIndex: 1,
        explanation: 'Pin 5 (CTRL) sits at 2/3 Vcc (3.33 V on a +5 V rail); shifting it modulates frequency.',
      },
      {
        id: 'q1-cap',
        prompt: 'Why does the LFO 555 use a much larger capacitor (e.g. 100 µF) than the audio 555 (100 nF)?',
        options: [
          'To slow the oscillation down to ~0.6–3 Hz',
          'To increase output speaker wattage',
          'To invert the +5 V power rail',
        ],
        answerIndex: 0,
        explanation: 'Frequency f = 1.44 / ((R1 + 2×R2) × C1) is inversely proportional to C1.',
      },
    ],
  },
  'quiz-l2': {
    id: 'quiz-l2',
    tierToUnlock: 2,
    title: 'Level 2 Unlock Quiz — Op-Amp Wave Shaper',
    questions: [
      {
        id: 'q2-bias',
        prompt: 'On a single +5 V supply, what DC voltage biases the op-amp non-inverting (+) input?',
        options: ['0 V (GND)', '2.5 V (Vcc / 2)', '5.0 V (rail)'],
        answerIndex: 1,
        explanation: 'Two equal 10 kΩ resistors create a Vcc/2 = 2.5 V mid-rail reference so the wave swings symmetrically.',
      },
    ],
  },
  'quiz-l3': {
    id: 'quiz-l3',
    tierToUnlock: 3,
    title: 'Level 3 Unlock Quiz — Passive RC Filters',
    questions: [
      {
        id: 'q3-rc',
        prompt: 'What does a Low-Pass RC filter remove from a raw 555 square wave?',
        options: [
          'High-frequency harmonics above fc = 1/(2πRC)',
          'The +5 V DC supply voltage',
          'Sub-bass frequencies below 20 Hz',
        ],
        answerIndex: 0,
        explanation: 'An RC low-pass rolls off upper harmonics to mellow the harsh square buzz.',
      },
    ],
  },
};
