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
    get muted() {
      return muted;
    },
    setMuted(value) {
      muted = value;
      if (master) master.gain.value = value ? 0 : 0.2;
    },
    jump() {
      beep(440, 0.09, "sine", 0.11, 720);
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
