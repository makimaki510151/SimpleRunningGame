import { createGame } from "./game.js";
import { STAGES } from "./stages.js";

const SAVE_KEY = "poyorun-save-v1";
const MUTE_KEY = "poyorun-mute";

const canvas = document.querySelector("#view");
const titleScreen = document.querySelector("#screen-title");
const selectScreen = document.querySelector("#screen-select");
const pauseScreen = document.querySelector("#screen-pause");
const clearScreen = document.querySelector("#screen-clear");
const hud = document.querySelector("#hud");
const hudName = document.querySelector("#hud-name");
const hudFruits = document.querySelector("#hud-fruits");
const banner = document.querySelector("#banner");
const jumpHint = document.querySelector("#jump-hint");
const grid = document.querySelector("#stage-grid");
const muteButton = document.querySelector("#btn-mute");
const titleStamp = document.querySelector("#title-stamp");
const clearTitle = document.querySelector("#clear-title");
const clearTime = document.querySelector("#clear-time");
const clearFruits = document.querySelector("#clear-fruits");
const clearRecord = document.querySelector("#clear-record");
const clearNext = document.querySelector("#btn-next");
const clearNote = document.querySelector("#clear-note");

let save = loadSave(STAGES.length);
let runFruits = { got: 0, total: 3 };

const game = createGame(canvas, {
  onMode(detail) {
    document.body.dataset.mode = detail.mode;
    titleScreen.hidden = detail.mode !== "title";
    selectScreen.hidden = detail.mode !== "select";
    pauseScreen.hidden = detail.mode !== "pause";
    clearScreen.hidden = detail.mode !== "clear";
    hud.hidden = detail.mode !== "play" && detail.mode !== "pause";
    if (detail.mode === "title") {
      titleStamp.hidden = !save.cleared.every(Boolean);
    }
    if (detail.mode === "select") renderSelect();
    if (detail.mode === "play") {
      hudName.textContent = `${detail.stage.id}　${detail.stage.name}`;
      runFruits = { got: 0, total: detail.stage.pickups.length };
      paintBerries(hudFruits, 0, runFruits.total);
      showBanner(detail.stage.name, detail.stage.subtitle);
      flashJumpHint();
    }
    if (detail.mode === "clear") showClear(detail);
  },
  onFruit(detail) {
    runFruits.got = detail.got;
    paintBerries(hudFruits, detail.got, detail.total);
  },
});

if (localStorage.getItem(MUTE_KEY) === "1") {
  game.audio.setMuted(true);
}
paintMute();

document.querySelector("#btn-start").addEventListener("click", () => {
  game.audio.unlock();
  game.audio.click();
  game.play(firstOpen());
});
document.querySelector("#btn-open-select").addEventListener("click", () => {
  game.audio.click();
  game.showSelect();
});
document.querySelector("#btn-back").addEventListener("click", () => {
  game.audio.click();
  game.showTitle();
});
document.querySelector("#btn-pause").addEventListener("click", () => {
  game.audio.click();
  game.pause();
});
document.querySelector("#btn-resume").addEventListener("click", () => {
  game.audio.click();
  game.resume();
});
document.querySelector("#btn-quit").addEventListener("click", () => {
  game.audio.click();
  game.showSelect();
});
clearNext.addEventListener("click", () => {
  game.audio.click();
  game.next();
});
document.querySelector("#btn-clear-select").addEventListener("click", () => {
  game.audio.click();
  game.showSelect();
});
muteButton.addEventListener("click", () => {
  const next = !game.audio.muted;
  game.audio.setMuted(next);
  localStorage.setItem(MUTE_KEY, next ? "1" : "0");
  if (!next) {
    game.audio.unlock();
    game.audio.click();
  }
  paintMute();
});

function paintMute() {
  muteButton.textContent = game.audio.muted ? "おと オフ" : "おと オン";
  muteButton.setAttribute("aria-pressed", game.audio.muted ? "true" : "false");
}

function firstOpen() {
  const index = save.cleared.findIndex((done) => !done);
  return index === -1 ? 0 : index;
}

