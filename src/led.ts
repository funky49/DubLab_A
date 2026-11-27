export type LedSource = 'auto' | 'audio' | 'lfo';

export const LED_VF = 2.0;

export function computeLedCurrentMa(vout: number, hasResistor: boolean, ohms: number): number {
  if (!hasResistor || ohms <= 0) return Number.POSITIVE_INFINITY;
  return Math.max(0, ((vout - LED_VF) / ohms) * 1000);
}

export function computeLedBrightness(
  vout: number,
  hasLed: boolean,
  hasResistor: boolean,
  ohms: number,
  signal: number,
): { burnt: boolean; currentMa: number; brightness: number; label: string } {
  if (!hasLed) {
    return { burnt: false, currentMa: 0, brightness: 0, label: 'No LED' };
  }
  if (!hasResistor) {
    return {
      burnt: true,
      currentMa: Number.POSITIVE_INFINITY,
      brightness: 0,
      label: `BURNT! No R at ${vout}V`,
    };
  }
  const currentMa = computeLedCurrentMa(vout, true, ohms);
  const currentScale = Math.max(0.18, Math.min(1.0, currentMa / 12));
  const brightness = Math.max(0.05, Math.min(1.0, currentScale * Math.max(0.08, signal)));
  return {
    burnt: false,
    currentMa,
    brightness,
    label: `${ohms}Ω · ${currentMa.toFixed(1)} mA`,
  };
}
