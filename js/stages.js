// ステージの追加は、このファイルの STAGES に makeStage(...) を足すだけ。
// セレクト画面とセーブデータは配列の長さに合わせて伸びる。
//
// 地面の高さが GROUND_Y。数字が小さいほど高い足場。
// プレイヤーは自動で右へ走る。ジャンプの届き（目安）:
//   タップ        高さ 30px   距離 90px
//   ちょっと押し  高さ 80px   距離 130px
//   長押し       高さ 170px  距離 190px（速度が上がると距離は伸びる）
//   ばね         高さ 220px  距離 230px
// 隙間は届きより少し短く置く。

import { GROUND_Y } from "./sim.js";

const STAGES_SRC = [
  {
    id: 1,
    name: "はじまりのおか",
    subtitle: "ジャンプになれよう",
    speed: 248,
    dress: "meadow",
    palette: palette({
      skyTop: "#fff4d8",
      skyBottom: "#ffd7a4",
      sun: "#ffe38a",
      hillFar: "#f3c592",
      hillMid: "#e3925c",
      ground: "#6eae45",
      groundDeep: "#3d7a30",
      soil: "#d0894e",
      grass: "#97d85f",
      plat: "#f6d7a4",
      platTop: "#fff1cc",
      accent: "#ef5d45",
      accent2: "#f2b544",
      ink: "#4a301c",
      pit: "#8d5330",
      cloud: "#fffaf2",
      spike: "#ef6348",
      spikeDeep: "#c94432",
      mote: "#ef5d45",
      card: "#fff3d4",
      cardInk: "#4a301c",
    }),
    build(b) {
      let x = 0;
      const ground = (w) => { b.ground(x, w); x += w; };
      const gap = (w) => { x += w; };
      const plat = (w, y) => { b.plat(x, y, w); x += w; };

      ground(1460);
      b.hint(220, 286, "スペースかタップでジャンプ");
      b.fruit(700, 346);
      gap(56);
      ground(900);
      b.hint(1720, 286, "ながくおすと たかく。はなすと ひくく");
      b.fruit(2140, 228);
      gap(86);
      plat(190, 330);
      gap(98);
      plat(170, 258);
      b.fruit(x - 80, 214);
      gap(108);
      ground(1080);
      gap(62);
      ground(820);
      b.goal(x - 240);
    },
  },
  {
    id: 2,
    name: "せせらぎのいし",
    subtitle: "いしづたいをわたる",
    speed: 262,
    dress: "stream",
    palette: palette({
      skyTop: "#e5f6ff",
      skyBottom: "#b7e2f6",
      sun: "#fff6c8",
      hillFar: "#c9d8c4",
      hillMid: "#89b49a",
      ground: "#7e9088",
      groundDeep: "#556863",
      soil: "#6e927c",
      grass: "#8fce78",
      plat: "#e4eee6",
      platTop: "#f7fff8",
      accent: "#ef7b58",
      accent2: "#f2c14a",
      ink: "#2c3d3a",
      pit: "#1d6f90",
      water: "#3aa4c9",
      cloud: "#f5fbff",
      spike: "#ef6a55",
      spikeDeep: "#c44838",
      mote: "#ef7b58",
      card: "#e7f6fb",
      cardInk: "#234048",
    }),
    build(b) {
      let x = 0;
      const ground = (w) => { b.ground(x, w); x += w; };
      const gap = (w) => { x += w; };
      const plat = (w, y) => { b.plat(x, y, w); x += w; };

      ground(760);
      b.hint(190, 292, "いしのうえを ぴょんぴょん");
      b.fruit(500, 376);
      gap(72);
      plat(136, 408);
      gap(84);
      plat(124, 384);
      gap(96);
      plat(116, 408);
      gap(110);
      plat(150, 322);
      b.fruit(x - 76, 276);
      gap(100);
      plat(130, 408);
      gap(92);
      ground(820);
      b.check(x - 760);
      b.hint(x - 740, 246, "たかすぎると あたまをぶつける");
      b.spikeDown(x - 620, 304, 5, 24);
      b.fruit(x - 500, 372);
      gap(108);
      plat(140, 356);
      gap(118);
      plat(140, 408);
      gap(126);
      ground(1040);
      b.goal(x - 260);
    },
  },
  {
    id: 3,
    name: "たけやぶのみち",
    subtitle: "たかさのちがうあしば",
    speed: 274,
    dress: "bamboo",
    palette: palette({
      skyTop: "#e9f7cc",
      skyBottom: "#b6d86e",
      sun: "#fff3b0",
      hillFar: "#9dc46a",
      hillMid: "#3f7a46",
      ground: "#2f6a3c",
      groundDeep: "#1d4a2c",
      soil: "#c4a15a",
      grass: "#7dba55",
      plat: "#e6c56e",
      platTop: "#f6e4a6",
      accent: "#f08a3a",
      accent2: "#f2d26a",
      ink: "#24361c",
      pit: "#1a3324",
      cloud: "#f7ffe8",
      spike: "#d85a32",
      spikeDeep: "#a33e24",
      mote: "#f08a3a",
      card: "#e8f6c8",
      cardInk: "#24361c",
    }),
    build(b) {
      let x = 0;
      const ground = (w) => { b.ground(x, w); x += w; };
      const gap = (w) => { x += w; };
      const plat = (w, y) => { b.plat(x, y, w); x += w; };
      const steps = (list, gapW) => {
        list.forEach((step, index) => {
          const [y, w, withFruit] = step;
          plat(w, y);
          if (withFruit) b.fruit(x - w * 0.5, y - 34);
          if (index < list.length - 1) gap(gapW);
        });
      };

      ground(640);
      b.hint(160, 292, "ほそいあしば。おす長さで たかさをかえる");
      b.fruit(430, 376);
      gap(100);
      steps([
        [408, 96],
        [342, 92],
        [284, 92],
        [350, 100],
        [258, 128, true],
        [322, 92],
        [400, 110],
      ], 114);
      gap(78);
      plat(250, 386);
      b.check(x - 210, 386);
      gap(108);
      steps([
        [324, 100],
        [246, 120, true],
        [318, 96],
        [392, 110],
      ], 116);
      gap(88);
      ground(920);
      b.goal(x - 240);
    },
  },
  {
    id: 4,
    name: "かぜの回廊",
    subtitle: "おいかぜと むかいかぜ",
    speed: 250,
    dress: "wind",
    palette: palette({
      skyTop: "#f4fbff",
      skyBottom: "#d4ecff",
      sun: "#fff8d4",
      hillFar: "#f6e6c4",
      hillMid: "#ecd59a",
      ground: "#e6d2a6",
      groundDeep: "#c4a56e",
      soil: "#d8b888",
      grass: "#d2e28a",
      plat: "#fffaf0",
      platTop: "#ffffff",
      accent: "#5eb0e0",
      accent2: "#f2c14a",
      ink: "#3e4a55",
      pit: "#b9d7ea",
      cloud: "#ffffff",
      spike: "#ef7a62",
      spikeDeep: "#d25548",
      mote: "#7ec4ea",
      card: "#eef7ff",
      cardInk: "#2e4150",
    }),
    build(b) {
      let x = 0;
      const ground = (w) => { b.ground(x, w); x += w; };
      const gap = (w) => { x += w; };
      const plat = (w, y) => { b.plat(x, y, w); x += w; };

      ground(940);
      b.hint(170, 292, "おいかぜのあいだは とおくとべる");
      b.fruit(560, 350);
      const tailFrom = x - 280;
      gap(200);
      ground(420);
      gap(190);
      ground(500);
      b.wind(tailFrom, x - tailFrom, 155);
      b.fruit(x - 260, 236);
      b.hint(x - 430, 250, "いきおいの まま とんで！");
      b.wind(x, 2600, -125);
      gap(175);
      ground(860);
      b.check(x - 780);
      b.hint(x - 700, 292, "むかいかぜだと ジャンプはみじかい");
      b.fruit(x - 460, 358);
      gap(52);
      plat(140, 408);
      gap(46);
      plat(150, 344);
      gap(54);
      ground(980);
      b.goal(x - 260);
    },
  },
  {
    id: 5,
    name: "ぽんぽんいわ",
    subtitle: "ばねで ひとはね",
    speed: 268,
    dress: "candy",
    palette: palette({
      skyTop: "#ffe8f2",
      skyBottom: "#ffd0b4",
      sun: "#fff1ae",
      hillFar: "#ffb7cc",
      hillMid: "#ff9478",
      ground: "#f0a3b8",
      groundDeep: "#d87490",
      soil: "#e8899a",
      grass: "#ffd0dc",
      plat: "#fff0f4",
      platTop: "#ffffff",
      accent: "#ff5d8f",
      accent2: "#ffe14a",
      ink: "#5a2740",
      pit: "#f0b8c8",
      cloud: "#fff7fb",
      spike: "#ff5a6a",
      spikeDeep: "#d43b55",
      mote: "#ff5d8f",
      card: "#ffe4f0",
      cardInk: "#5a2740",
    }),
    build(b) {
      let x = 0;
      const ground = (w) => { b.ground(x, w); x += w; };
      const gap = (w) => { x += w; };
      const plat = (w, y) => { b.plat(x, y, w); x += w; };
      const bounce = (w, y = GROUND_Y) => { b.bounce(x, y, w); x += w; };

      ground(680);
      b.hint(160, 300, "ばねをふむと ひとりでに たかくとぶ");
      b.fruit(450, 352);
      bounce(120);
      gap(55);
      plat(400, 214);
      b.fruit(x - 250, 172);
      bounce(120, 214);
      gap(36);
      plat(420, 100);
      b.fruit(x - 240, 58);
      bounce(110, 100);
      gap(70);
      ground(1100);
      b.check(x - 980);
      b.hint(x - 900, 292, "おちるときも ばねはとどく");
      gap(96);
      plat(170, 328);
      gap(88);
      ground(900);
      b.goal(x - 240);
    },
  },
  {
    id: 6,
    name: "とげとげの谷",
    subtitle: "タイミングよくこえる",
    speed: 286,
    dress: "canyon",
    palette: palette({
      skyTop: "#ffe6cc",
      skyBottom: "#f2b48a",
      sun: "#fff0c0",
      hillFar: "#e7a06e",
      hillMid: "#c56b48",
      ground: "#c47b52",
      groundDeep: "#8d4e34",
      soil: "#a8643e",
      grass: "#e0b06a",
      plat: "#f0c49a",
      platTop: "#ffe6c4",
      accent: "#f2c14a",
      accent2: "#fff1c8",
      ink: "#4a2618",
      pit: "#8a4a32",
      cloud: "#fff4e8",
      spike: "#e24b38",
      spikeDeep: "#b43328",
      mote: "#f2c14a",
      card: "#ffe4c8",
      cardInk: "#4a2618",
    }),
    build(b) {
      let x = 0;
      const ground = (w) => { b.ground(x, w); x += w; };
      const gap = (w) => { x += w; };
      const plat = (w, y) => { b.plat(x, y, w); x += w; };

      ground(520);
      b.hint(160, 292, "ちいさなジャンプで とげをこえる");
      b.fruit(360, 356);
      b.spike(700, 2);
      ground(980);
      b.spike(1120, 2);
      b.spike(1480, 3);
      b.fruit(1660, 300);
      ground(900);
      b.spike(1960, 2, GROUND_Y, 36);
      b.hint(1880, 250, "たかいとげは すこしながくおす");
      b.spike(2320, 2);
      ground(560);
      gap(124);
      plat(180, 408);
      gap(116);
      plat(170, 348);
      b.fruit(x - 90, 304);
      gap(120);
      plat(180, 408);
      b.spike(x - 120, 1);
      gap(110);
      ground(1200);
      b.check(x - 1100);
      b.hint(x - 980, 236, "ひくくとんで とげだけこえる");
      b.spike(x - 860, 2, GROUND_Y, 34);
      b.spikeDown(x - 860, 300, 4, 22);
      b.goal(x - 280);
    },
  },
  {
    id: 7,
    name: "くずれかけの橋",
    subtitle: "のると くずれだす",
    speed: 284,
    dress: "clay",
    palette: palette({
      skyTop: "#f8ead8",
      skyBottom: "#e6c4a4",
      sun: "#fff0c4",
      hillFar: "#e0b18e",
      hillMid: "#c48462",
      ground: "#c48962",
      groundDeep: "#8d5a3c",
      soil: "#b07850",
      grass: "#d8b07a",
      plat: "#efc2a0",
      platTop: "#ffe0c4",
      accent: "#d4654a",
      accent2: "#f0c48a",
      ink: "#4a2c1c",
      pit: "#a86848",
      cloud: "#fff6ee",
      spike: "#d85a40",
      spikeDeep: "#a83828",
      mote: "#d4654a",
      card: "#f8e6d4",
      cardInk: "#4a2c1c",
    }),
    build(b) {
      let x = 0;
      const ground = (w) => { b.ground(x, w); x += w; };
      const gap = (w) => { x += w; };
      const crumble = (w, y, delay = 0.4) => { b.crumble(x, y, w, delay); x += w; };
      const plat = (w, y) => { b.plat(x, y, w); x += w; };

      ground(560);
      b.hint(150, 292, "あしばは のると くずれはじめる");
      b.fruit(380, 356);
      gap(86);
      crumble(156, 408, 0.4);
      gap(78);
      crumble(150, 386, 0.4);
      gap(82);
      crumble(148, 332, 0.42);
      b.fruit(x - 70, 286);
      gap(84);
      crumble(150, 408, 0.38);
      gap(76);
      ground(360);
      b.check(x - 300);
      b.hint(x - 320, 292, "ここは あんしん");
      gap(96);
      crumble(160, 352, 0.36);
      gap(86);
      crumble(150, 292, 0.38);
      gap(88);
      crumble(156, 246, 0.4);
      b.fruit(x - 80, 202);
      gap(90);
      crumble(150, 330, 0.36);
      gap(84);
      ground(1100);
      b.goal(x - 280);
    },
  },
  {
    id: 8,
    name: "ゆれる振り子",
    subtitle: "いきおいを もらってとぶ",
    speed: 296,
    dress: "clock",
    palette: palette({
      skyTop: "#dce4ff",
      skyBottom: "#f8d8ef",
      sun: "#fff3c2",
      hillFar: "#c4c0ee",
      hillMid: "#7f8fd6",
      ground: "#6d78b8",
      groundDeep: "#46508a",
      soil: "#8d74a8",
      grass: "#d8c8ef",
      plat: "#fff1c4",
      platTop: "#fff8e4",
      accent: "#f0c14a",
      accent2: "#ff8fb8",
      ink: "#2c2754",
      pit: "#3a3f78",
      cloud: "#f4f0ff",
      spike: "#ef6d8a",
      spikeDeep: "#c44868",
      mote: "#f0c14a",
      card: "#eee8ff",
      cardInk: "#2c2754",
    }),
    build(b) {
      let x = 0;
      const ground = (w) => { b.ground(x, w); x += w; };
      const gap = (w) => { x += w; };
      const plat = (w, y) => { b.plat(x, y, w); x += w; };
      const mover = (w, y, move) => { b.mover(x, y, w, move); x += w; };

      ground(520);
      b.hint(140, 292, "ゆかが あがるときに ジャンプ");
      b.fruit(360, 356);
      gap(64);
      mover(460, 400, { axis: "y", amp: 68, period: 2.35, phase: 0.4 });
      gap(70);
      plat(300, 196);
      b.fruit(x - 180, 152);
      b.check(x - 260, 196);
      b.hint(x - 280, 150, "つぎは ゆかのいきおいで とおくへ");
      gap(60);
      mover(280, 250, { axis: "x", amp: 54, period: 2.05, phase: 0.2 });
      gap(210);
      ground(420);
      b.fruit(x - 250, 300);
      gap(90);
      const gapStart = x;
      gap(150);
      const gapEnd = x;
      plat(200, 408);
      b.pendulum((gapStart + gapEnd) / 2, 150, 168, 0.95, 2.8, 0.6);
      b.hint(gapStart - 220, 250, "ふりこが よけるのを見てから");
      gap(80);
      ground(980);
      b.goal(x - 260);
    },
  },
  {
    id: 9,
    name: "ほしの階段",
    subtitle: "のぼって、それからおりる",
    speed: 318,
    dress: "stars",
    palette: palette({
      skyTop: "#24367c",
      skyBottom: "#4166d4",
      sun: "#fff3c0",
      hillFar: "#314894",
      hillMid: "#4d68c8",
      ground: "#2a3f90",
      groundDeep: "#1a2868",
      soil: "#3a4e9a",
      grass: "#f2d56a",
      plat: "#ffe7a4",
      platTop: "#fff6d4",
      accent: "#ffd45c",
      accent2: "#ff8fb0",
      ink: "#1a2048",
      rim: "#f4f7ff",
      pit: "#18245c",
      cloud: "#d5defe",
      spike: "#ff6d7a",
      spikeDeep: "#d44858",
      mote: "#fff1b8",
      card: "#e6ecff",
      cardInk: "#243064",
    }),
    build(b) {
      let x = 0;
      const ground = (w) => { b.ground(x, w); x += w; };
      const gap = (w) => { x += w; };
      const plat = (w, y) => { b.plat(x, y, w); x += w; };
      const bounce = (w, y) => { b.bounce(x, y, w); x += w; };

      ground(500);
      b.hint(140, 292, "ほしのきざはしを のぼろう");
      b.fruit(340, 352);
      let y = 408;
      for (let i = 0; i < 6; i++) {
        y -= 50;
        gap(104);
        plat(124, y);
        if (i === 3) b.fruit(x - 60, y - 46);
      }
      gap(80);
      plat(380, y);
      b.check(x - 330, y);
      b.hint(x - 300, y - 90, "うえから ばねで おりていく");
      bounce(110, y);
      gap(50);
      plat(240, y + 70);
      bounce(100, y + 70);
      gap(60);
      plat(240, y + 150);
      bounce(100, y + 150);
      gap(80);
      ground(1080);
      b.fruit(x - 620, 300);
      b.goal(x - 280);
    },
  },
  {
    id: 10,
    name: "にじの果て",
    subtitle: "これまでのでばん",
    speed: 302,
    dress: "rainbow",
    palette: palette({
      skyTop: "#fff6ea",
      skyBottom: "#d9f3ff",
      sun: "#fff3b4",
      hillFar: "#c9edb4",
      hillMid: "#7dcea0",
      ground: "#69b85c",
      groundDeep: "#3d8a48",
      soil: "#e0a15a",
      grass: "#b6e86a",
      plat: "#fffdf8",
      platTop: "#ffffff",
      accent: "#ef5b8a",
      accent2: "#7ec8f0",
      ink: "#3a2a22",
      pit: "#b7e4c4",
      cloud: "#ffffff",
      spike: "#ef5a48",
      spikeDeep: "#c43c32",
      mote: "#ef5b8a",
      card: "#fff4ea",
      cardInk: "#3a2a22",
    }),
    build(b) {
      let x = 0;
      const ground = (w) => { b.ground(x, w); x += w; };
      const gap = (w) => { x += w; };
      const plat = (w, y) => { b.plat(x, y, w); x += w; };
      const bounce = (w, y = GROUND_Y) => { b.bounce(x, y, w); x += w; };
      const crumble = (w, y, delay = 0.42) => { b.crumble(x, y, w, delay); x += w; };
      const mover = (w, y, move) => { b.mover(x, y, w, move); x += w; };

      ground(640);
      b.hint(150, 292, "さいごは いままでの ぜんぶ");
      b.fruit(420, 348);
      gap(70);
      ground(280);
      gap(78);
      ground(360);
      b.wind(x - 40, 900, 130);
      gap(185);
      ground(520);
      b.check(x - 460);

      b.hint(x - 420, 292, "ばねで うえのみちへ");
      bounce(120);
      gap(50);
      plat(460, 214);
      b.fruit(x - 400, 186);
      b.spike(x - 260, 2, 214, 22);
      gap(70);
      plat(220, 250);
      gap(80);

      ground(240);
      b.hint(x - 220, 292, "くずれはしを ためさずとぶ");
      gap(80);
      crumble(150, 408, 0.4);
      gap(74);
      crumble(146, 360, 0.4);
      gap(78);
      crumble(150, 408, 0.38);
      gap(70);
      ground(340);
      b.check(x - 280);

      b.hint(x - 250, 292, "あがるゆかで もういちだん");
      gap(60);
      mover(400, 400, { axis: "y", amp: 60, period: 2.4, phase: 0.8 });
      gap(64);
      plat(280, 210);
      gap(50);
      mover(250, 250, { axis: "x", amp: 48, period: 2.1, phase: 0.4 });
      gap(188);
      ground(380);
      b.fruit(x - 160, 372);

      const swing = x;
      gap(140);
      plat(220, 408);
      b.pendulum(swing + 70, 150, 160, 0.9, 3, 1.1);
      b.hint(swing - 200, 250, "ふりこを みのがしてから");
      gap(70);
      ground(1280);
      b.check(x - 1180);
      b.goal(x - 320);
    },
  },
];

