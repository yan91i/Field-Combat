/* ============================================================
 *  audio.js — Web Audio 芯片音源（BGM 进行曲 + 各种音效）
 *  暴露: window.AU
 * ============================================================ */
(function (global) {
  'use strict';

  let ac = null;
  let master = null, musicBus = null, sfxBus = null;
  let enabled = true;
  let noiseBuf = null;

  /* ---------- 音名 -> 频率 ---------- */
  const NOTE_RE = /^([A-G])(#|b)?(-?\d+)$/;
  const SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

  function noteFreq(n) {
    const m = NOTE_RE.exec(n);
    if (!m) return 0;
    let s = SEMI[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
    const oct = parseInt(m[3], 10);
    const midi = (oct + 1) * 12 + s;
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  /* ---------- 初始化 ---------- */
  function init() {
    if (ac) return true;
    const AC = global.AudioContext || global.webkitAudioContext;
    if (!AC) return false;
    ac = new AC();
    master = ac.createGain(); master.gain.value = 0.55; master.connect(ac.destination);
    musicBus = ac.createGain(); musicBus.gain.value = 0.34; musicBus.connect(master);
    sfxBus = ac.createGain(); sfxBus.gain.value = 0.60; sfxBus.connect(master);

    // 白噪声缓冲
    const len = Math.floor(ac.sampleRate * 0.6);
    noiseBuf = ac.createBuffer(1, len, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return true;
  }

  function unlock() {
    if (!init()) return;
    if (ac.state === 'suspended') ac.resume();
  }

  function setEnabled(v) {
    enabled = v;
    if (master) master.gain.setTargetAtTime(v ? 0.55 : 0, ac.currentTime, 0.02);
  }
  function isEnabled() { return enabled; }

  /* ---------- 基础发声 ---------- */
  function voice(freq, t, dur, type, vol, dest, slideTo) {
    if (!ac || !enabled) return;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + Math.min(0.012, dur * 0.3));
    g.gain.setValueAtTime(vol, t + dur * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || sfxBus);
    o.start(t); o.stop(t + dur + 0.03);
  }

  function noise(t, dur, vol, freq, q, dest) {
    if (!ac || !enabled) return;
    const src = ac.createBufferSource();
    src.buffer = noiseBuf;
    const f = ac.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(freq || 2400, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(80, (freq || 2400) * 0.15), t + dur);
    f.Q.value = q || 1;
    const g = ac.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(dest || sfxBus);
    src.start(t); src.stop(t + dur + 0.02);
  }

  /* ---------- 音效 ---------- */
  const SFX = {
    missile: function (t) {
      voice(1200, t, 0.09, 'square', 0.16, sfxBus, 320);
      noise(t, 0.05, 0.06, 3600, 1);
    },
    enemyShot: function (t) {
      voice(520, t, 0.07, 'square', 0.09, sfxBus, 200);
    },
    shell: function (t) {
      voice(220, t, 0.16, 'sawtooth', 0.13, sfxBus, 90);
      noise(t, 0.08, 0.05, 1400, 1);
    },
    hit: function (t) {
      noise(t, 0.07, 0.10, 2200, 1);
      voice(300, t, 0.05, 'square', 0.06, sfxBus, 160);
    },
    boom: function (t) {
      noise(t, 0.34, 0.24, 1800, 1.2);
      voice(160, t, 0.22, 'triangle', 0.13, sfxBus, 50);
    },
    bigBoom: function (t) {
      noise(t, 0.75, 0.34, 1500, 1.4);
      voice(110, t, 0.55, 'triangle', 0.20, sfxBus, 34);
      voice(70, t + 0.05, 0.6, 'square', 0.10, sfxBus, 28);
    },
    // 捕获光束
    beamLoop: null,
    captured: function (t) {
      voice(700, t, 0.10, 'square', 0.13, sfxBus);
      voice(1050, t + 0.07, 0.10, 'square', 0.13, sfxBus);
      voice(1400, t + 0.14, 0.16, 'square', 0.14, sfxBus);
      voice(2100, t + 0.14, 0.16, 'triangle', 0.08, sfxBus);
    },
    deploy: function (t) {
      voice(360, t, 0.07, 'square', 0.15, sfxBus);
      voice(540, t + 0.06, 0.07, 'square', 0.15, sfxBus);
      voice(720, t + 0.12, 0.12, 'square', 0.16, sfxBus);
    },
    playerDie: function (t) {
      voice(500, t, 0.5, 'square', 0.22, sfxBus, 60);
      noise(t, 0.6, 0.3, 1600, 1.4);
      voice(200, t + 0.1, 0.6, 'sawtooth', 0.14, sfxBus, 40);
    },
    gateOpen: function (t) {
      for (let i = 0; i < 5; i++) voice(400 + i * 160, t + i * 0.08, 0.14, 'square', 0.14, sfxBus);
    },
    menu: function (t) { voice(880, t, 0.06, 'square', 0.14, sfxBus); },
    start: function (t) {
      voice(330, t, 0.10, 'square', 0.18, sfxBus);
      voice(440, t + 0.09, 0.10, 'square', 0.18, sfxBus);
      voice(660, t + 0.18, 0.24, 'square', 0.20, sfxBus);
    },
    extra: function (t) {
      [660, 880, 1100, 1320].forEach(function (f, i) {
        voice(f, t + i * 0.07, 0.14, 'square', 0.16, sfxBus);
      });
    }
  };

  function sfx(name) {
    if (!ac || !enabled) return;
    const fn = SFX[name];
    if (fn) fn(ac.currentTime + 0.001);
  }

  /* ---------- BGM：英雄进行曲（B 小调，16 小节 4/4） ----------
   * 致敬原作战场氛围（法格纳《女武神的骑行》式的上行模进）
   * ------------------------------------------------------------ */
  const LEAD = (
    'B3 . D4 . F#4 . B4 .' +
    'F#4 . B4 . D5 . F#5 .' +
    'G4 . B4 . D5 . G5 .' +
    'D5 . B4 . G4 . D4 .' +
    'D4 . F#4 . A4 . D5 .' +
    'A4 . D5 . F#5 . A5 .' +
    'C#5 . E5 . A5 . E5 .' +
    'F#5 . . . . . . .' +
    'B3 . D4 . F#4 . B4 .' +
    'F#4 . B4 . D5 . F#5 .' +
    'E4 . G4 . B4 . E5 .' +
    'B4 . G4 . E4 . B3 .' +
    'A3 . C#4 . E4 . A4 .' +
    'F#4 . A4 . C#5 . F#5 .' +
    'B4 . D5 . F#5 . B5 .' +
    'B5 . . . . . . .'
  ).split(' ');

  const BASS_ROOTS = [
    'B2', 'B2', 'G2', 'G2', 'D3', 'D3', 'A2', 'F#2',
    'B2', 'B2', 'E2', 'E2', 'A2', 'F#2', 'B2', 'B2'
  ];

  const STEPS_PER_BAR = 8;
  const TOTAL_BARS = 16;
  const TOTAL_STEPS = STEPS_PER_BAR * TOTAL_BARS;
  const EIGHTH = 0.14;

  let musicOn = false;
  let step = 0;
  let nextTime = 0;
  let schedTimer = null;

  function scheduleStep(s, t) {
    const lead = LEAD[s % LEAD.length];
    if (lead && lead !== '.') {
      const f = noteFreq(lead);
      voice(f, t, EIGHTH * 0.92, 'square', 0.19, musicBus);
      // 轻微加厚
      voice(f * 2.005, t, EIGHTH * 0.55, 'triangle', 0.055, musicBus);
    }

    const bar = Math.floor(s / STEPS_PER_BAR);
    const beat = s % STEPS_PER_BAR;
    const root = BASS_ROOTS[bar];
    if (beat % 2 === 0) {
      voice(noteFreq(root), t, EIGHTH * 1.6, 'triangle', 0.30, musicBus);
    } else {
      voice(noteFreq(root), t, EIGHTH * 0.7, 'triangle', 0.16, musicBus);
    }

    // 打击乐
    if (beat === 0 || beat === 4) noise(t, 0.10, 0.16, 700, 1, musicBus);
    if (beat === 2 || beat === 6) noise(t, 0.09, 0.12, 3000, 1, musicBus);
  }

  function scheduler() {
    if (!ac || !musicOn) return;
    const horizon = ac.currentTime + 0.25;
    while (nextTime < horizon) {
      scheduleStep(step, nextTime);
      nextTime += EIGHTH;
      step = (step + 1) % TOTAL_STEPS;
    }
  }

  function musicStart() {
    if (!init()) return;
    if (ac.state === 'suspended') ac.resume();
    if (musicOn) return;
    musicOn = true;
    step = 0;
    nextTime = ac.currentTime + 0.12;
    if (schedTimer) clearInterval(schedTimer);
    schedTimer = setInterval(scheduler, 40);
  }

  function musicStop() {
    musicOn = false;
    if (schedTimer) { clearInterval(schedTimer); schedTimer = null; }
  }

  function musicPlaying() { return musicOn; }

  /* ---------- 结算小曲 ---------- */
  function jingleClear() {
    if (!init()) return;
    musicStop();
    const t = ac.currentTime + 0.02;
    const seq = ['B4', 'D5', 'F#5', 'B5', 'F#5', 'B5', 'D6'];
    seq.forEach(function (n, i) { voice(noteFreq(n), t + i * 0.13, 0.22, 'square', 0.20, sfxBus); });
    voice(noteFreq('B2'), t, 0.9, 'triangle', 0.24, sfxBus);
  }

  function jingleOver() {
    if (!init()) return;
    musicStop();
    const t = ac.currentTime + 0.02;
    const seq = ['B4', 'A4', 'G4', 'F#4', 'E4', 'D4', 'C#4', 'B3'];
    seq.forEach(function (n, i) { voice(noteFreq(n), t + i * 0.20, 0.32, 'square', 0.20, sfxBus); });
    voice(noteFreq('B2'), t + 0.1, 1.6, 'triangle', 0.22, sfxBus);
  }

  global.AU = {
    unlock: unlock,
    sfx: sfx,
    setEnabled: setEnabled,
    isEnabled: isEnabled,
    musicStart: musicStart,
    musicStop: musicStop,
    musicPlaying: musicPlaying,
    jingleClear: jingleClear,
    jingleOver: jingleOver
  };

})(window);
