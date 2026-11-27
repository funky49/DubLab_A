import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DubSirenEngine } from './audio/DubSirenEngine';
import { SIREN_MODES } from './audio/modes';
import { DEFAULT_PARAMS, PARAM_RANGES, type SirenParams, type WaveShape } from './audio/types';
import { BuildMode } from './components/BuildMode';
import { Knob } from './components/Knob';
import { SignalFlow } from './components/SignalFlow';
import { TopVisualizer } from './components/TopVisualizer';
import { computeLedBrightness } from './led';
import { deriveCapabilities, type PartId } from './progress/parts';
import {
  checkBuildUnlock,
  clearBoardParts,
  loadProgress,
  loadViewMode,
  resetAllProgress,
  saveViewMode,
  togglePlacedPart,
  unlockTierViaQuiz,
  updateLedConfig,
  type ProgressState,
  type ViewMode,
} from './progress/store';

const VOUT_RAIL = 9;

export const App: React.FC = () => {
  const engineRef = useRef<DubSirenEngine | null>(null);
  if (!engineRef.current) {
    engineRef.current = new DubSirenEngine();
  }
  const engine = engineRef.current;

  const [progress, setProgress] = useState<ProgressState>(() => loadProgress());
  const caps = useMemo(() => deriveCapabilities(progress.placedParts), [progress.placedParts]);

  const [params, setParams] = useState<SirenParams>(() => ({ ...DEFAULT_PARAMS }));
  const [gated, setGated] = useState(false);
  const [ctxState, setCtxState] = useState<AudioContextState | 'uninitialized'>('uninitialized');
  const [audioErr, setAudioErr] = useState<string | null>(null);
  const [peak, setPeak] = useState(0);
  const [lfoLevel, setLfoLevel] = useState(0.5);
  const [lastTouched, setLastTouched] = useState<string | null>(null);
  const [tab, setTab] = useState<'play' | 'build'>('play');
  const [viewMode, setViewMode] = useState<ViewMode>(() => loadViewMode());
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  const has = (id: PartId) => progress.placedParts.includes(id);
  const hasLed = has('led');
  const hasLedR = has('led-resistor');

  useEffect(() => {
    engine.setCapabilities(caps);
  }, [engine, caps]);

  useEffect(() => {
    engine.onStateChange((state, err) => {
      setCtxState(state);
      setAudioErr(err);
    });
    const onVisibility = () => {
      setCtxState(engine.getState());
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [engine]);

  const handleFrameSample = useCallback(
    (nextPeak: number, nextLfo: number) => {
      setPeak(nextPeak);
      setLfoLevel(nextLfo);

      const useLfo =
        progress.ledSource === 'lfo' ||
        (progress.ledSource === 'auto' && caps.lfo && !params.lfoHold);
      const signal = useLfo ? nextLfo : gated ? Math.max(0.25, nextPeak) : 0.05;
      const led = computeLedBrightness(VOUT_RAIL, hasLed, hasLedR, progress.ledOhms, signal);
      document.documentElement.style.setProperty('--led-b', led.brightness.toFixed(3));
    },
    [progress.ledSource, progress.ledOhms, caps.lfo, params.lfoHold, gated, hasLed, hasLedR],
  );

  const ledInfo = computeLedBrightness(
    VOUT_RAIL,
    hasLed,
    hasLedR,
    progress.ledOhms,
    gated ? Math.max(0.25, peak) : lfoLevel,
  );

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

  const cycleView = () => {
    const order: ViewMode[] = ['circuit', 'knobs', 'both'];
    const next = order[(order.indexOf(viewMode) + 1) % order.length];
    setViewMode(next);
    saveViewMode(next);
  };

  const handleTogglePart = (id: PartId) => {
    setProgress((prev) => togglePlacedPart(prev, id));
    setStatusBanner(null);
  };

  const handleCheckBuild = () => {
    const res = checkBuildUnlock(progress);
    setProgress(res.next);
    if (res.unlockedTier !== null) {
      setStatusBanner(`Unlocked Level ${res.unlockedTier}! Add the new parts to your board.`);
    } else {
      setStatusBanner('Place all parts in your highest unlocked level to earn the next tier.');
    }
  };

  const handleUnlockQuiz = (quizId: string, tier: number) => {
    setProgress((prev) => unlockTierViaQuiz(prev, quizId, tier));
    setStatusBanner(`Quiz passed — Level ${tier} unlocked!`);
  };

  return (
    <div className="dublab-shell">
      <TopVisualizer
        engine={engine}
        ctxState={ctxState}
        gated={gated}
        onFrameSample={handleFrameSample}
      />

      <header className="topbar">
        <div className="brand-group">
          <span className="brand-title">DUBLAB</span>
          <span className="brand-sub">NE555 + PT2399</span>
        </div>
        <div className="status-row">
          <div className="seg-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'play'}
              className={`seg-tab ${tab === 'play' ? 'active' : ''}`}
              data-testid="tab-play"
              onClick={() => setTab('play')}
            >
              Play
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'build'}
              className={`seg-tab ${tab === 'build' ? 'active' : ''}`}
              data-testid="tab-build"
              onClick={() => setTab('build')}
            >
              Build
            </button>
          </div>
          {tab === 'play' && (
            <button
              type="button"
              className="mini-btn"
              data-testid="view-toggle"
              onClick={cycleView}
            >
              View: {viewMode.charAt(0).toUpperCase() + viewMode.slice(1)}
            </button>
          )}
          <span className={`ctx-pill ${ctxState}`} data-testid="ctx-state">
            {ctxState}
          </span>
        </div>
      </header>

      {tab === 'build' ? (
        <BuildMode
          progress={progress}
          vout={VOUT_RAIL}
          onTogglePart={handleTogglePart}
          onLedConfig={(patch) => setProgress((prev) => updateLedConfig(prev, patch))}
          onCheckBuild={handleCheckBuild}
          onUnlockQuiz={handleUnlockQuiz}
          onClearBoard={() => {
            setProgress((prev) => clearBoardParts(prev));
            setStatusBanner('Board cleared. Tap parts below to wire your circuit.');
          }}
          onResetAll={() => {
            setProgress(resetAllProgress());
            setStatusBanner('Reset to Level 0.');
          }}
          onGoPlay={() => setTab('play')}
          statusBanner={statusBanner}
        />
      ) : (
        <>
          <button
            type="button"
            data-testid="play-banner"
            className={`play-banner ${gated ? 'playing' : ''}`}
            disabled={!has('audio-555')}
            onClick={handlePlayBanner}
          >
            {!has('audio-555')
              ? 'PLACE AUDIO NE555 IN BUILD TAB'
              : gated
                ? '■ STOP SIREN'
                : '▶ ENABLE AUDIO + PLAY'}
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

          {(viewMode === 'circuit' || viewMode === 'both') && (
            <SignalFlow
              params={params}
              gated={gated}
              lfoLevel={lfoLevel}
              lastTouched={lastTouched}
              caps={caps}
              hasLed={hasLed}
              ledBurnt={ledInfo.burnt}
              ledStatusText={ledInfo.label}
            />
          )}

          {(viewMode === 'knobs' || viewMode === 'both') && (
            <section className="panel-card" data-testid="knobs-panel">
              <div className="panel-head">
                <span className="panel-title">Built Circuit Controls</span>
                <span className="panel-chip">
                  {caps.lfo ? '555 + LFO PIN 5' : 'L0 BARE 555 SQUARE'}
                </span>
              </div>

              <div className="knob-grid">
                {has('pitch-pot') && (
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
                )}
                {caps.lfo && has('rate-pot') && (
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
                )}
                {caps.lfo && has('depth-pot') && (
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
                )}
                {has('volume-pot') && (
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
                )}
                {caps.hpf && (
                  <Knob
                    id="hpf"
                    label="HPF"
                    chipRole="RC High-Pass"
                    value={params.hpfHz}
                    min={PARAM_RANGES.hpfHz.min}
                    max={PARAM_RANGES.hpfHz.max}
                    step={5}
                    format={(v) => `${Math.round(v)}Hz`}
                    accent="var(--blue)"
                    onTouchControl={setLastTouched}
                    onChange={(v) => updateParam('hpfHz', v)}
                  />
                )}
                {caps.lpf && (
                  <Knob
                    id="lpf"
                    label="LPF"
                    chipRole="RC Low-Pass"
                    value={params.lpfHz}
                    min={PARAM_RANGES.lpfHz.min}
                    max={PARAM_RANGES.lpfHz.max}
                    step={10}
                    format={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${Math.round(v)}`)}
                    accent="var(--blue)"
                    onTouchControl={setLastTouched}
                    onChange={(v) => updateParam('lpfHz', v)}
                  />
                )}
              </div>

              {caps.opamp && (
                <div className="mode-row cols-3" data-testid="wave-row">
                  {(['square', 'triangle', 'sawtooth'] as WaveShape[]).map((w) => (
                    <button
                      key={w}
                      type="button"
                      data-testid={`wave-${w}`}
                      className={`chip-btn ${params.wave === w ? 'active' : ''}`}
                      onClick={() => {
                        setLastTouched('wave');
                        updateParam('wave', w);
                      }}
                    >
                      <span>{w === 'square' ? 'SQR' : w === 'triangle' ? 'TRI' : 'SAW'}</span>
                      <small>Op-Amp Shape</small>
                    </button>
                  ))}
                </div>
              )}

              {caps.lfo && (
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
              )}

              {has('trigger-btn') && (
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
                  {caps.lfo && (
                    <button
                      type="button"
                      className={`chip-btn ${params.lfoHold ? 'active' : ''}`}
                      onClick={() => updateParam('lfoHold', !params.lfoHold)}
                    >
                      <span>HOLD</span>
                      <small>LFO Pause</small>
                    </button>
                  )}
                </div>
              )}

              {!caps.lfo && (
                <button
                  type="button"
                  className="chip-btn"
                  data-testid="unlock-lfo-cta"
                  onClick={() => setTab('build')}
                >
                  <span>🔒 LFO Sweep Locked — Open Build Tab</span>
                  <small>Pass L1 quiz or check L0 build to earn LFO</small>
                </button>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
};