function showBanner(name, subtitle) {
  banner.textContent = subtitle ? `${name}　${subtitle}` : name;
  banner.classList.remove("show");
  void banner.offsetWidth;
  banner.classList.add("show");
}

function flashJumpHint() {
  jumpHint.hidden = false;
  jumpHint.classList.remove("show");
  void jumpHint.offsetWidth;
  jumpHint.classList.add("show");
}

function showClear(detail) {
  const { index, result, stage } = detail;
  const prevTime = save.times[index];
  const isRecord = prevTime == null || result.time < prevTime;
  const prevFruits = save.fruits[index];
  save.cleared[index] = true;
  save.fruits[index] = Math.max(prevFruits, result.fruits);
  if (isRecord) save.times[index] = result.time;
  writeSave(save);

  const last = index === STAGES.length - 1;
  clearTitle.textContent = last ? "にじのてまで とどいた" : "ステージクリア";
  clearTime.textContent = formatTime(result.time);
  clearRecord.hidden = !isRecord;
  clearNote.hidden = !last;
  clearNext.textContent = last ? "ステージをえらぶ" : "つぎへ";
  paintBerries(clearFruits, result.fruits, result.total);
  if (last && save.cleared.every(Boolean)) {
    clearNote.textContent = "10ステージ、ぜんぶクリア。ポヨはまだ走りたそう。";
  } else if (last) {
    clearNote.textContent = "おつかれさま。のこりのステージも、また走れる。";
  }
  void stage;
}

function renderSelect() {
  grid.replaceChildren();
  STAGES.forEach((stage, index) => {
    const unlocked = index === 0 || save.cleared[index - 1];
    const button = document.createElement("button");
    button.type = "button";
    button.className = "ticket" + (unlocked ? "" : " locked");
    button.style.setProperty("--card", stage.palette.card);
    button.style.setProperty("--card-ink", stage.palette.cardInk);
    button.style.setProperty("--accent", stage.palette.accent);
    button.disabled = !unlocked;

    const num = document.createElement("div");
    num.className = "num";
    num.textContent = unlocked ? String(stage.id) : "？";

    const name = document.createElement("div");
    name.className = "name";
    name.textContent = unlocked ? stage.name : "まだひみつ";

    const sub = document.createElement("div");
    sub.className = "sub";
    sub.textContent = unlocked ? stage.subtitle : "まえのステージをクリア";

    const meta = document.createElement("div");
    meta.className = "meta";
    const berries = document.createElement("span");
    berries.className = "berries";
    paintBerries(berries, unlocked ? save.fruits[index] : 0, 3);
    const time = document.createElement("span");
    time.className = "time";
    time.textContent = unlocked && save.times[index] != null ? formatTime(save.times[index]) : "";
    meta.append(berries, time);

    button.append(num, name, sub, meta);
    if (save.cleared[index]) {
      const stamp = document.createElement("span");
      stamp.className = "stamp";
      stamp.textContent = "クリア";
      button.append(stamp);
    }
    button.addEventListener("click", () => {
      if (!unlocked) return;
      game.audio.click();
      game.play(index);
    });
    grid.append(button);
  });
}

function paintBerries(host, got, total) {
  host.replaceChildren();
  for (let i = 0; i < total; i++) {
    const berry = document.createElement("i");
    berry.className = "berry" + (i < got ? " on" : "");
    host.append(berry);
  }
}

function formatTime(time) {
  return `${time.toFixed(1)}びょう`;
}

function loadSave(count) {
  const blank = () => ({
    v: 1,
    cleared: Array(count).fill(false),
    fruits: Array(count).fill(0),
    times: Array(count).fill(null),
  });
  try {
    const raw = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
    const saveData = blank();
    if (!raw) return saveData;
    for (let i = 0; i < count; i++) {
      saveData.cleared[i] = !!raw.cleared?.[i];
      saveData.fruits[i] = Number(raw.fruits?.[i]) || 0;
      const time = raw.times?.[i];
      saveData.times[i] = typeof time === "number" ? time : null;
    }
    return saveData;
  } catch {
    return blank();
  }
}

function writeSave(saveData) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
}
