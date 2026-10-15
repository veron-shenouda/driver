/**
 * Audio Synthesizer using Web Audio API
 * 100% Offline, provides loud alarm sounds, emergency sirens, and pleasant chimes.
 */

class SoundEffects {
  constructor() {
    this.ctx = null;
    this.alarmInterval = null;
    this.isAlarmRunning = false;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  /**
   * Loud Looping Emergency Alarm Sound
   * Plays loud alternating alarm pulses (880Hz and 1174Hz) until stopped.
   */
  startLoopingAlarm() {
    this.init();
    if (!this.ctx) return;
    if (this.isAlarmRunning) return;

    this.isAlarmRunning = true;
    const playPulse = () => {
      if (!this.isAlarmRunning || !this.ctx) return;
      try {
        const now = this.ctx.currentTime;
        const freqs = [880, 1174.66, 880, 1318.51];
        
        freqs.forEach((freq, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, now + idx * 0.15);

          gain.gain.setValueAtTime(0.001, now + idx * 0.15);
          gain.gain.exponentialRampToValueAtTime(0.4, now + idx * 0.15 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.15 + 0.13);

          osc.connect(gain);
          gain.connect(this.ctx.destination);

          osc.start(now + idx * 0.15);
          osc.stop(now + idx * 0.15 + 0.14);
        });
      } catch (e) {
        console.warn('Alarm pulse error:', e);
      }
    };

    playPulse();
    this.alarmInterval = setInterval(playPulse, 700);
  }

  stopLoopingAlarm() {
    this.isAlarmRunning = false;
    if (this.alarmInterval) {
      clearInterval(this.alarmInterval);
      this.alarmInterval = null;
    }
  }

  playSuccessChime() {
    try {
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const notes = [
        { freq: 659.25, time: 0.00, dur: 0.25 },
        { freq: 830.61, time: 0.08, dur: 0.28 },
        { freq: 987.77, time: 0.16, dur: 0.32 },
        { freq: 1318.51, time: 0.24, dur: 0.60 }
      ];

      notes.forEach(({ freq, time, dur }) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + time);

        gain.gain.setValueAtTime(0.001, now + time);
        gain.gain.exponentialRampToValueAtTime(0.22, now + time + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + time + dur);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + time);
        osc.stop(now + time + dur);
      });
    } catch (e) {
      console.warn('Audio playback error:', e);
    }
  }

  playListeningStart() {
    try {
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.18, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.2);
    } catch (e) {}
  }

  playTap() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, now);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.04);
    } catch (e) {}
  }
}

window.soundEffects = new SoundEffects();
