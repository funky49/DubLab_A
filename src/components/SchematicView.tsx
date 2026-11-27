import React, { useState } from 'react';
import type { SirenParams } from '../audio/types';
import type { LedSource } from '../led';
import type { PartId } from '../progress/parts';
import './SchematicView.css';

const SCHEM_ZOOM_KEY = 'dublab.schem.zoom.v1';

type ZoomSetting = 'fit' | 1 | 1.25 | 1.6 | 2;

function loadZoom(): ZoomSetting {
  try {
    const raw = localStorage.getItem(SCHEM_ZOOM_KEY);
    if (raw === 'fit') return 'fit';
    const n = Number(raw);
    if (n === 1 || n === 1.25 || n === 1.6 || n === 2) return n;
  } catch {
    // ignore
  }
  return 1.25;
}

function formatOhms(ohms: number): string {
  if (ohms >= 1_000_000) return `${(ohms / 1_000_000).toFixed(1)}M`;
  if (ohms >= 1000) return `${(ohms / 1000).toFixed(1)}k`;
  return `${Math.round(ohms)}Ω`;
}

function rcResistanceFromHz(hz: number, capFarads = 10e-9): string {
  const r = 1 / (2 * Math.PI * Math.max(10, hz) * capFarads);
  return formatOhms(r);
}

interface SchematicViewProps {
  placedParts: PartId[];
  params: SirenParams;
  gated: boolean;
  armed: boolean;
  ledOhms: number;
  ledSource: LedSource;
  ledBurnt: boolean;
}

