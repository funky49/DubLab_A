import { getModePreset } from './modes';
import {
  DEFAULT_PARAMS,
  type EngineCapabilities,
  type EngineDiagnostics,
  type SirenParams,
} from './types';

function makeSoftClipCurve(): Float32Array<ArrayBuffer> {
  const n = 512;
  const curve = new Float32Array(new ArrayBuffer(n * 4));
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = Math.tanh(x * 1.8);
  }
  return curve;
}

export class DubSirenEngine {
  private ctx: AudioContext | null = null;
  private vco: OscillatorNode | null = null;
  private lfo: OscillatorNode | null = null;
  private lfoDepthGain: GainNode | null = null;
  private shaper: WaveShaperNode | null = null;
  private gateGain: GainNode | null = null;
  private dryGain: GainNode | null = null;
  private echoSendGain: GainNode | null = null;
  private delayNode: DelayNode | null = null;
  private echoToneFilter: BiquadFilterNode | null = null;
  private echoFeedbackGain: GainNode | null = null;
  private echoCutGain: GainNode | null = null;
  private hpfNode: BiquadFilterNode | null = null;
  private lpfNode: BiquadFilterNode | null = null;
  private volumeGain: GainNode | null = null;
  private limiter: DynamicsCompressorNode | null = null;
  private masterOut: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private timeBuf: Uint8Array<ArrayBuffer> | null = null;
  private lfoAnalyser: AnalyserNode | null = null;
  private lfoBuf: Uint8Array<ArrayBuffer> | null = null;

  private params: SirenParams = { ...DEFAULT_PARAMS };
  private caps: EngineCapabilities = {
    lfo: true,
    opamp: true,
    lpf: true,
    hpf: true,
    echo: true,
  };
  private gated = false;
  private lastError: string | null = null;
  private onStateChangeCb: ((state: AudioContextState | 'uninitialized', err: string | null) => void) | null = null;

  public onStateChange(
    cb: (state: AudioContextState | 'uninitialized', err: string | null) => void,
  ): void {
    this.onStateChangeCb = cb;
  }

  public getState(): AudioContextState | 'uninitialized' {
    return this.ctx ? this.ctx.state : 'uninitialized';
  }

  public getLastError(): string | null {
    return this.lastError;
  }

  public isGated(): boolean {
    return this.gated;
  }

  public getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  public getContext(): AudioContext | null {
    return this.ctx;
  }

  public getParams(): SirenParams {
    return { ...this.params };
  }

  public setCapabilities(caps: Partial<EngineCapabilities>): void {
    this.caps = { ...this.caps, ...caps };
    this.applyAllParams();
  }

