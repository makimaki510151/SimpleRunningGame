import { createAudio } from "./audio.js";
import { computeLayout, drawFrame } from "./draw.js";
import { createParticles } from "./particles.js";
import { createWorld, GROUND_Y, tick, VIEW_H, VIEW_W } from "./sim.js";
import { createAttractStage, STAGES } from "./stages.js";

const STEP = 1 / 60;

export function createGame(canvas, hooks) {
  const audio = createAudio();
  const particles = createParticles();
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const vis = freshVis();
  let layout = computeLayout(canvas);
  let mode = "title";
  let world = createWorld(createAttractStage());
  let stageIndex = 0;
  let cam = { x: world.player.x - VIEW_W * 0.66, y: -10 };
  let shake = 0;
  let attract = { timer: 0.4, hold: 0, long: false, next: 1.4 };
  let pendingClear = null;
  let confetti = 0;
  const keys = { jump: false };
  let pointerJump = false;
  let padJump = false;
  let jumpPressed = false;
  let sign = null;
  let signUntil = 0;

  function emit(name, detail) {
    hooks[name]?.(detail);
  }

  function freshVis() {
    return {
      phase: 0,
      squash: 1,
      stretch: 1,
      trail: [],
      blink: 1.6,
      blinking: 0,
      step: 0,
      streak: 0,
    };
  }

  function resetVis() {
    const next = freshVis();
    Object.assign(vis, next);
    vis.trail = [];
    particles.clear();
    shake = 0;
    confetti = 0;
  }

  function snapCamera(anchor) {
    const p = world.player;
    cam.x = p.x - VIEW_W * anchor;
    cam.y = clamp(p.y - VIEW_H * 0.62, -150, 36);
  }

  function goAttract(nextMode) {
    world = createWorld(createAttractStage());
    resetVis();
    attract = { timer: 0.2, hold: 0, long: false, next: 1.2 };
    pendingClear = null;
    mode = nextMode;
    snapCamera(0.66);
    emit("onMode", { mode, stage: null, index: -1 });
  }

  function play(index) {
    if (index < 0 || index >= STAGES.length) return;
    audio.unlock();
    stageIndex = index;
    world = createWorld(STAGES[index]);
    resetVis();
    pendingClear = null;
    keys.jump = false;
    pointerJump = false;
    padJump = false;
    jumpPressed = false;
    sign = null;
    signUntil = 0;
    emit("onSign", "");
    mode = "play";
    snapCamera(0.34);
    emit("onMode", { mode, stage: STAGES[index], index });
  }

  function showTitle() {
    if (mode === "title") return;
    if (world.stage.id === 0) {
      mode = "title";
      emit("onMode", { mode, stage: null, index: -1 });
      return;
    }
    goAttract("title");
  }

  function showSelect() {
    if (mode === "play" || mode === "pause" || mode === "clear" || world.stage.id !== 0) {
      goAttract("select");
      return;
    }
    mode = "select";
    emit("onMode", { mode, stage: null, index: -1 });
  }

  function pause() {
    if (mode !== "play") return;
    mode = "pause";
    emit("onMode", { mode, stage: STAGES[stageIndex], index: stageIndex });
  }

  function resume() {
    if (mode !== "pause") return;
    mode = "play";
    keys.jump = false;
    pointerJump = false;
    padJump = false;
    jumpPressed = false;
    emit("onMode", { mode, stage: STAGES[stageIndex], index: stageIndex });
  }

  function padJumpInput(held, pressed) {
    if (mode !== "play") {
      padJump = false;
      return;
    }
    if (pressed) jumpPressed = true;
    padJump = held;
  }

  function next() {
    if (stageIndex + 1 < STAGES.length) play(stageIndex + 1);
    else showSelect();
  }

  function step(dt) {
    if (mode === "pause") return;
    const input = { jumpPressed: false, jumpHeld: false };
    if (mode === "play") {
      input.jumpPressed = jumpPressed;
      input.jumpHeld = keys.jump || pointerJump || padJump;
      jumpPressed = false;
    } else if (mode === "title" || mode === "select") {
      attract.timer += dt;
      if (attract.hold > 0) {
        attract.hold -= dt;
        input.jumpHeld = true;
      }
      if (attract.hold <= 0 && attract.timer >= attract.next) {
        attract.long = !attract.long;
        attract.hold = attract.long ? 0.28 : 0.045;
        attract.next = attract.long ? 2.5 : 2.05;
        attract.timer = 0;
        input.jumpPressed = true;
        input.jumpHeld = true;
      }
    }

    const events = tick(world, input, dt);
    for (const event of events) handleEvent(event);
    updateVis(dt);
    updateCamera(dt);
    updateSign();
    particles.update(dt);

    if (pendingClear && world.winTimer > 0.75 && mode === "play") {
      mode = "clear";
      emit("onMode", {
        mode,
        stage: STAGES[stageIndex],
        index: stageIndex,
        result: pendingClear,
      });
    }
  }

  function handleEvent(event) {
    const palette = world.stage.palette;
    if (event.type === "jump") {
      audio.jump(event.air);
      vis.squash = event.air ? 0.72 : 1.28;
      vis.stretch = event.air ? 1.36 : 0.68;
      if (event.air) {
        particles.spawn({
          shape: "ring",
          x: event.x,
          y: event.y - 8,
          vx: 0,
          vy: 0,
          life: 0.28,
          max: 0.28,
          size: 8,
          color: palette.accent,
          rot: 0,
          vr: 0,
          g: 0,
          grow: 54,
          text: "",
        });
      }
      particles.burst(event.x, event.y, 8, {
        colors: [palette.accent, palette.accent2 || "#fff", "#fff6d4"],
        shapes: ["tri", "diamond", "rect"],
        aim: -Math.PI / 2,
        spread: 1.5,
        speed: 150,
        life: 0.38,
        size: 6,
        g: 280,
      });
    } else if (event.type === "land") {
      audio.land();
      vis.squash = 1.2 + Math.min(0.25, event.impact / 2500);
      vis.stretch = 0.68;
      if (!reduceMotion && event.impact > 700) shake = Math.max(shake, 3);
      particles.burst(event.x, event.y, 8, {
        colors: [palette.soil, palette.plat, palette.ground],
        shapes: ["rect", "diamond"],
        aim: -Math.PI / 2,
        spread: 2.2,
        speed: 80 + Math.min(120, event.impact / 8),
        life: 0.35,
        size: 5,
        g: 500,
      });
      particles.spawn({
        shape: "ring",
        x: event.x,
        y: event.y,
        vx: 0,
        vy: 0,
        life: 0.32,
        max: 0.32,
        size: 6,
        color: palette.ink,
        rot: 0,
        vr: 0,
        g: 0,
        grow: 46,
        text: "",
      });
    } else if (event.type === "bounce") {
      audio.bounce();
      vis.squash = 0.78;
      vis.stretch = 1.34;
      if (!reduceMotion) shake = Math.max(shake, 4);
      particles.burst(event.x, event.y, 12, {
        colors: [palette.accent2 || "#ffe14a", "#fff", palette.accent],
        shapes: ["tri", "diamond"],
        aim: -Math.PI / 2,
        spread: 1.1,
        speed: 220,
        life: 0.45,
        size: 7,
        g: 180,
      });
    } else if (event.type === "fruit") {
      audio.fruit();
      particles.burst(event.x, event.y, 12, {
        colors: [palette.accent, palette.accent2 || "#f2c14a", "#fff"],
        shapes: ["tri", "diamond", "rect"],
        speed: 160,
        life: 0.5,
        size: 7,
        g: 240,
      });
      emit("onFruit", { got: event.got, total: event.total });
    } else if (event.type === "checkpoint") {
      audio.check();
      particles.burst(event.x, event.y - 30, 8, {
        colors: [palette.accent, "#fff"],
        shapes: ["diamond", "tri"],
        aim: -Math.PI / 2,
        spread: 1.4,
        speed: 120,
        life: 0.4,
        size: 6,
        g: 200,
      });
    } else if (event.type === "death") {
      audio.fail();
      if (!reduceMotion) shake = 8;
      particles.burst(event.x, event.y, 18, {
        colors: [palette.accent, palette.spike, "#fff6d4", palette.ink],
        shapes: ["tri", "rect", "diamond"],
        speed: 220,
        life: 0.55,
        size: 7,
        g: 420,
      });
      particles.spawn({
        shape: "text",
        text: "いたっ",
        x: event.x,
        y: event.y - 20,
        vx: 0,
        vy: -36,
        life: 0.7,
        max: 0.7,
        size: 22,
        color: "#4a301c",
        rot: -0.08,
        vr: 0,
        g: 0,
        grow: 0,
        text: "いたっ",
      });
    } else if (event.type === "respawn") {
      vis.squash = 0.55;
      vis.stretch = 1.4;
      vis.trail = [];
    } else if (event.type === "win") {
      audio.win();
      pendingClear = {
        time: event.time,
        fruits: event.fruits,
        total: event.total,
      };
      particles.spawn({
        shape: "text",
        text: "ゴール！",
        x: world.player.x + 20,
        y: world.player.y - 10,
        vx: 18,
        vy: -20,
        life: 0.9,
        max: 0.9,
        size: 26,
        color: palette.accent,
        rot: 0.06,
        vr: 0,
        g: 0,
        grow: 0,
        text: "ゴール！",
      });
    }
  }

  function updateVis(dt) {
    const p = world.player;
    vis.phase += (p.onGround ? Math.abs(p.vx) : 90) * dt / 38;
    vis.blink -= dt;
    if (vis.blink <= 0) {
      vis.blinking = 0.1;
      vis.blink = 2 + Math.random() * 2.6;
    }
    if (vis.blinking > 0) vis.blinking -= dt;

    let targetX = 1;
    let targetY = 1;
    if (!p.alive) {
      targetX = 1.25;
      targetY = 0.75;
    } else if (!p.onGround && p.vy < -80) {
      targetX = 0.84;
      targetY = 1.18 + Math.min(0.12, p.holdTime);
    } else if (!p.onGround && p.vy > 160) {
      targetX = 1.08;
      targetY = 0.9;
    } else if (p.onGround) {
      const wave = Math.sin(vis.phase * Math.PI * 2);
      targetX = 1 + wave * 0.04;
      targetY = 1 - wave * 0.055;
    }
    const k = Math.min(1, dt * 14);
    vis.squash += (targetX - vis.squash) * k;
    vis.stretch += (targetY - vis.stretch) * k;

    const headX = p.x + p.w / 2;
    const headY = p.y + 2;
    if (vis.trail.length !== 4) {
      vis.trail = Array.from({ length: 4 }, () => ({ x: headX, y: headY }));
    }
    let prevX = headX;
    let prevY = headY;
    for (let i = 0; i < vis.trail.length; i++) {
      const pt = vis.trail[i];
      const follow = Math.min(1, dt * 28);
      pt.x += (prevX - pt.x) * follow;
      pt.y += (prevY - pt.y) * follow;
      const dx = pt.x - prevX;
      const dy = pt.y - prevY;
      const dist = Math.hypot(dx, dy);
      const limit = 5;
      if (dist > limit) {
        pt.x = prevX + (dx / dist) * limit;
        pt.y = prevY + (dy / dist) * limit;
      }
      prevX = pt.x;
      prevY = pt.y;
    }

    const palette = world.stage.palette;
    if (p.onGround && p.alive && !p.won) {
      vis.step += Math.abs(p.vx) * dt;
      if (vis.step > 34) {
        vis.step = 0;
        particles.burst(p.x + 6, p.y + p.h - 2, 3, {
          colors: [palette.soil, palette.platTop || "#fff"],
          shapes: ["rect", "diamond"],
          aim: Math.PI,
          spread: 0.9,
          speed: 46,
          life: 0.26,
          size: 4,
          g: 220,
        });
      }
    }
    if (p.alive && p.vx > world.stage.speed + 80) {
      vis.streak -= dt;
      if (vis.streak <= 0) {
        vis.streak = 0.045;
        particles.spawn({
          shape: "line",
          x: p.x - 6,
          y: p.y + 8 + Math.random() * 26,
          vx: -30,
          vy: 0,
          life: 0.16,
          max: 0.16,
          size: 12,
          color: palette.accent,
          rot: 0,
          vr: 0,
          g: 0,
          grow: 8,
          text: "",
        });
      }
    }
    if (p.won && world.winTimer < 2.6) {
      confetti -= dt;
      if (confetti <= 0) {
        confetti = 0.05;
        particles.burst(p.x + p.w / 2, p.y, 5, {
          colors: ["#ef6b6b", "#f2b544", "#ffe56a", "#7dce72", "#6eb7e8", "#fff"],
          shapes: ["tri", "rect", "diamond"],
          speed: 180,
          life: 0.8,
          size: 7,
          g: 220,
          aim: -Math.PI / 2,
          spread: 2.4,
        });
      }
    }
    if (shake > 0) shake = Math.max(0, shake - dt * 14);
  }

  function updateSign() {
    if (mode !== "play") {
      if (sign) {
        sign = null;
        emit("onSign", "");
      }
      return;
    }
    const px = world.player.x;
    let candidate = null;
    for (const hint of world.stage.hints || []) {
      if (px > hint.x - 620 && px < hint.x + 36) {
        candidate = hint;
        break;
      }
    }
    if (candidate && candidate !== sign) {
      sign = candidate;
      signUntil = world.elapsed + 3.1;
      emit("onSign", candidate.text);
    } else if (sign && world.elapsed > signUntil && px > sign.x + 90) {
      sign = null;
      emit("onSign", "");
    }
  }

  function updateCamera(dt) {
    const p = world.player;
    const anchor = mode === "play" || mode === "pause" || mode === "clear" ? 0.34 : 0.66;
    const extra = (p.vx - world.stage.speed) * 0.1;
    const targetX = p.x - VIEW_W * anchor + extra;
    const targetY = clamp(p.y - VIEW_H * 0.62, -150, 36);
    const blend = 1 - Math.exp(-3.4 * dt);
    cam.x += (targetX - cam.x) * blend;
    cam.y += (targetY - cam.y) * blend;
    const minX = -40;
    if (cam.x < minX) cam.x = minX;
  }

  function frame(now) {
    if (!frame.last) frame.last = now;
    let acc = Math.min(0.05, (now - frame.last) / 1000);
    frame.last = now;
    frame.acc = (frame.acc || 0) + acc;
    while (frame.acc >= STEP) {
      step(STEP);
      frame.acc -= STEP;
    }
    audio.pump();
    drawFrame(canvas.getContext("2d"), world, cam, layout, vis, particles, shake);
    requestAnimationFrame(frame);
  }

  window.addEventListener("resize", () => {
    layout = computeLayout(canvas);
  });

  window.addEventListener("keydown", (event) => {
    if (event.code === "Escape") {
      if (mode === "play") pause();
      else if (mode === "pause") resume();
      return;
    }
    if (!isJumpCode(event.code)) return;
    if (mode !== "play") return;
    event.preventDefault();
    if (!event.repeat && !keys.jump) jumpPressed = true;
    keys.jump = true;
  });

  window.addEventListener("keyup", (event) => {
    if (isJumpCode(event.code)) keys.jump = false;
  });

  window.addEventListener("blur", () => {
    keys.jump = false;
    pointerJump = false;
  });

  window.addEventListener("pointerdown", (event) => {
    if (event.button != null && event.button !== 0) return;
    audio.unlock();
    if (event.target.closest("button, a, input, .sheet, .board, .panel")) return;
    if (mode !== "play") return;
    pointerJump = true;
    jumpPressed = true;
  });

  window.addEventListener("pointerup", () => {
    pointerJump = false;
  });
  window.addEventListener("pointercancel", () => {
    pointerJump = false;
  });

  snapCamera(0.66);
  emit("onMode", { mode: "title", stage: null, index: -1 });
  requestAnimationFrame(frame);

  return {
    audio,
    play,
    padJump: padJumpInput,
    showTitle,
    showSelect,
    pause,
    resume,
    next,
    stageCount: STAGES.length,
  };
}

function isJumpCode(code) {
  return code === "Space" || code === "ArrowUp" || code === "KeyW" || code === "KeyZ" || code === "KeyK";
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export { GROUND_Y };
