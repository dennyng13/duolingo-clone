// Web Audio music engine: synthesises the original backing tracks in
// lib/dance/songs.ts live, plus judgement sound effects.
//
// Game logic runs on a performance.now() clock (robust even if audio is
// blocked); notes are scheduled on the AudioContext clock by mapping between
// the two with a smoothed offset.

import { hashString, mulberry32 } from "./random";
import { isTargetBeat, type Timing } from "./rules";
import { CHORD_INTERVALS, type Chord, type Song } from "./songs";
import type { Rating } from "./types";

export type SongClock = {
  /** Seconds since beat 0 as heard by the player (negative during the wait). */
  now(): number;
};

const midiToFreq = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

/** Chord tones folded into [low, high). */
function voicing([root, quality]: Chord, low: number, high: number) {
  const notes: number[] = [];
  for (const interval of CHORD_INTERVALS[quality]) {
    let n = root + interval;
    while (n < low) n += 12;
    while (n >= high) n -= 12;
    notes.push(n);
  }
  return notes.sort((a, b) => a - b);
}

type Playing = {
  song: Song;
  timing: Timing;
  perfStart: number;
  stepDur: number;
  totalSteps: number;
  nextStep: number;
  offset: number | null;
  bus: GainNode;
  swing: number;
};

class MusicEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private playing: Playing | null = null;
  private muted = false;

  /** Must be called from a user gesture (click / key press) at least once. */
  unlock() {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctor) return null;
      const ctx = new Ctor({ latencyHint: "interactive" });
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -16;
      compressor.knee.value = 12;
      compressor.ratio.value = 4;
      compressor.attack.value = 0.004;
      compressor.release.value = 0.2;
      const master = ctx.createGain();
      master.gain.value = this.muted ? 0 : 0.85;
      master.connect(compressor);
      compressor.connect(ctx.destination);
      const musicGain = ctx.createGain();
      musicGain.gain.value = 0.8;
      musicGain.connect(master);
      const sfxGain = ctx.createGain();
      sfxGain.gain.value = 0.9;
      sfxGain.connect(master);

      const noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const data = noise.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

      Object.assign(this, { ctx, master, musicGain, sfxGain, noise });
    }
    if (this.ctx && this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (this.ctx && this.master) {
      this.master.gain.setTargetAtTime(
        muted ? 0 : 0.85,
        this.ctx.currentTime,
        0.02
      );
    }
  }

  /** Output latency, so visuals and judging line up with what is heard. */
  private latency() {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== "running") return 0;
    const lat = (ctx.outputLatency || 0) + (ctx.baseLatency || 0);
    return Math.min(Math.max(lat, 0), 0.25);
  }

  start(song: Song, timing: Timing, delaySec: number): SongClock {
    this.stop();
    const perfStart = performance.now() / 1000 + delaySec;
    const ctx = this.unlock();
    const clock: SongClock = {
      now: () => performance.now() / 1000 - perfStart - this.latency(),
    };
    if (!ctx || !this.musicGain) return clock;

    const bus = ctx.createGain();
    bus.gain.value = 1;
    bus.connect(this.musicGain);
    this.playing = {
      song,
      timing,
      perfStart,
      stepDur: timing.beatSec / 4,
      totalSteps: timing.totalBeats * 4,
      nextStep: 0,
      offset: null,
      bus,
      swing: song.style === "chill" ? 0.16 : 0,
    };
    this.timer = setInterval(() => this.pump(), 25);
    this.pump();
    return clock;
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    const playing = this.playing;
    this.playing = null;
    if (playing && this.ctx) {
      const t = this.ctx.currentTime;
      playing.bus.gain.setTargetAtTime(0, t, 0.05);
      setTimeout(() => playing.bus.disconnect(), 400);
    }
  }

  private pump() {
    const p = this.playing;
    const ctx = this.ctx;
    if (!p || !ctx) return;
    const perfNow = performance.now() / 1000;
    const offset = ctx.currentTime - perfNow;
    if (p.offset === null || Math.abs(offset - p.offset) > 0.05)
      p.offset = offset;
    else p.offset += (offset - p.offset) * 0.05;
    if (ctx.state !== "running") return;

    const songNow = perfNow - p.perfStart;
    // Skip notes that are already in the past (late join / throttled tab).
    const firstPlayable = Math.ceil((songNow - 0.01) / p.stepDur);
    if (p.nextStep < firstPlayable) p.nextStep = firstPlayable;

    while (
      p.nextStep < p.totalSteps &&
      p.nextStep * p.stepDur < songNow + 0.15
    ) {
      const step = p.nextStep;
      const swing = step % 2 === 1 ? p.swing * p.stepDur : 0;
      const when = step * p.stepDur + swing + p.perfStart + p.offset;
      if (when >= ctx.currentTime - 0.005) this.scheduleStep(p, step, when);
      p.nextStep++;
    }
    if (p.nextStep >= p.totalSteps && songNow > p.totalSteps * p.stepDur + 4) {
      this.stop();
    }
  }

  // ---------------------------------------------------------------------
  // Arrangement

  private scheduleStep(p: Playing, step: number, t: number) {
    const { song, timing } = p;
    const s = step % 16;
    // Bars counted from the first word, so the progression starts on chord 0.
    const bar = Math.floor(step / 16) - Math.floor(timing.leadInBeats / 4);
    const beat = step / 4;
    const intro = beat < timing.leadInBeats;
    const outroStart = timing.totalBeats - timing.outroBeats;
    const outroBeat = beat - outroStart;
    const n = song.chords.length;
    const chord = song.chords[((bar % n) + n) % n];
    const out = p.bus;

    // Count-in beeps on the last 4 beats of the intro.
    if (intro && s % 4 === 0 && beat >= timing.leadInBeats - 4) {
      const last = beat === timing.leadInBeats - 1;
      this.beep(t, last ? 1568 : 1046, 0.12, 0.22, out);
    }

    if (outroBeat >= 4) {
      if (outroBeat === 4) {
        this.crash(t, out);
        this.kick(t, 1, out);
        this.pad(t, voicing(chord, 55, 76), p.timing.beatSec * 3.5, out, 0.07);
        this.bass(t, chord[0] - 24, p.timing.beatSec * 3, out, "sawtooth");
      }
      return;
    }

    // Accent on every "press Enter now" beat so the target is audible.
    if (s % 4 === 0 && Number.isInteger(beat) && isTargetBeat(timing, beat)) {
      this.beep(t, 2093, 0.05, 0.05, out, "triangle");
    }

    if (bar > 0 && bar % 8 === 0 && s === 0 && !intro) this.crash(t, out, 0.5);

    switch (song.style) {
      case "pop":
        return this.popStep(p, s, bar, t, chord, intro);
      case "disco":
        return this.discoStep(p, s, bar, t, chord, intro);
      case "chill":
        return this.chillStep(p, s, bar, t, chord, intro);
      case "edm":
        return this.edmStep(p, s, bar, t, chord, intro);
    }
  }

  private popStep(
    p: Playing,
    s: number,
    bar: number,
    t: number,
    chord: Chord,
    intro: boolean
  ) {
    const out = p.bus;
    const beatSec = p.timing.beatSec;
    if (s === 0 || s === 8 || s === 10) this.kick(t, s === 10 ? 0.7 : 1, out);
    if (s % 2 === 0) this.hat(t, false, s % 4 === 2 ? 0.5 : 0.3, out);
    if (intro) {
      if (s === 0) this.pad(t, voicing(chord, 55, 76), beatSec * 4, out, 0.035);
      return;
    }
    if (s === 4 || s === 12) {
      this.snare(t, 0.8, out);
      this.clap(t, 0.5, out);
    }
    if (s === 0) this.pad(t, voicing(chord, 55, 76), beatSec * 4, out, 0.05);
    if (s % 2 === 0)
      this.bass(
        t,
        chord[0] - 24 + (s === 6 || s === 14 ? 12 : 0),
        beatSec * 0.45,
        out,
        "square"
      );
    this.melody(p, s, bar, t, chord, "pop");
  }

  private discoStep(
    p: Playing,
    s: number,
    bar: number,
    t: number,
    chord: Chord,
    intro: boolean
  ) {
    const out = p.bus;
    const beatSec = p.timing.beatSec;
    if (s % 4 === 0) this.kick(t, 1, out);
    if (s % 4 === 2) this.hat(t, true, 0.45, out);
    else this.hat(t, false, 0.18, out);
    if (intro) return;
    if (s === 4 || s === 12) {
      this.snare(t, 0.7, out);
      this.clap(t, 0.6, out);
    }
    if (s % 2 === 0) {
      const octave = s % 4 === 2 ? 12 : 0;
      this.bass(t, chord[0] - 24 + octave, beatSec * 0.4, out, "sawtooth");
    }
    if (s === 3 || s === 6 || s === 11 || s === 14) {
      this.pad(
        t,
        voicing(chord, 60, 79),
        beatSec * 0.35,
        out,
        0.05,
        "sawtooth"
      );
    }
    this.melody(p, s, bar, t, chord, "disco");
  }

  private chillStep(
    p: Playing,
    s: number,
    bar: number,
    t: number,
    chord: Chord,
    intro: boolean
  ) {
    const out = p.bus;
    const beatSec = p.timing.beatSec;
    if (s === 0 || s === 10 || (s === 7 && bar % 2 === 1))
      this.kick(t, 0.8, out);
    if (s % 2 === 0) this.hat(t, false, s % 4 === 0 ? 0.22 : 0.14, out);
    if (s === 0) this.keys(t, voicing(chord, 57, 77), beatSec * 3.8, out);
    if (intro) return;
    if (s === 4 || s === 12) this.snare(t, 0.4, out);
    if (s === 0) this.bass(t, chord[0] - 24, beatSec * 1.8, out, "triangle");
    if (s === 10)
      this.bass(t, chord[0] - 24 + 7, beatSec * 1.2, out, "triangle");
    this.melody(p, s, bar, t, chord, "chill");
  }

  private edmStep(
    p: Playing,
    s: number,
    bar: number,
    t: number,
    chord: Chord,
    intro: boolean
  ) {
    const out = p.bus;
    const beatSec = p.timing.beatSec;
    if (s % 4 === 0) this.kick(t, 1, out);
    this.hat(t, s % 4 === 2, s % 4 === 2 ? 0.4 : 0.12, out);
    if (intro) {
      if (s === 0)
        this.pad(t, voicing(chord, 57, 78), beatSec * 4, out, 0.03, "sawtooth");
      return;
    }
    if (s === 4 || s === 12) this.clap(t, 0.8, out);
    if (s % 4 === 2)
      this.bass(t, chord[0] - 24, beatSec * 0.45, out, "sawtooth");
    // Side-chained pad: a short chord after every kick.
    if (s % 4 === 1)
      this.pad(
        t,
        voicing(chord, 57, 78),
        beatSec * 0.6,
        out,
        0.045,
        "sawtooth"
      );
    this.melody(p, s, bar, t, chord, "edm");
  }

  /** Deterministic lead line: repeats every 8 bars so it is catchy. */
  private melody(
    p: Playing,
    s: number,
    bar: number,
    t: number,
    chord: Chord,
    style: Song["style"]
  ) {
    const out = p.bus;
    const phrase = ((bar % 8) + 8) % 8;
    const rng = mulberry32(hashString(p.song.id) + phrase * 7919 + s * 31);
    const tones = voicing(chord, 67, 86);
    const beatSec = p.timing.beatSec;

    if (style === "edm") {
      // 16th-note arpeggio in the second half of each 8-bar phrase.
      if (phrase < 4) return;
      const pattern = [0, 1, 2, 1, 2, 3, 2, 1];
      const note = tones[pattern[s % 8] % tones.length] + (s >= 8 ? 12 : 0);
      this.pluck(t, note, beatSec * 0.22, out, 0.045, "sawtooth");
      return;
    }
    if (style === "disco") {
      if (phrase % 4 !== 2 && phrase % 4 !== 3) return;
      if (s % 2 !== 0) return;
      const pattern = [0, 2, 1, 2, 3, 2, 1, 0];
      this.pluck(
        t,
        tones[pattern[s / 2] % tones.length] + 12,
        beatSec * 0.3,
        out,
        0.04,
        "square"
      );
      return;
    }
    // pop + chill: sparse sung-like melody
    const rhythm = style === "chill" ? [0, 6, 10] : [0, 3, 6, 8, 10, 12, 14];
    if (!rhythm.includes(s)) return;
    if (rng() < (style === "chill" ? 0.35 : 0.25)) return;
    const scale = [0, 2, 4, 7, 9];
    const root = chord[0] + 12;
    const note =
      rng() < 0.6
        ? tones[Math.floor(rng() * tones.length)]
        : root + scale[Math.floor(rng() * scale.length)];
    const len = beatSec * (style === "chill" ? 1.2 : 0.45);
    if (style === "chill") this.keys(t, [note + 12], len, out, 0.035);
    else this.pluck(t, note, len, out, 0.055, "square");
  }

  // ---------------------------------------------------------------------
  // Instruments

  private env(
    g: GainNode,
    t: number,
    peak: number,
    attack: number,
    decay: number
  ) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }

  private kick(t: number, vel: number, out: AudioNode) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(160, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    this.env(g, t, 0.95 * vel, 0.004, 0.32);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + 0.4);
  }

  private noiseHit(
    t: number,
    dur: number,
    peak: number,
    filter: BiquadFilterType,
    freq: number,
    out: AudioNode,
    q = 0.8
  ) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = filter;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    this.env(g, t, peak, 0.002, dur);
    src.connect(f).connect(g).connect(out);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.05);
  }

  private snare(t: number, vel: number, out: AudioNode) {
    this.noiseHit(t, 0.18, 0.5 * vel, "bandpass", 1900, out);
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "triangle";
    o.frequency.setValueAtTime(200, t);
    o.frequency.exponentialRampToValueAtTime(140, t + 0.08);
    this.env(g, t, 0.3 * vel, 0.002, 0.1);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + 0.15);
  }

  private clap(t: number, vel: number, out: AudioNode) {
    for (let i = 0; i < 3; i++) {
      this.noiseHit(
        t + i * 0.011,
        i === 2 ? 0.16 : 0.02,
        0.35 * vel,
        "bandpass",
        1300,
        out,
        1.2
      );
    }
  }

  private hat(t: number, open: boolean, vel: number, out: AudioNode) {
    this.noiseHit(t, open ? 0.22 : 0.035, 0.25 * vel, "highpass", 7500, out);
  }

  private crash(t: number, out: AudioNode, vel = 0.8) {
    this.noiseHit(t, 1.4, 0.22 * vel, "highpass", 4500, out, 0.5);
  }

  private bass(
    t: number,
    midi: number,
    dur: number,
    out: AudioNode,
    type: OscillatorType
  ) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const f = ctx.createBiquadFilter();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = midiToFreq(midi);
    f.type = "lowpass";
    f.frequency.setValueAtTime(900, t);
    f.frequency.exponentialRampToValueAtTime(220, t + dur);
    f.Q.value = 3;
    this.env(g, t, 0.32, 0.008, dur);
    o.connect(f).connect(g).connect(out);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private pad(
    t: number,
    notes: number[],
    dur: number,
    out: AudioNode,
    vol: number,
    type: OscillatorType = "triangle"
  ) {
    const ctx = this.ctx!;
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = type === "sawtooth" ? 2200 : 2800;
    const g = ctx.createGain();
    const attack = Math.min(0.06, dur / 4);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.setValueAtTime(vol, t + Math.max(attack, dur - 0.08));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.12);
    f.connect(g).connect(out);
    for (const n of notes) {
      for (const detune of [-6, 6]) {
        const o = ctx.createOscillator();
        o.type = type;
        o.frequency.value = midiToFreq(n);
        o.detune.value = detune;
        o.connect(f);
        o.start(t);
        o.stop(t + dur + 0.2);
      }
    }
  }

  private keys(
    t: number,
    notes: number[],
    dur: number,
    out: AudioNode,
    vol = 0.06
  ) {
    const ctx = this.ctx!;
    for (const n of notes) {
      const o = ctx.createOscillator();
      const o2 = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o2.type = "triangle";
      o.frequency.value = midiToFreq(n);
      o2.frequency.value = midiToFreq(n) * 2;
      const g2 = ctx.createGain();
      g2.gain.value = 0.25;
      this.env(g, t, vol, 0.01, dur);
      o.connect(g);
      o2.connect(g2).connect(g);
      g.connect(out);
      o.start(t);
      o2.start(t);
      o.stop(t + dur + 0.05);
      o2.stop(t + dur + 0.05);
    }
  }

  private pluck(
    t: number,
    midi: number,
    dur: number,
    out: AudioNode,
    vol: number,
    type: OscillatorType
  ) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const f = ctx.createBiquadFilter();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = midiToFreq(midi);
    f.type = "lowpass";
    f.frequency.setValueAtTime(4200, t);
    f.frequency.exponentialRampToValueAtTime(900, t + dur);
    this.env(g, t, vol, 0.005, dur);
    o.connect(f).connect(g).connect(out);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private beep(
    t: number,
    freq: number,
    dur: number,
    vol: number,
    out: AudioNode,
    type: OscillatorType = "sine"
  ) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    this.env(g, t, vol, 0.004, dur);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  // ---------------------------------------------------------------------
  // Sound effects

  sfx(kind: Rating | "early" | "key" | "fanfare" | "join") {
    const ctx = this.unlock();
    if (!ctx || !this.sfxGain || ctx.state !== "running") return;
    const out = this.sfxGain;
    const t = ctx.currentTime + 0.01;
    const notes = (
      list: number[],
      step: number,
      dur: number,
      vol: number,
      type: OscillatorType
    ) =>
      list.forEach((n, i) =>
        this.beep(t + i * step, midiToFreq(n), dur, vol, out, type)
      );
    switch (kind) {
      case "perfect":
        return notes([84, 88, 91, 96], 0.045, 0.18, 0.12, "triangle");
      case "great":
        return notes([84, 91], 0.05, 0.16, 0.11, "triangle");
      case "cool":
        return notes([79], 0, 0.14, 0.1, "triangle");
      case "bad":
        return notes([57], 0, 0.12, 0.08, "square");
      case "miss": {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "sawtooth";
        o.frequency.setValueAtTime(320, t);
        o.frequency.exponentialRampToValueAtTime(110, t + 0.3);
        this.env(g, t, 0.07, 0.01, 0.3);
        o.connect(g).connect(out);
        o.start(t);
        o.stop(t + 0.35);
        return;
      }
      case "early":
        return notes([72], 0, 0.06, 0.05, "sine");
      case "key":
        return this.noiseHit(t, 0.012, 0.04, "highpass", 5000, out);
      case "join":
        return notes([76, 83], 0.07, 0.12, 0.08, "sine");
      case "fanfare":
        return notes([72, 76, 79, 84, 79, 84], 0.11, 0.3, 0.09, "triangle");
    }
  }
}

export const music = new MusicEngine();
