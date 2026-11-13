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
const signboard = document.querySelector("#signboard");
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
    if (detail.mode !== "play") {
      signboard.hidden = true;
      signboard.textContent = "";
    }
    queueMicrotask(() => focusFor(detail.mode));
  },
  onSign(text) {
    signboard.hidden = !text;
    signboard.textContent = text || "";
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
  clearTitle.textContent = last ? "つきのうらまで とどいた" : "ステージクリア";
  clearTime.textContent = formatTime(result.time);
  clearRecord.hidden = !isRecord;
  clearNote.hidden = !last;
  clearNext.textContent = last ? "ステージをえらぶ" : "つぎへ";
  paintBerries(clearFruits, result.fruits, result.total);
  if (last && save.cleared.every(Boolean)) {
    clearNote.textContent = "15ステージ、ぜんぶクリア。ポヨはまだ走りたそう。";
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

function menuButtons() {
  return [...document.querySelectorAll("#ui button")].filter((button) => {
    if (button.disabled || button.id === "btn-pause") return false;
    return button.getClientRects().length > 0;
  });
}

function focusFor(mode) {
  if (mode === "title") document.querySelector("#btn-start")?.focus();
  else if (mode === "select") document.querySelector("#stage-grid .ticket:not(:disabled)")?.focus();
  else if (mode === "pause") document.querySelector("#btn-resume")?.focus();
  else if (mode === "clear") document.querySelector("#btn-next")?.focus();
  else if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
}

function moveFocus(dir) {
  const buttons = menuButtons();
  if (!buttons.length) return;
  const current = buttons.includes(document.activeElement) ? document.activeElement : null;
  if (!current) {
    buttons[0].focus();
    return;
  }
  const from = current.getBoundingClientRect();
  const cx = from.left + from.width / 2;
  const cy = from.top + from.height / 2;
  let best = null;
  let bestScore = Infinity;
  for (const button of buttons) {
    if (button === current) continue;
    const rect = button.getBoundingClientRect();
    const x = rect.left + rect.width / 2 - cx;
    const y = rect.top + rect.height / 2 - cy;
    if (dir === "left" && x >= -8) continue;
    if (dir === "right" && x <= 8) continue;
    if (dir === "up" && y >= -8) continue;
    if (dir === "down" && y <= 8) continue;
    const primary = dir === "left" || dir === "right" ? Math.abs(x) : Math.abs(y);
    const secondary = (dir === "left" || dir === "right" ? Math.abs(y) : Math.abs(x)) * 2.4;
    const score = primary + secondary;
    if (score < bestScore) {
      bestScore = score;
      best = button;
    }
  }
  if (!best) return;
  best.focus();
  best.scrollIntoView({ block: "nearest", inline: "nearest" });
}

function activateFocused() {
  const buttons = menuButtons();
  const current = buttons.includes(document.activeElement) ? document.activeElement : buttons[0];
  current?.click();
}

function goBack() {
  const mode = document.body.dataset.mode;
  if (mode === "select") document.querySelector("#btn-back")?.click();
  else if (mode === "pause") document.querySelector("#btn-resume")?.click();
  else if (mode === "clear") document.querySelector("#btn-clear-select")?.click();
}

window.addEventListener("keydown", (event) => {
  const mode = document.body.dataset.mode;
  if (!mode || mode === "play") return;
  const dir = {
    ArrowLeft: "left",
    ArrowRight: "right",
    ArrowUp: "up",
    ArrowDown: "down",
    KeyA: "left",
    KeyD: "right",
    KeyW: "up",
    KeyS: "down",
  }[event.code];
  if (dir) {
    event.preventDefault();
    moveFocus(dir);
    return;
  }
  if (event.code === "Escape" || event.code === "Backspace") {
    if (mode === "pause") return;
    event.preventDefault();
    goBack();
    return;
  }
  if (event.code === "Enter" || event.code === "Space") {
    if (event.repeat) return;
    event.preventDefault();
    if (menuButtons().includes(document.activeElement)) document.activeElement.click();
    else activateFocused();
  }
});

const padMemory = { buttons: [], dir: "", next: 0 };

function stickDir(pad) {
  if (pad.buttons[12]?.pressed) return "up";
  if (pad.buttons[15]?.pressed) return "right";
  if (pad.buttons[13]?.pressed) return "down";
  if (pad.buttons[14]?.pressed) return "left";
  const x = pad.axes[0] || 0;
  const y = pad.axes[1] || 0;
  if (Math.hypot(x, y) < 0.52) return "";
  if (Math.abs(x) > Math.abs(y)) return x > 0 ? "right" : "left";
  return y > 0 ? "down" : "up";
}

function pollPad(now) {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  let pad = null;
  for (const item of pads) if (item) pad = item;
  if (pad) {
    const pressed = (index) => !!pad.buttons[index]?.pressed;
    const edge = (index) => pressed(index) && !padMemory.buttons[index];
    const mode = document.body.dataset.mode || "title";
    if (mode === "play") {
      const held = [0, 1, 2, 3, 5, 7].some(pressed);
      const was = [0, 1, 2, 3, 5, 7].some((index) => padMemory.buttons[index]);
      game.padJump(held, held && !was);
      if (edge(8) || edge(9)) game.pause();
    } else {
      game.padJump(false, false);
      const dir = stickDir(pad);
      if (dir && (dir !== padMemory.dir || now >= padMemory.next)) {
        moveFocus(dir);
        padMemory.next = now + (dir === padMemory.dir ? 170 : 260);
      }
      if (!dir) padMemory.next = 0;
      padMemory.dir = dir;
      if (edge(0)) activateFocused();
      if (edge(1)) goBack();
      if (edge(9)) {
        if (mode === "pause") game.resume();
        else if (mode === "title") document.querySelector("#btn-start")?.click();
        else if (mode === "clear") document.querySelector("#btn-next")?.click();
      }
      if (edge(8)) goBack();
    }
    padMemory.buttons = pad.buttons.map((button) => button.pressed);
  }
  requestAnimationFrame(pollPad);
}

requestAnimationFrame(pollPad);
