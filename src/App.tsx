import React, { useEffect, useRef, useState } from 'react';
import { DubSirenEngine } from './audio/DubSirenEngine';
import { SIREN_MODES } from './audio/modes';
import { DEFAULT_PARAMS, PARAM_RANGES, type SirenParams } from './audio/types';
import { Knob } from './components/Knob';
import { SignalFlow } from './components/SignalFlow';

export const App: React.FC = () => {
  const engineRef = useRef<DubSirenEngine | null>(null);
  if (!engineRef.current) {
    engineRef.current = new DubSirenEngine();
  }
  const engine = engineRef.current;

  const [params, setParams] = useState<SirenParams>(() => ({ ...DEFAULT_PARAMS }));
  const [gated, setGated] = useState(false);
  const [ctxState, setCtxState] = useState<AudioContextState | 'uninitialized'>('uninitialized');
  const [audioErr, setAudioErr] = useState<string | null>(null);
  const [peak, setPeak] = useState(0);
  const [lfoLevel, setLfoLevel] = useState(0.5);
  const [lastTouched, setLastTouched] = useState<string | null>(null);

  useEffect(() => {
    engine.onStateChange((state, err) => {
      setCtxState(state);
      setAudioErr(err);
    });

    const onVisibility = () => {
      setCtxState(engine.getState());
    };
    document.addEventListener('visibilitychange', onVisibility);

    let raf = 0;
    const tick = () => {
      setPeak(engine.getOutputPeak());
      setLfoLevel(engine.getLfoLevel());
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [engine]);

  const updateParam = <K extends keyof SirenParams>(key: K, value: SirenParams[K]) => {
    engine.unlockSync();
    setParams((prev) => {
      const next = { ...prev, [key]: value };
      engine.updateParams({ [key]: value });
      return next;
    });
  };

  const handlePlayBanner = () => {
    engine.unlockSync();
    const next = !gated;
    engine.forceGate(next);
    setGated(next);
    setCtxState(engine.getState());
  };

  const handleTriggerDown = () => {
    engine.unlockSync();
    engine.triggerDown();
    setGated(engine.isGated());
    setCtxState(engine.getState());
  };

  const handleTriggerUp = () => {
    engine.triggerUp();
    setGated(engine.isGated());
  };

  return (
    <div className="dublab-shell">
      <header className="topbar">
        <div className="brand-group">
          <span className="brand-title">DUBLAB</span>
          <span className="brand-sub">NE555×2 + PT2399</span>
        </div>
        <div className="status-row">
          <span className={`ctx-pill ${ctxState}`} data-testid="ctx-state">
            {ctxState}
          </span>
        </div>
      </header>

      <button
        type="button"
        data-testid="play-banner"
        className={`play-banner ${gated ? 'playing' : ''}`}
        onClick={handlePlayBanner}
      >
        {gated ? '■ STOP SIREN' : '▶ ENABLE AUDIO + PLAY'}
      </button>

      {ctxState === 'suspended' && (
        <button
          type="button"
          className="audio-error"
          onClick={() => {
            engine.unlockSync();
            setCtxState(engine.getState());
          }}
        >
          Audio suspended by browser — tap here to resume.
        </button>
      )}

      {audioErr && (
        <div className="audio-error" role="alert" data-testid="audio-error">
          {audioErr}
        </div>
      )}

      <div className="meter-row">
        <span>OUT</span>
        <div className="meter-track">
          <div className="meter-fill" style={{ width: `${Math.min(100, Math.round(peak * 100))}%` }} />
        </div>
        <span>{Math.round(peak * 100)}%</span>
      </div>

      <SignalFlow
        params={params}
        gated={gated}
        lfoLevel={lfoLevel}
        lastTouched={lastTouched}
      />

      <section className="panel-card">
        <div className="panel-head">
          <span className="panel-title">555 Oscillator &amp; LFO</span>
          <span className="panel-chip">PIN 3 → GATE · PIN 5 CV</span>
        </div>
        <div className="knob-grid">
          <Knob
            id="pitch"
            label="Pitch"
            chipRole="Audio R2"
            value={params.pitchHz}
            min={PARAM_RANGES.pitchHz.min}
            max={PARAM_RANGES.pitchHz.max}
            step={1}
            format={(v) => `${Math.round(v)}Hz`}
            onTouchControl={setLastTouched}
            onChange={(v) => updateParam('pitchHz', v)}
          />
          <Knob
            id="rate"
            label="Rate"
            chipRole="LFO 555"
            value={params.lfoRateHz}
            min={PARAM_RANGES.lfoRateHz.min}
            max={PARAM_RANGES.lfoRateHz.max}
            step={0.1}
            unit="Hz"
            accent="var(--amber)"
            onTouchControl={setLastTouched}
            onChange={(v) => updateParam('lfoRateHz', v)}
          />
          <Knob
            id="depth"
            label="Depth"
            chipRole="→ Pin 5"
            value={params.lfoDepth}
            min={0}
            max={1}
            step={0.01}
            format={(v) => `${Math.round(v * 100)}%`}
            accent="var(--amber)"
            onTouchControl={setLastTouched}
            onChange={(v) => updateParam('lfoDepth', v)}
          />
          <Knob
            id="volume"
            label="Volume"
            chipRole="Out Pot"
            value={params.volume}
            min={0}
            max={1}
            step={0.01}
            format={(v) => `${Math.round(v * 100)}%`}
            onTouchControl={setLastTouched}
            onChange={(v) => updateParam('volume', v)}
          />
        </div>

        <div className="mode-row">
          {SIREN_MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              className={`chip-btn ${params.mode === m.id ? 'active' : ''}`}
              onClick={() => {
                setLastTouched('mode');
                updateParam('mode', m.id);
              }}
            >
              <span>{m.label}</span>
              <small>{m.chipHint}</small>
            </button>
          ))}
        </div>

        <div className="trigger-row">
          <button
            type="button"
            className={`trigger-btn ${gated ? 'gated' : ''}`}
            data-testid="trigger-btn"
            onPointerDown={() => {
              setLastTouched('trigger');
              handleTriggerDown();
            }}
            onPointerUp={handleTriggerUp}
            onPointerCancel={handleTriggerUp}
          >
            {gated ? 'TRIGGER ACTIVE' : 'TRIGGER'}
          </button>
          <button
            type="button"
            className={`chip-btn ${params.triggerMode === 'latch' ? 'active' : ''}`}
            onClick={() =>
              updateParam('triggerMode', params.triggerMode === 'latch' ? 'momentary' : 'latch')
            }
          >
            <span>{params.triggerMode === 'latch' ? 'LATCH' : 'MOMENT'}</span>
            <small>Gate Mode</small>
          </button>
          <button
            type="button"
            className={`chip-btn ${params.lfoHold ? 'active' : ''}`}
            onClick={() => updateParam('lfoHold', !params.lfoHold)}
          >
            <span>HOLD</span>
            <small>LFO Pause</small>
          </button>
        </div>
      </section>

      <section className="panel-card">
        <div className="panel-head">
          <span className="panel-title">PT2399 Echo Delay</span>
          <span className="panel-chip">50ms–1s · WET PATH</span>
        </div>
        <div className="knob-grid">
          <Knob
            id="echoTime"
            label="Time"
            chipRole="Delay R"
            value={params.echoTimeMs}
            min={PARAM_RANGES.echoTimeMs.min}
            max={PARAM_RANGES.echoTimeMs.max}
            step={5}
            format={(v) => `${Math.round(v)}ms`}
            accent="var(--blue)"
            onTouchControl={setLastTouched}
            onChange={(v) => updateParam('echoTimeMs', v)}
          />
          <Knob
            id="echoFeedback"
            label="Feedback"
            chipRole="Repeats"
            value={params.echoFeedback}
            min={0}
            max={PARAM_RANGES.echoFeedback.max}
            step={0.01}
            format={(v) => `${Math.round(v * 100)}%`}
            accent="var(--blue)"
            onTouchControl={setLastTouched}
            onChange={(v) => updateParam('echoFeedback', v)}
          />
          <Knob
            id="echoWet"
            label="Echo Vol"
            chipRole="Wet Mix"
            value={params.echoWet}
            min={0}
            max={1}
            step={0.01}
            format={(v) => `${Math.round(v * 100)}%`}
            accent="var(--blue)"
            onTouchControl={setLastTouched}
            onChange={(v) => updateParam('echoWet', v)}
          />
          <Knob
            id="echoTone"
            label="Tone"
            chipRole="Wet LP"
            value={params.echoToneHz}
            min={PARAM_RANGES.echoToneHz.min}
            max={PARAM_RANGES.echoToneHz.max}
            step={10}
            format={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${Math.round(v)}`)}
            accent="var(--blue)"
            onTouchControl={setLastTouched}
            onChange={(v) => updateParam('echoToneHz', v)}
          />
        </div>
        <button
          type="button"
          className={`chip-btn warn ${params.echoCut ? 'active' : ''}`}
          onClick={() => {
            setLastTouched('echoCut');
            updateParam('echoCut', !params.echoCut);
          }}
        >
          <span>{params.echoCut ? 'ECHO CUT: MUTED' : 'ECHO CUT'}</span>
          <small>Mute Wet Feedback Only</small>
        </button>
      </section>
    </div>
  );
};
