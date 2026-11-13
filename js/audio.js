export function createAudio() {
  let ctx = null;
  let master = null;
  let muted = false;

  function ensure() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!ctx) {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.2;
      master.connect(ctx.destination);
      musicGain = ctx.createGain();
      musicGain.gain.value = 0.9;
      musicGain.connect(master);
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function beep(freq, dur, type, gain, toFreq) {
    if (muted) return;
    const ac = ensure();
    if (!ac || !master) return;
    const t = ac.currentTime;
    const osc = ac.createOscillator();
    const amp = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (toFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(48, toFreq), t + dur);
    amp.gain.setValueAtTime(gain, t);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(amp);
    amp.connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.03);
  }

  const PENTA = [0, 2, 4, 7, 9];
  const PHRASES = [
    [[0, 2], [2, 2], [4, 2], [2, 2], [3, 4], [2, 4]],
    [[4, 2], [3, 1], [2, 1], [0, 4], [2, 4], [4, 4]],
    [[0, 2], [0, 2], [4, 2], [7, 2], [4, 4], [2, 4]],
    [[7, 2], [4, 2], [3, 2], [2, 2], [0, 4], [2, 4]],
    [[2, 4], [4, 2], [3, 2], [4, 4], [2, 2], [0, 2]],
    [[4, 2], [7, 2], [9, 4], [7, 2], [4, 2], [2, 4]],
    [[0, 4], [2, 2], [4, 2], [3, 4], [0, 4]],
    [[4, 2], [2, 2], [0, 2], [2, 2], [4, 4], [7, 4]],
  ];
  const FORM = [0, 1, 2, 3, 1, 4, 5, 6, 2, 7, 4, 0, 5, 3, 6, 1];
  const BASS = [0, 0, 4, 3, 0, 2, 4, 0, 4, 0, 3, 0, 4, 3, 0, 2];
  const EIGHTH = 60 / 86 / 2;
  const PHRASE = 16;
  const SONG = FORM.length * PHRASE;
  let musicGain = null;
  let cursor = 0;
  let eighthIndex = 0;
  let started = false;

  function degreeHz(degree, midi) {
    let step = degree;
    let oct = 0;
    while (step < 0) {
      step += 5;
      oct -= 1;
    }
    oct += Math.floor(step / 5);
    step = ((step % 5) + 5) % 5;
    const semi = PENTA[step] + oct * 12;
    return 440 * Math.pow(2, (midi + semi - 69) / 12);
  }

  function tone(freq, when, dur, type, gain) {
    if (!ctx || !musicGain || muted) return;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, when);
    amp.gain.setValueAtTime(0.0001, when);
    amp.gain.exponentialRampToValueAtTime(gain, when + 0.02);
    amp.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    osc.connect(amp);
    amp.connect(musicGain);
    osc.start(when);
    osc.stop(when + dur + 0.03);
  }

  function scheduleEighth(when, index) {
    const at = index % SONG;
    const phrase = Math.floor(at / PHRASE);
    const local = at % PHRASE;
    const notes = PHRASES[FORM[phrase]];
    let cursorNote = 0;
    for (const [degree, length] of notes) {
      if (local === cursorNote) {
        const dur = Math.min(length * EIGHTH * 0.92, 1.15);
        tone(degreeHz(degree, 72), when, dur, "triangle", local === 0 ? 0.055 : 0.04);
      }
      cursorNote += length;
    }
    if (local === 0 || local === 8) {
      tone(degreeHz(BASS[phrase], 48), when, EIGHTH * 6.2, "sine", 0.07);
      tone(degreeHz(BASS[phrase] + 2, 60), when, EIGHTH * 5.4, "sine", 0.018);
    }
  }

  function pump() {
    if (muted || !ctx || !musicGain) return;
    if (!started) {
      cursor = ctx.currentTime + 0.06;
      eighthIndex = 0;
      started = true;
    }
    if (cursor < ctx.currentTime) cursor = ctx.currentTime + 0.02;
    const horizon = ctx.currentTime + 0.42;
    while (cursor < horizon) {
      scheduleEighth(cursor, eighthIndex);
      cursor += EIGHTH;
      eighthIndex += 1;
    }
  }

  function noise(dur, gain, freq) {
    if (muted) return;
    const ac = ensure();
    if (!ac || !master) return;
    const length = Math.max(1, Math.floor(ac.sampleRate * dur));
    const buffer = ac.createBuffer(1, length, ac.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const src = ac.createBufferSource();
    src.buffer = buffer;
    const filter = ac.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = freq;
    const amp = ac.createGain();
    amp.gain.value = gain;
    src.connect(filter);
    filter.connect(amp);
    amp.connect(master);
    src.start();
  }

  return {
    unlock() {
      if (!muted) ensure();
    },
    pump() {
      if (!muted && ctx) pump();
    },
    get muted() {
      return muted;
    },
    setMuted(value) {
      muted = value;
      if (master) master.gain.value = value ? 0 : 0.2;
    },
    jump(air) {
      if (air) beep(560, 0.08, "sine", 0.09, 920);
      else beep(440, 0.09, "sine", 0.11, 720);
    },
    land() {
      noise(0.07, 0.12, 380);
      beep(150, 0.06, "triangle", 0.05, 90);
    },
    bounce() {
      beep(500, 0.11, "triangle", 0.12, 960);
    },
    fruit() {
      beep(640, 0.08, "sine", 0.09, 860);
      window.setTimeout(() => beep(980, 0.1, "sine", 0.07), 75);
    },
    fail() {
      beep(340, 0.2, "triangle", 0.1, 80);
    },
    win() {
      [523, 659, 784, 1046].forEach((note, index) => {
        window.setTimeout(() => beep(note, 0.18, "triangle", 0.08), index * 110);
      });
    },
    check() {
      beep(560, 0.09, "sine", 0.08, 780);
    },
    click() {
      beep(360, 0.045, "square", 0.03, 520);
    },
  };
}
