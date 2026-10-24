// src/audio.js
// Procedural Web Audio API sound generator for Color Flip
// Zero external network dependencies, 100% offline & CSP compliant

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.urgencyInterval = null;
    this.shuffleTimer = null;
  }

  ensureContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  playTone(freq, type, duration, gain = 0.3, pitchMult = 1.0) {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq * pitchMult, t);

      gainNode.gain.setValueAtTime(gain, t);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, t + duration);

      osc.connect(gainNode);
      gainNode.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + duration);
    } catch (e) {
      // AudioContext policy
    }
  }

  /**
   * Universal 2.5s Shuffle Phase:
   * Rapid rhythmic ticks that decelerate and rise in pitch
   */
  startShuffleSequence(onTick) {
    this.ensureContext();
    if (this.shuffleTimer) clearTimeout(this.shuffleTimer);

    let step = 0;
    const totalSteps = 24;
    const startTime = performance.now();
    const duration = 2500; // 2.5 seconds

    const scheduleTick = () => {
      const elapsed = performance.now() - startTime;
      if (elapsed >= duration) {
        return;
      }

      const progress = elapsed / duration;
      // Rising pitch: 350Hz -> 800Hz
      const freq = 350 + progress * 450;
      this.playTone(freq, 'triangle', 0.05, 0.15);

      if (onTick) onTick(progress);

      // Decelerate interval: 50ms at start -> 150ms near end
      const nextDelay = 40 + Math.pow(progress, 1.8) * 110;
      this.shuffleTimer = setTimeout(scheduleTick, nextDelay);
    };

    scheduleTick();
  }

  stopShuffleSequence() {
    if (this.shuffleTimer) {
      clearTimeout(this.shuffleTimer);
      this.shuffleTimer = null;
    }
  }

  /**
   * 1.5s Lock-in Peek:
   * Camera shutter / crystal lock chime + 2-beat bass pulse
   */
  playLockInPeek() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;

      // Crystal lock chime (high bell arpeggio)
      const freqs = [1046.5, 1318.5, 1567.98, 2093.0]; // C6, E6, G6, C7
      freqs.forEach((f, i) => {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, t + i * 0.04);
        g.gain.setValueAtTime(0.2, t + i * 0.04);
        g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.04 + 0.35);
        osc.connect(g);
        g.connect(this.ctx.destination);
        osc.start(t + i * 0.04);
        osc.stop(t + i * 0.04 + 0.35);
      });

      // 2-Beat Bass pulse during 1.5s peek
      [0.2, 0.8].forEach((offset) => {
        const bass = this.ctx.createOscillator();
        const bGain = this.ctx.createGain();
        bass.type = 'triangle';
        bass.frequency.setValueAtTime(80, t + offset);
        bass.frequency.exponentialRampToValueAtTime(45, t + offset + 0.25);
        bGain.gain.setValueAtTime(0.25, t + offset);
        bGain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.25);
        bass.connect(bGain);
        bGain.connect(this.ctx.destination);
        bass.start(t + offset);
        bass.stop(t + offset + 0.25);
      });
    } catch (e) {}
  }

  /**
   * 0.4s Cascade Flip-Down:
   * Rapid domino wave whoosh-clack
   */
  playCascadeFlipDown() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      for (let i = 0; i < 6; i++) {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(260 + i * 50, t + i * 0.05);
        osc.frequency.exponentialRampToValueAtTime(140, t + i * 0.05 + 0.08);
        g.gain.setValueAtTime(0.18, t + i * 0.05);
        g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.05 + 0.08);
        osc.connect(g);
        g.connect(this.ctx.destination);
        osc.start(t + i * 0.05);
        osc.stop(t + i * 0.05 + 0.08);
      }
    } catch (e) {}
  }

  /**
   * Level-Specific Tile Flip Sound
   */
  playFlip(levelId = 1) {
    if (this.muted) return;
    this.ensureContext();

    switch (levelId) {
      case 1: // Studio Matte: tactile plastic/wood tap
        this.playTone(420, 'triangle', 0.08, 0.25);
        break;
      case 2: // Satin Sunset: smooth satin card slide/tap
        this.playTone(320, 'sine', 0.12, 0.22);
        break;
      case 3: // Neon Obsidian: crisp mechanical switch click
        this.playTone(850, 'square', 0.05, 0.18);
        break;
      case 4: // Bauhaus Glass: crisp acrylic/glass clink
        this.playTone(1200, 'sine', 0.07, 0.25);
        break;
      case 5: // Holographic Prism: liquid water-drop glass tap
        this.playTone(950, 'sine', 0.15, 0.25);
        break;
      default:
        this.playTone(440, 'sine', 0.08, 0.2);
    }
  }

  /**
   * Level-Specific Match Sound with streak pitch increase (+0.1 per streak)
   */
  playMatch(levelId = 1, streak = 0) {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const streakPitch = 1.0 + Math.min(streak * 0.1, 0.8);
    const t = this.ctx.currentTime;

    try {
      switch (levelId) {
        case 1: { // Marimba two-note chord (C5, G5)
          const notes = [523.25, 783.99];
          notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq * streakPitch, t + idx * 0.06);
            g.gain.setValueAtTime(0.3, t + idx * 0.06);
            g.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.06 + 0.3);
            osc.connect(g);
            g.connect(this.ctx.destination);
            osc.start(t + idx * 0.06);
            osc.stop(t + idx * 0.06 + 0.3);
          });
          break;
        }
        case 2: { // Warm lo-fi Rhodes synth chord (E4, G4, B4, D5)
          const notes = [329.63, 392.0, 493.88, 587.33];
          notes.forEach((freq) => {
            const osc = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq * streakPitch, t);
            g.gain.setValueAtTime(0.18, t);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
            osc.connect(g);
            g.connect(this.ctx.destination);
            osc.start(t);
            osc.stop(t + 0.45);
          });
          break;
        }
        case 3: { // Futuristic synth pulse (Cyber laser sweep)
          const osc = this.ctx.createOscillator();
          const g = this.ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(400 * streakPitch, t);
          osc.frequency.exponentialRampToValueAtTime(1400 * streakPitch, t + 0.15);
          g.gain.setValueAtTime(0.2, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
          osc.connect(g);
          g.connect(this.ctx.destination);
          osc.start(t);
          osc.stop(t + 0.3);
          break;
        }
        case 4: { // Clean harmonic bell ding (A5 + overtone)
          const osc1 = this.ctx.createOscillator();
          const osc2 = this.ctx.createOscillator();
          const g = this.ctx.createGain();
          osc1.type = 'sine';
          osc2.type = 'sine';
          osc1.frequency.setValueAtTime(880 * streakPitch, t);
          osc2.frequency.setValueAtTime(1760 * streakPitch, t);
          g.gain.setValueAtTime(0.25, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
          osc1.connect(g);
          osc2.connect(g);
          g.connect(this.ctx.destination);
          osc1.start(t);
          osc2.start(t);
          osc1.stop(t + 0.5);
          osc2.stop(t + 0.5);
          break;
        }
        case 5: { // Angelic crystal harp shimmer (fast rising pentatonic)
          const pent = [587.33, 659.25, 783.99, 880.0, 1046.5];
          pent.forEach((f, i) => {
            const osc = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(f * streakPitch, t + i * 0.04);
            g.gain.setValueAtTime(0.2, t + i * 0.04);
            g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.04 + 0.35);
            osc.connect(g);
            g.connect(this.ctx.destination);
            osc.start(t + i * 0.04);
            osc.stop(t + i * 0.04 + 0.35);
          });
          break;
        }
        default:
          this.playTone(600 * streakPitch, 'triangle', 0.25, 0.3);
      }
    } catch (e) {}
  }

  /**
   * Level-Specific Mismatch Sound
   */
  playMismatch(levelId = 1) {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    try {
      switch (levelId) {
        case 1: // Soft muted thud
          this.playTone(140, 'triangle', 0.15, 0.25);
          break;
        case 2: // Low muted bass pluck
          this.playTone(110, 'sine', 0.2, 0.25);
          break;
        case 3: // Low digital "access denied" buzz
          this.playTone(85, 'sawtooth', 0.18, 0.2);
          break;
        case 4: // Hollow ceramic knock
          this.playTone(180, 'triangle', 0.1, 0.25);
          break;
        case 5: // Reversed synth sweep
          const osc = this.ctx.createOscillator();
          const g = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(600, t);
          osc.frequency.exponentialRampToValueAtTime(150, t + 0.2);
          g.gain.setValueAtTime(0.2, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
          osc.connect(g);
          g.connect(this.ctx.destination);
          osc.start(t);
          osc.stop(t + 0.2);
          break;
        default:
          this.playTone(160, 'sine', 0.15, 0.2);
      }
    } catch (e) {}
  }

  /**
   * Level-Specific Victory Fanfare
   */
  playVictory(levelId = 1) {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const chords = [523.25, 659.25, 783.99, 1046.5]; // C Major
    try {
      chords.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = levelId === 3 ? 'sawtooth' : 'sine';
        osc.frequency.setValueAtTime(freq, t + idx * 0.08);
        g.gain.setValueAtTime(0.25, t + idx * 0.08);
        g.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.08 + 0.8);
        osc.connect(g);
        g.connect(this.ctx.destination);
        osc.start(t + idx * 0.08);
        osc.stop(t + idx * 0.08 + 0.8);
      });
    } catch (e) {}
  }

  /**
   * Final 10 Seconds Urgency Ticking: accelerates from 1.0x to 1.5x
   */
  startUrgency(timeLeft) {
    if (this.muted) return;
    this.ensureContext();

    // Frequency increases and tick is snappy
    const speedRatio = 1.0 + (10.0 - Math.max(0, timeLeft)) / 20.0;
    this.playTone(880 * speedRatio, 'square', 0.03, 0.12);
  }

  stopUrgency() {
    // clean
  }
}

export const sound = new SoundEngine();