function palette(colors) {
  return {
    water: null,
    cloud: "#fffaf4",
    mote: colors.accent,
    ...colors,
  };
}

function makeStage(src) {
  const solids = [];
  const hazards = [];
  const pickups = [];
  const checks = [];
  const zones = [];
  const hints = [];
  let goal = null;
  let nextId = 1;

  const b = {
    ground(x, w) {
      solids.push({ id: nextId++, kind: "ground", x, y: GROUND_Y, w, h: 560 });
    },
    plat(x, y, w) {
      solids.push({ id: nextId++, kind: "plat", x, y, w, h: 22 });
    },
    bounce(x, y, w) {
      solids.push({ id: nextId++, kind: "bounce", x, y, w, h: 22, bounce: true });
    },
    crumble(x, y, w, delay = 0.42) {
      solids.push({ id: nextId++, kind: "crumble", x, y, w, h: 22, crumble: true, delay });
    },
    mover(x, y, w, move) {
      solids.push({ id: nextId++, kind: "mover", x, y, w, h: 24, move });
    },
    spike(x, count = 1, y = GROUND_Y, h = 22) {
      for (let i = 0; i < count; i++) {
        hazards.push({ kind: "spike", dir: "up", x: x + i * 28, y, w: 24, h });
      }
    },
    spikeDown(x, y, count = 1, h = 26) {
      for (let i = 0; i < count; i++) {
        hazards.push({ kind: "spike", dir: "down", x: x + i * 28, y, w: 24, h });
      }
    },
    pendulum(x, y, len, amp, period, phase = 0) {
      hazards.push({ kind: "pendulum", x, y, len, amp, period, phase, r: 15 });
    },
    fruit(x, y) {
      pickups.push({ x, y, r: 14 });
    },
    wind(x, w, force) {
      zones.push({ x, w, force });
    },
    hint(x, y, text) {
      hints.push({ x, y, text });
    },
    check(x, y = GROUND_Y) {
      checks.push({ x, y });
    },
    goal(x, y = GROUND_Y) {
      goal = { x, y };
    },
  };

  src.build(b);
  const stage = {
    id: src.id,
    name: src.name,
    subtitle: src.subtitle,
    speed: src.speed,
    dress: src.dress,
    palette: src.palette,
    solids,
    hazards,
    pickups,
    checks,
    zones,
    hints,
    goal,
    length: goal.x + 700,
  };
  stage.scenery = buildScenery(stage);
  return stage;
}