export const SchematicView: React.FC<SchematicViewProps> = ({
  placedParts,
  params,
  gated,
  armed,
  ledOhms,
  ledSource,
  ledBurnt,
}) => {
  const [zoom, setZoom] = useState<ZoomSetting>(() => loadZoom());
  const has = (id: PartId) => placedParts.includes(id);

  const hasPitch = has('pitch-pot');
  const hasTrigger = has('trigger-btn');
  const hasVolume = has('volume-pot');
  const hasLfo = has('lfo-555') && (has('rate-pot') || has('depth-pot'));
  const hasOpamp = has('opamp-shaper');
  const hasHpf = has('hpf-rc');
  const hasLpf = has('lpf-rc');
  const hasLed = has('led');
  const hasLedR = has('led-resistor');
  const hasPt2399 = has('pt2399-echo');

  const lfoLive = hasLfo && armed && !params.lfoHold && params.lfoDepth > 0;
  const audioLive = gated && armed;
  const ledOffLfo = ledSource === 'lfo' && hasLfo;

  const setZoomPersist = (z: ZoomSetting) => {
    setZoom(z);
    try {
      localStorage.setItem(SCHEM_ZOOM_KEY, String(z));
    } catch {
      // ignore
    }
  };

  const baseW = 780;
  const baseH = hasLfo || hasOpamp || hasPt2399 ? 485 : 310;
  const widthCss = zoom === 'fit' ? '100%' : `${Math.round(baseW * zoom * 0.62)}px`;

  return (
    <section className="panel-card schem-card" data-testid="schematic-view">
      <div className="schem-toolbar">
        <span className="panel-title">Schematic — Live +5V Circuit</span>
        <div className="schem-zoom-group">
          <button
            type="button"
            data-testid="schem-fit"
            className={`mini-btn ${zoom === 'fit' ? 'accent' : ''}`}
            onClick={() => setZoomPersist('fit')}
          >
            Fit
          </button>
          {([1, 1.25, 1.6, 2] as const).map((z) => (
            <button
              key={z}
              type="button"
              data-testid={`schem-zoom-${z}`}
              className={`mini-btn ${zoom === z ? 'accent' : ''}`}
              onClick={() => setZoomPersist(z)}
            >
              {z}×
            </button>
          ))}
        </div>
      </div>

      <div className="schem-scroll" data-testid="schematic-scroll">
        <div className="schem-canvas-box" style={{ width: widthCss }}>
          <svg
            viewBox={`0 0 ${baseW} ${baseH}`}
            className="schem-svg"
            data-testid="schematic-svg"
            role="img"
            aria-label="Interactive DubLab +5V electronic schematic"
          >
            {/* +5V Supply BT1 + C0 bypass */}
            <g data-sch="power">
              <line x1="36" y1="54" x2="36" y2="86" className="sw pwr" />
              <line x1="22" y1="86" x2="50" y2="86" className="sw pwr" strokeWidth="2.4" />
              <line x1="28" y1="94" x2="44" y2="94" className="sw" />
              <line x1="22" y1="102" x2="50" y2="102" className="sw" strokeWidth="2.4" />
              <line x1="28" y1="110" x2="44" y2="110" className="sw" />
              <line x1="36" y1="110" x2="36" y2="146" className="sw gnd" />
              <line x1="24" y1="146" x2="48" y2="146" className="sw gnd" />
              <line x1="29" y1="152" x2="43" y2="152" className="sw gnd" />
              <line x1="33" y1="158" x2="39" y2="158" className="sw gnd" />
              <text x="16" y="46" className="sch-pwr">+5V</text>
              <text x="54" y="82" className="sch-title">BT1 · 5 V supply</text>
              <text x="54" y="96" className="sch-note">USB 5V / 3×AA</text>

              {/* C0 decoupling */}
              <line x1="114" y1="54" x2="114" y2="104" className="sw pwr" />
              <line x1="104" y1="104" x2="124" y2="104" className="sw" />
              <line x1="104" y1="112" x2="124" y2="112" className="sw" />
              <line x1="114" y1="112" x2="114" y2="146" className="sw gnd" />
              <line x1="102" y1="146" x2="126" y2="146" className="sw gnd" />
              <text x="64" y="132" className="sch-note">C0 100µ + 100n</text>
              <line x1="36" y1="54" x2="156" y2="54" className="sw pwr" />
            </g>

            {/* U1 Audio NE555 */}
            <g data-sch="audio-555">
              <rect x="210" y="70" width="128" height="156" rx="6" className="sch-box ic" />
              <text x="274" y="90" textAnchor="middle" className="sch-title">
                U1 NE555
              </text>
              <text x="274" y="104" textAnchor="middle" className="sch-note">
                AUDIO ASTABLE
              </text>

              <text x="216" y="120" className="sch-pin" data-pin="U1-8">8 VCC</text>
              <text x="216" y="138" className="sch-pin" data-pin="U1-4">4 RST</text>
              <text x="216" y="158" className="sch-pin" data-pin="U1-7">7 DIS</text>
              <text x="216" y="178" className="sch-pin" data-pin="U1-6">6 THRS</text>
              <text x="216" y="198" className="sch-pin" data-pin="U1-2">2 TRIG</text>

              <text x="332" y="134" textAnchor="end" className="sch-pin" data-pin="U1-3">3 OUT</text>
              <text x="332" y="176" textAnchor="end" className="sch-pin" data-pin="U1-5">5 CTRL</text>
              <text x="332" y="212" textAnchor="end" className="sch-pin" data-pin="U1-1">1 GND</text>

              {/* +5V flag to pin 8 & 4 */}
              <line x1="184" y1="116" x2="210" y2="116" className="sw pwr" />
              <line x1="184" y1="134" x2="210" y2="134" className="sw pwr" />
              <line x1="184" y1="74" x2="184" y2="134" className="sw pwr" />
              <text x="172" y="68" className="sch-pwr">+5V</text>

              {/* R1 4.7k */}
              <line x1="156" y1="74" x2="156" y2="108" className="sw pwr" />
              <rect x="148" y="108" width="16" height="32" rx="2" className="sch-box" />
              <text x="122" y="128" className="sch-label">R1 4.7k</text>
              <line x1="156" y1="140" x2="156" y2="154" className="sw" />
              <line x1="156" y1="154" x2="210" y2="154" className="sw" />

              {/* R2 Pitch pot or fixed R2 */}
              <g data-sch={hasPitch ? 'pitch' : 'r2-fixed'}>
                <rect x="148" y="160" width="16" height="30" rx="2" className="sch-box" />
                {hasPitch && (
                  <path d="M 140 184 L 172 166" className="sw live cv" />
                )}
                <text x="96" y="178" className="sch-label">
                  {hasPitch ? 'R2 10k POT' : 'R2 10k'}
                </text>
                <line x1="156" y1="154" x2="156" y2="160" className="sw" />
                <line x1="156" y1="190" x2="156" y2="196" className="sw" />
                <line x1="156" y1="174" x2="210" y2="174" className="sw" />
                <line x1="156" y1="194" x2="210" y2="194" className="sw" />
              </g>

              {/* C1 100n timing cap */}
              <line x1="156" y1="194" x2="156" y2="220" className="sw" />
              <line x1="144" y1="220" x2="168" y2="220" className="sw" />
              <line x1="144" y1="228" x2="168" y2="228" className="sw" />
              <line x1="156" y1="228" x2="156" y2="250" className="sw gnd" />
              <line x1="144" y1="250" x2="168" y2="250" className="sw gnd" />
              <text x="106" y="226" className="sch-label">C1 100n</text>

              {/* Pin 5 10n bypass */}
              <line x1="338" y1="172" x2="362" y2="172" className="sw" />
              <line x1="362" y1="172" x2="362" y2="202" className="sw" />
              <line x1="352" y1="202" x2="372" y2="202" className="sw" />
              <line x1="352" y1="208" x2="372" y2="208" className="sw" />
              <line x1="362" y1="208" x2="362" y2="228" className="sw gnd" />
              <line x1="350" y1="228" x2="374" y2="228" className="sw gnd" />
              <text x="376" y="206" className="sch-note">10n</text>

              {/* Pin 1 GND */}
              <line x1="338" y1="208" x2="346" y2="208" className="sw gnd" />
              <line x1="346" y1="208" x2="346" y2="246" className="sw gnd" />
              <line x1="334" y1="246" x2="358" y2="246" className="sw gnd" />

              {/* Formula & 5V TLC555 note */}
              <text x="196" y="264" className="sch-note">
                f = 1.44 / ((R1 + 2·R2)·C1) · 583 Hz–3.06 kHz (app {Math.round(params.pitchHz)} Hz)
              </text>
              <text x="196" y="278" className="sch-note">
                CMOS TLC555 ideal · pin 5 = 2/3 Vcc = 3.33V
              </text>
            </g>

            {/* Output chain from U1 Pin 3 */}
            <g data-sch="output-chain">
              <line
                x1="338"
                y1="130"
                x2="386"
                y2="130"
                className={`sw ${audioLive ? 'live' : ''}`}
              />

              {/* Optional Op-Amp U2 MCP6002 integrator with Vcc/2 = 2.5V bias divider */}
              {hasOpamp && (
                <g data-sch="opamp">
                  <polygon points="388,100 388,160 448,130" className="sch-box opamp" />
                  <text x="394" y="122" className="sch-pin" data-pin="U2-2">2-</text>
                  <text x="394" y="144" className="sch-pin" data-pin="U2-3">3+</text>
                  <text x="434" y="128" className="sch-pin" data-pin="U2-1">1</text>
                  <text x="412" y="96" className="sch-pin" data-pin="U2-8">8 +5V</text>
                  <text x="412" y="172" className="sch-pin" data-pin="U2-4">4 GND</text>

                  {/* IN+ 2.5V bias divider (2x 10k + 10u to GND) */}
                  <line x1="388" y1="142" x2="378" y2="142" className="sw" />
                  <line x1="378" y1="142" x2="378" y2="162" className="sw" />
                  <rect x="372" y="162" width="12" height="18" rx="2" className="sch-box" />
                  <line x1="378" y1="180" x2="378" y2="196" className="sw gnd" />
                  <text x="382" y="210" className="sch-note">
                    MCP6002 · IN+ 2×10k + 10µ → Vcc/2 = 2.5V
                  </text>
                  <text x="382" y="223" className="sch-note">
                    {params.wave.toUpperCase()} · Cf · LM358: output max ~3.5V
                  </text>
                </g>
              )}

              {/* Trigger S1 */}
              <g data-sch={hasTrigger ? 'trigger' : 'wire-bypass'}>
                <line
                  x1={hasOpamp ? 448 : 386}
                  y1="130"
                  x2="472"
                  y2="130"
                  className={`sw ${audioLive ? 'live' : ''}`}
                />
                {hasTrigger ? (
                  <>
                    <circle cx="474" cy="130" r="3" fill="#e8a54b" />
                    <circle cx="508" cy="130" r="3" fill="#e8a54b" />
                    <line
                      x1="476"
                      y1="130"
                      x2="506"
                      y2={gated ? 130 : 114}
                      className={`sw ${audioLive ? 'live' : ''}`}
                    />
                    <text x="490" y="106" textAnchor="middle" className="sch-label">
                      S1 {gated ? 'CLOSED' : 'OPEN'}
                    </text>
                  </>
                ) : (
                  <line x1="472" y1="130" x2="510" y2="130" className="sw" />
                )}
              </g>

              {/* HPF & LPF RC */}
              {hasHpf && (
                <g data-sch="hpf">
                  <line x1="510" y1="130" x2="526" y2="130" className={`sw ${audioLive ? 'live' : ''}`} />
                  <line x1="526" y1="118" x2="526" y2="142" className="sw" />
                  <line x1="533" y1="118" x2="533" y2="142" className="sw" />
                  <line x1="533" y1="130" x2="554" y2="130" className={`sw ${audioLive ? 'live' : ''}`} />
                  <line x1="546" y1="130" x2="546" y2="170" className="sw gnd" />
                  <text x="530" y="92" textAnchor="middle" className="sch-note">
                    HPF {rcResistanceFromHz(params.hpfHz)}
                  </text>
                </g>
              )}

              {hasLpf && (
                <g data-sch="lpf">
                  <rect x="556" y="122" width="28" height="16" rx="2" className="sch-box" />
                  <line x1="596" y1="130" x2="596" y2="162" className="sw" />
                  <line x1="586" y1="162" x2="606" y2="162" className="sw" />
                  <line x1="586" y1="168" x2="606" y2="168" className="sw" />
                  <line x1="596" y1="168" x2="596" y2="184" className="sw gnd" />
                  <text x="592" y="106" textAnchor="middle" className="sch-note">
                    LPF {rcResistanceFromHz(params.lpfHz)}
                  </text>
                </g>
              )}

              {/* Coupling cap C2 10u + Volume Pot RV3 + OUT */}
              <line
                x1={hasLpf ? 584 : hasHpf ? 554 : 510}
                y1="130"
                x2="634"
                y2="130"
                className={`sw ${audioLive ? 'live' : ''}`}
              />
              <line x1="634" y1="118" x2="634" y2="142" className="sw" />
              <line x1="642" y1="118" x2="642" y2="142" className="sw" />
              <text x="638" y="112" textAnchor="middle" className="sch-note">C2 10µ</text>

              {hasVolume ? (
                <g data-sch="volume">
                  <line x1="642" y1="130" x2="672" y2="130" className={`sw ${audioLive ? 'live' : ''}`} />
                  <rect x="672" y="122" width="16" height="44" rx="2" className="sch-box" />
                  <line x1="680" y1="166" x2="680" y2="188" className="sw gnd" />
                  <line x1="668" y1="188" x2="692" y2="188" className="sw gnd" />
                  <line x1="688" y1="142" x2="730" y2="142" className={`sw ${audioLive ? 'live' : ''}`} />
                  <text x="680" y="114" textAnchor="middle" className="sch-label">RV3 10k</text>
                  <text x="742" y="146" className="sch-title">OUT</text>
                </g>
              ) : (
                <g>
                  <line x1="642" y1="130" x2="726" y2="130" className={`sw ${audioLive ? 'live' : ''}`} />
                  <text x="742" y="134" className="sch-title">OUT</text>
                </g>
              )}
            </g>

            {/* LFO U3 */}
            {hasLfo && (
              <g data-sch="lfo">
                <rect x="210" y="302" width="128" height="126" rx="6" className="sch-box lfo" />
                <text x="274" y="322" textAnchor="middle" className="sch-title">U3 NE555 LFO</text>
                <text x="274" y="336" textAnchor="middle" className="sch-note">
                  {params.lfoRateHz.toFixed(1)} Hz · Depth {Math.round(params.lfoDepth * 100)}%
                </text>
                <text x="216" y="356" className="sch-pin" data-pin="U3-8">8 +5V</text>
                <text x="216" y="374" className="sch-pin" data-pin="U3-7">7 DIS</text>
                <text x="216" y="392" className="sch-pin" data-pin="U3-2">2/6</text>
                <text x="332" y="360" textAnchor="end" className="sch-pin" data-pin="U3-3">3 OUT</text>
                <text x="332" y="394" textAnchor="end" className="sch-pin" data-pin="U3-1">1 GND</text>
                <text x="148" y="374" className="sch-label">Rate pot</text>
                <text x="148" y="402" className="sch-label">C_lfo 100µ</text>
                <text x="274" y="446" textAnchor="middle" className="sch-note">
                  0.58–3.06 Hz breadboard formula
                </text>

                {/* Depth pot -> U1 pin 5 CV */}
                <path
                  d="M 338 356 L 410 356 L 410 172 L 338 172"
                  className={`sw ${lfoLive ? 'live cv' : ''}`}
                />
                <rect x="394" y="264" width="32" height="40" rx="3" className="sch-box lfo" />
                <text x="434" y="286" className="sch-label">Depth pot → pin 5 CV</text>
              </g>
            )}

            {/* LED + Series R4 */}
            {hasLed && (
              <g
                data-sch="led"
                data-led-status={ledBurnt ? 'burnt' : 'ok'}
              >
                <line
                  x1={ledOffLfo ? 338 : 642}
                  y1={ledOffLfo ? 342 : 210}
                  x2={ledOffLfo ? 506 : 642}
                  y2={ledOffLfo ? 342 : 244}
                  className={`sw ${(!ledBurnt && (ledOffLfo ? lfoLive : audioLive)) ? 'live' : ''}`}
                />
                <rect x="606" y="244" width="96" height="72" rx="6" className="sch-box" />
                <text x="654" y="260" textAnchor="middle" className="sch-title">
                  LED1 {hasLedR ? `+ R4 ${formatOhms(ledOhms)}` : ''}
                </text>
                <circle
                  cx="630"
                  cy="286"
                  r="9"
                  className={`sch-led-bulb ${ledBurnt ? 'burnt' : ''}`}
                />
                {!ledBurnt && (
                  <g className="sch-led-rays">
                    <line x1="642" y1="278" x2="650" y2="272" />
                    <line x1="644" y1="288" x2="653" y2="288" />
                  </g>
                )}
                <text x="654" y="308" textAnchor="middle" className={ledBurnt ? 'sch-warn' : 'sch-note'}>
                  {ledBurnt ? 'no R: burns!' : ledOffLfo ? 'src: LFO' : 'src: Audio'}
                </text>
              </g>
            )}

            {/* PT2399 Echo (drawn only when placed) */}
            {hasPt2399 && (
              <g data-sch="pt2399">
                <rect x="470" y="338" width="230" height="96" rx="6" className="sch-box opamp" />
                <text x="585" y="360" textAnchor="middle" className="sch-title">U4 PT2399 ECHO</text>
                <text x="585" y="378" textAnchor="middle" className="sch-note">
                  IN · OUT · DELAY pot · VCC +5V · GND
                </text>
              </g>
            )}
          </svg>
        </div>
      </div>
    </section>
  );
};