  /**
   * Synchronously creates/resumes the AudioContext inside a user gesture handler.
   * Never awaits before setting up nodes or gating so mobile Chrome keeps the gesture token.
   */
  public unlockSync(): void {
    try {
      this.lastError = null;
      if (!this.ctx) {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) {
          throw new Error('Web Audio API is not supported in this browser.');
        }
        this.ctx = new AudioCtx();
        this.ctx.onstatechange = () => {
          this.onStateChangeCb?.(this.getState(), this.lastError);
        };
        this.buildGraph(this.ctx);
      }

      if (this.ctx.state === 'suspended') {
        const resumePromise = this.ctx.resume();
        if (resumePromise && typeof resumePromise.then === 'function') {
          resumePromise
            .then(() => {
              this.onStateChangeCb?.(this.getState(), this.lastError);
            })
            .catch((err: unknown) => {
              this.lastError = err instanceof Error ? err.message : 'Failed to resume audio context';
              this.onStateChangeCb?.(this.getState(), this.lastError);
            });
        }
      }
      this.onStateChangeCb?.(this.getState(), this.lastError);
    } catch (err: unknown) {
      this.lastError = err instanceof Error ? err.message : 'Audio initialization failed';
      this.onStateChangeCb?.(this.getState(), this.lastError);
    }
  }

  private buildGraph(ctx: AudioContext): void {
    this.vco = ctx.createOscillator();
    this.vco.type = this.params.wave;

    this.lfo = ctx.createOscillator();
    this.lfoDepthGain = ctx.createGain();

    this.shaper = ctx.createWaveShaper();
    this.shaper.curve = makeSoftClipCurve();

    this.gateGain = ctx.createGain();
    this.gateGain.gain.setValueAtTime(this.gated ? 1 : 0, ctx.currentTime);

    this.dryGain = ctx.createGain();
    this.echoSendGain = ctx.createGain();
    this.delayNode = ctx.createDelay(1.2);
    this.echoToneFilter = ctx.createBiquadFilter();
    this.echoToneFilter.type = 'lowpass';
    this.echoFeedbackGain = ctx.createGain();
    this.echoCutGain = ctx.createGain();

    this.hpfNode = ctx.createBiquadFilter();
    this.hpfNode.type = 'highpass';
    this.lpfNode = ctx.createBiquadFilter();
    this.lpfNode.type = 'lowpass';

    this.volumeGain = ctx.createGain();
    this.limiter = ctx.createDynamicsCompressor();
    this.limiter.threshold.setValueAtTime(-3, ctx.currentTime);
    this.limiter.knee.setValueAtTime(6, ctx.currentTime);
    this.limiter.ratio.setValueAtTime(12, ctx.currentTime);
    this.limiter.attack.setValueAtTime(0.002, ctx.currentTime);
    this.limiter.release.setValueAtTime(0.05, ctx.currentTime);

    this.masterOut = ctx.createGain();
    this.masterOut.gain.setValueAtTime(1, ctx.currentTime);

    // Dead-end parallel AnalyserNode tap (SoundSeer pattern)
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.75;
    this.analyser.minDecibels = -90;
    this.analyser.maxDecibels = -10;
    this.timeBuf = new Uint8Array(new ArrayBuffer(this.analyser.fftSize));

    // LFO tap for LED & circuit telemetry
    this.lfoAnalyser = ctx.createAnalyser();
    this.lfoAnalyser.fftSize = 256;
    this.lfoBuf = new Uint8Array(new ArrayBuffer(this.lfoAnalyser.fftSize));

    // LFO -> pin 5 depth -> VCO frequency
    this.lfo.connect(this.lfoDepthGain);
    this.lfoDepthGain.connect(this.vco.frequency);
    this.lfo.connect(this.lfoAnalyser);

    // VCO -> Soft shaper -> Gate
    this.vco.connect(this.shaper);
    this.shaper.connect(this.gateGain);

    // Dry path -> HPF -> LPF
    this.gateGain.connect(this.dryGain);
    this.dryGain.connect(this.hpfNode);

    // Wet PT2399 echo path -> HPF -> LPF
    this.gateGain.connect(this.echoSendGain);
    this.echoSendGain.connect(this.delayNode);
    this.delayNode.connect(this.echoToneFilter);
    this.echoToneFilter.connect(this.echoFeedbackGain);
    this.echoFeedbackGain.connect(this.delayNode);
    this.echoToneFilter.connect(this.echoCutGain);
    this.echoCutGain.connect(this.hpfNode);

    // Filters -> Volume -> Limiter -> Master -> Destination & parallel Analyser tap
    this.hpfNode.connect(this.lpfNode);
    this.lpfNode.connect(this.volumeGain);
    this.volumeGain.connect(this.limiter);
    this.limiter.connect(this.masterOut);
    this.masterOut.connect(ctx.destination);
    this.masterOut.connect(this.analyser);

    this.applyAllParams();

    this.vco.start();
    this.lfo.start();
  }

  public updateParams(next: Partial<SirenParams>): void {
    this.params = { ...this.params, ...next };
    this.applyAllParams();
  }

  private applyAllParams(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const p = this.params;
    const c = this.caps;

    if (this.vco) {
      this.vco.frequency.setTargetAtTime(p.pitchHz, t, 0.008);
      const wave = c.opamp ? p.wave : 'square';
      if (this.vco.type !== wave) {
        this.vco.type = wave;
      }
    }

    if (this.lfo && this.lfoDepthGain) {
      const preset = getModePreset(p.mode);
      if (this.lfo.type !== preset.oscType) {
        this.lfo.type = preset.oscType;
      }
      this.lfo.frequency.setTargetAtTime(p.lfoRateHz, t, 0.01);

      const activeDepth = c.lfo && !p.lfoHold ? p.lfoDepth : 0;
      const sweepHz = p.pitchHz * 0.72 * activeDepth * (preset.invertPolarity ? -1 : 1);
      this.lfoDepthGain.gain.setTargetAtTime(sweepHz, t, 0.012);
    }

    if (this.dryGain) {
      // Keep dry floor even when wet increases so signal never drops out
      const wet = c.echo ? p.echoWet : 0;
      const dry = Math.max(0.68, 1 - wet * 0.32);
      this.dryGain.gain.setTargetAtTime(dry, t, 0.01);
    }

    if (this.echoSendGain && this.delayNode && this.echoFeedbackGain && this.echoToneFilter && this.echoCutGain) {
      const echoEnabled = c.echo;
      this.echoSendGain.gain.setTargetAtTime(echoEnabled ? 1 : 0, t, 0.01);
      this.delayNode.delayTime.setTargetAtTime(p.echoTimeMs / 1000, t, 0.02);
      this.echoFeedbackGain.gain.setTargetAtTime(
        echoEnabled && !p.echoCut ? p.echoFeedback : 0,
        t,
        0.015,
      );
      this.echoToneFilter.frequency.setTargetAtTime(p.echoToneHz, t, 0.02);
      this.echoCutGain.gain.setTargetAtTime(
        echoEnabled && !p.echoCut ? p.echoWet : 0,
        t,
        0.01,
      );
    }

    if (this.hpfNode) {
      this.hpfNode.frequency.setTargetAtTime(c.hpf ? p.hpfHz : 20, t, 0.015);
    }
    if (this.lpfNode) {
      this.lpfNode.frequency.setTargetAtTime(c.lpf ? p.lpfHz : 18000, t, 0.015);
    }

    if (this.volumeGain) {
      this.volumeGain.gain.setTargetAtTime(p.volume, t, 0.01);
    }
  }

  public forceGate(open: boolean): void {
    this.gated = open;
    if (this.ctx && this.gateGain) {
      const t = this.ctx.currentTime;
      this.gateGain.gain.cancelScheduledValues(t);
      this.gateGain.gain.setValueAtTime(open ? 1 : 0, t);
    }
  }

  public triggerDown(): void {
    this.unlockSync();
    if (this.params.triggerMode === 'latch') {
      this.forceGate(!this.gated);
    } else {
      this.forceGate(true);
    }
  }

  public triggerUp(): void {
    if (this.params.triggerMode === 'momentary') {
      this.forceGate(false);
    }
  }

  public getOutputPeak(): number {
    if (!this.analyser || !this.timeBuf) return 0;
    this.analyser.getByteTimeDomainData(this.timeBuf);
    let max = 0;
    for (let i = 0; i < this.timeBuf.length; i++) {
      const v = Math.abs((this.timeBuf[i] - 128) / 128);
      if (v > max) max = v;
    }
    return max;
  }

  public getLfoLevel(): number {
    if (!this.lfoAnalyser || !this.lfoBuf) return 0;
    this.lfoAnalyser.getByteTimeDomainData(this.lfoBuf);
    const sample = (this.lfoBuf[0] - 128) / 128;
    return Math.max(0, Math.min(1, (sample + 1) * 0.5));
  }

  public getDiagnostics(): EngineDiagnostics {
    return {
      state: this.getState(),
      gated: this.gated,
      gateGain: this.gateGain ? this.gateGain.gain.value : 0,
      dryGain: this.dryGain ? this.dryGain.gain.value : 0,
      volume: this.params.volume,
      echoCut: this.params.echoCut,
      peak: this.getOutputPeak(),
    };
  }

  public dispose(): void {
    try {
      this.vco?.stop();
      this.lfo?.stop();
      this.ctx?.close();
    } catch {
      // ignore cleanup errors
    }
    this.ctx = null;
  }
}