function buildScenery(stage) {
  const rng = mulberry32(stage.id * 9973 + 17);
  const props = [];
  for (const solid of stage.solids) {
    if (solid.kind !== "ground") continue;
    const step = stage.dress === "bamboo" ? 34 : 30;
    for (let x = solid.x + 16; x < solid.x + solid.w - 12; x += step) {
      const roll = rng();
      if (roll < 0.5) props.push({ kind: "grass", x, y: solid.y, s: 0.75 + rng() * 0.7 });
      else if (roll < 0.68) props.push({ kind: "flower", x, y: solid.y, tint: rng() });
      else if (roll < 0.8) props.push({ kind: "pebble", x, y: solid.y, s: 0.5 + rng() * 0.7 });
      else props.push({ kind: "grass", x, y: solid.y, s: 0.5 + rng() * 0.4 });
    }
  }

  const stalks = [];
  if (stage.dress === "bamboo") {
    for (let x = -40; x < stage.length; x += 42) {
      stalks.push({ x: x + rng() * 12, h: 160 + rng() * 240, lean: rng() * 0.08 - 0.04 });
    }
  }

  const clouds = [];
  for (let x = -160; x < stage.length; x += 200 + rng() * 120) {
    clouds.push({
      x,
      y: 28 + rng() * 130,
      s: 0.65 + rng() * 0.9,
      p: rng() < 0.45 ? 0.18 : 0.38,
    });
  }

  const shapes = ["tri", "diamond", "rect"];
  const motes = [];
  const moteStep = stage.dress === "stars" ? 90 : 150;
  for (let x = -40; x < stage.length; x += moteStep) {
    motes.push({
      x: x + rng() * 30,
      y: 24 + rng() * (stage.dress === "stars" ? 340 : 250),
      shape: shapes[Math.floor(rng() * shapes.length)],
      s: 4 + rng() * (stage.dress === "stars" ? 9 : 7),
      p: 0.12 + rng() * 0.28,
      rot: rng() * Math.PI,
    });
  }

  const rainbows = [];
  if (stage.dress === "rainbow") {
    rainbows.push({ x: stage.goal.x - 200, y: 250, s: 1 });
    rainbows.push({ x: stage.length * 0.48, y: 210, s: 0.72 });
  }

  return {
    props,
    stalks,
    clouds,
    motes,
    hillsFar: hillChain(rng, stage.length, 292, 100),
    hillsMid: hillChain(rng, stage.length, 352, 78),
    rainbows,
  };
}

function hillChain(rng, length, y, radius) {
  const pts = [];
  for (let x = -220; x < length + 300; x += 150) {
    pts.push({ x: x + rng() * 36, y: y - rng() * 26, r: radius + rng() * 54 });
  }
  return pts;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const STAGES = STAGES_SRC.map(makeStage);

export function createAttractStage() {
  const base = STAGES[0];
  const stage = {
    id: 0,
    name: "",
    subtitle: "",
    speed: 220,
    dress: "meadow",
    palette: base.palette,
    solids: [{ id: 1, kind: "ground", x: -600, y: GROUND_Y, w: 90000, h: 560 }],
    hazards: [],
    pickups: [],
    checks: [],
    zones: [],
    hints: [],
    goal: { x: 999999, y: GROUND_Y },
    length: 20000,
  };
  stage.scenery = buildScenery({ ...stage, length: 86000, goal: { x: 80000 } });
  return stage;
}

export function stageById(id) {
  return STAGES.find((stage) => stage.id === id) ?? null;
}
