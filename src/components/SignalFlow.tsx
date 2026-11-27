import React from 'react';
import type { EngineCapabilities, SirenParams } from '../audio/types';

interface SignalFlowProps {
  params: SirenParams;
  gated: boolean;
  lfoLevel: number;
  lastTouched: string | null;
  caps?: EngineCapabilities;
  hasLed?: boolean;
  ledBurnt?: boolean;
  ledStatusText?: string;
}

const TOUCH_TO_BLOCK: Record<string, string> = {
  pitch: 'audio',
  wave: 'opamp',
  rate: 'lfo',
  depth: 'pin5',
  mode: 'lfo',
  lfoHold: 'lfo',
  trigger: 'gate',
  volume: 'volume',
  echoTime: 'echo',
  echoFeedback: 'echo',
  echoWet: 'echo',
  echoTone: 'echo',
  echoCut: 'echo',
  lpf: 'filter',
  hpf: 'filter',
  led: 'led',
};

export const SignalFlow: React.FC<SignalFlowProps> = ({
  params,
  gated,
  lfoLevel,
  lastTouched,
  caps = { lfo: true, opamp: false, lpf: false, hpf: false, echo: true },
  hasLed = false,
  ledBurnt = false,
  ledStatusText,
}) => {
  const focus = lastTouched ? TOUCH_TO_BLOCK[lastTouched] ?? null : null;
  const lfoActive = caps.lfo && !params.lfoHold && params.lfoDepth > 0;
  const echoActive = caps.echo && gated && !params.echoCut && params.echoWet > 0.01;

  return (
    <section className="panel-card flow-card" data-testid="signal-flow">
      <div className="panel-head">
        <span className="panel-title">Signal Flow — Live Circuit</span>
        <span className="panel-chip">
          {gated ? 'GATED · LIVE' : 'IDLE'}
          {caps.lfo ? ` · LFO ${params.lfoRateHz.toFixed(1)}Hz` : ''}
        </span>
      </div>

      <svg
        viewBox="0 0 380 182"
        className="flow-svg"
        role="img"
        aria-label="Live dub siren signal flow diagram"
      >
        <defs>
          <marker id="arrow-green" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#3ecf8e" />
          </marker>
          <marker id="arrow-amber" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#e8a54b" />
          </marker>
          <marker id="arrow-blue" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#38bdf8" />
          </marker>
          <marker id="arrow-muted" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#465c50" />
          </marker>
        </defs>

        {/* LFO -> Pin 5 CV -> Audio 555 */}
        {caps.lfo && (
          <g data-flow-block="lfo">
            <rect
              x="12"
              y="10"
              width="102"
              height="44"
              rx="7"
              className={`flow-node lfo ${lfoActive ? 'active' : ''} ${focus === 'lfo' ? 'focused' : ''}`}
            />
            <text x="63" y="27" textAnchor="middle" className="flow-node-title">
              NE555 LFO
            </text>
            <text x="63" y="42" textAnchor="middle" className="flow-node-sub">
              {params.lfoHold
                ? 'HOLD'
                : `${params.lfoRateHz.toFixed(1)}Hz · ${Math.round(params.lfoDepth * 100)}%`}
            </text>
            <circle
              cx="102"
              cy="20"
              r="4"
              fill={lfoActive ? '#e8a54b' : '#324239'}
              opacity={lfoActive ? 0.35 + lfoLevel * 0.65 : 0.4}
            />

            <path
              d="M 114 32 L 152 32 L 152 62"
              fill="none"
              className={`flow-wire amber ${lfoActive ? 'live' : ''} ${focus === 'pin5' ? 'focused' : ''}`}
              markerEnd={lfoActive ? 'url(#arrow-amber)' : 'url(#arrow-muted)'}
            />
            <text x="148" y="24" textAnchor="middle" className="flow-edge-label">
              pin 5 CV
            </text>
          </g>
        )}

        {/* Audio NE555 */}
        <g data-flow-block="audio">
          <rect
            x="108"
            y="64"
            width="98"
            height="48"
            rx="7"
            className={`flow-node audio ${gated ? 'active' : ''} ${focus === 'audio' ? 'focused' : ''}`}
          />
          <text x="157" y="82" textAnchor="middle" className="flow-node-title">
            NE555 AUDIO
          </text>
          <text x="157" y="96" textAnchor="middle" className="flow-node-sub">
            {Math.round(params.pitchHz)} Hz · {caps.opamp ? params.wave.slice(0, 3).toUpperCase() : 'SQR'}
          </text>
        </g>

        {/* Op-Amp / Filter badge when unlocked */}
        {(caps.opamp || caps.lpf || caps.hpf) && (
          <g data-flow-block="shape">
            <rect
              x="12"
              y="66"
              width="78"
              height="44"
              rx="7"
              className={`flow-node ${gated ? 'active' : ''} ${focus === 'opamp' || focus === 'filter' ? 'focused' : ''}`}
            />
            <text x="51" y="83" textAnchor="middle" className="flow-node-title">
              {caps.opamp ? 'OP-AMP' : 'SHAPER'}
            </text>
            <text x="51" y="98" textAnchor="middle" className="flow-node-sub">
              {caps.lpf || caps.hpf
                ? `HP ${Math.round(params.hpfHz)} · LP ${(params.lpfHz / 1000).toFixed(1)}k`
                : params.wave.toUpperCase()}
            </text>
            <path
              d="M 90 88 L 106 88"
              fill="none"
              className={`flow-wire green ${gated ? 'live' : ''}`}
            />
          </g>
        )}

        {/* Audio -> Trigger Gate */}
        <path
          d="M 206 88 L 234 88"
          fill="none"
          className={`flow-wire green ${gated ? 'live' : ''}`}
          markerEnd={gated ? 'url(#arrow-green)' : 'url(#arrow-muted)'}
        />

        <g data-flow-block="gate">
          <rect
            x="236"
            y="68"
            width="58"
            height="40"
            rx="7"
            className={`flow-node gate ${gated ? 'active' : ''} ${focus === 'gate' ? 'focused' : ''}`}
          />
          <text x="265" y="85" textAnchor="middle" className="flow-node-title">
            GATE
          </text>
          <text x="265" y="99" textAnchor="middle" className="flow-node-sub">
            {gated ? 'OPEN' : 'MUTED'}
          </text>
        </g>

        {/* Gate -> Volume / Out */}
        <path
          d="M 294 88 L 316 88"
          fill="none"
          className={`flow-wire green ${gated ? 'live' : ''}`}
          markerEnd={gated ? 'url(#arrow-green)' : 'url(#arrow-muted)'}
        />

        <g data-flow-block="volume">
          <rect
            x="318"
            y="68"
            width="52"
            height="40"
            rx="7"
            className={`flow-node ${gated ? 'active' : ''} ${focus === 'volume' ? 'focused' : ''}`}
          />
          <text x="344" y="85" textAnchor="middle" className="flow-node-title">
            VOL
          </text>
          <text x="344" y="99" textAnchor="middle" className="flow-node-sub">
            {Math.round(params.volume * 100)}%
          </text>
        </g>

        {/* LED Indicator node */}
        {hasLed && (
          <g data-flow-block="led">
            <rect
              x="236"
              y="12"
              width="134"
              height="40"
              rx="7"
              className={`flow-node ${ledBurnt ? 'burnt' : ''} ${focus === 'led' ? 'focused' : ''}`}
            />
            <circle
              cx="256"
              cy="32"
              r="8"
              className="flow-led-bulb"
              style={{
                fill: ledBurnt ? '#2b1817' : 'rgba(255, 75, 62, calc(0.2 + var(--led-b, 0.1) * 0.8))',
                stroke: ledBurnt ? '#ff4b3e' : '#ff7b70',
              }}
            />
            <text x="312" y="28" textAnchor="middle" className="flow-node-title">
              {ledBurnt ? 'LED BURNT' : 'LED + R'}
            </text>
            <text x="312" y="42" textAnchor="middle" className="flow-node-sub">
              {ledStatusText ?? 'Active'}
            </text>
            <path
              d="M 206 72 L 222 72 L 222 32 L 234 32"
              fill="none"
              className={`flow-wire ${gated && !ledBurnt ? 'green live' : ''}`}
            />
          </g>
        )}

        {/* PT2399 Echo Loop */}
        {caps.echo ? (
          <g data-flow-block="echo">
            <path
              d="M 265 108 L 265 144 L 226 144"
              fill="none"
              className={`flow-wire blue ${echoActive ? 'live' : ''}`}
              markerEnd={echoActive ? 'url(#arrow-blue)' : 'url(#arrow-muted)'}
            />
            <rect
              x="92"
              y="124"
              width="132"
              height="46"
              rx="7"
              className={`flow-node echo ${echoActive ? 'active' : ''} ${params.echoCut ? 'cut' : ''} ${focus === 'echo' ? 'focused' : ''}`}
            />
            <text x="158" y="142" textAnchor="middle" className="flow-node-title">
              PT2399 ECHO {params.echoCut ? '(CUT)' : ''}
            </text>
            <text x="158" y="158" textAnchor="middle" className="flow-node-sub">
              {Math.round(params.echoTimeMs)}ms · FB {Math.round(params.echoFeedback * 100)}% · Wet{' '}
              {Math.round(params.echoWet * 100)}%
            </text>
            <path
              d="M 224 156 L 344 156 L 344 110"
              fill="none"
              className={`flow-wire blue ${echoActive ? 'live' : ''}`}
              markerEnd={echoActive ? 'url(#arrow-blue)' : 'url(#arrow-muted)'}
            />
            <text x="290" y="170" textAnchor="middle" className="flow-edge-label">
              {params.echoCut ? 'wet muted' : 'wet mix → out'}
            </text>
          </g>
        ) : (
          <g data-flow-block="echo-locked">
            <rect x="92" y="128" width="184" height="38" rx="7" className="flow-node locked" />
            <text x="184" y="151" textAnchor="middle" className="flow-node-sub">
              PT2399 Echo — locked upgrade (v4+ stub)
            </text>
          </g>
        )}
      </svg>
    </section>
  );
};
