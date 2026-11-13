import { createWorld, tick, GROUND_Y, PLAYER_H, BOUNCE_V } from "../js/sim.js";

const DT = 1 / 60;

function flatStage(speed, extra = {}) {
  return {
    speed,
    solids: [{ id: 1, kind: "ground", x: 0, y: GROUND_Y, w: 30000, h: 500 }],
    hazards: [],
    pickups: [],
    checks: [],
    zones: [],
    goal: { x: 999999 },
    ...extra,
  };
}

function measureJump(speed, hold) {
  const world = createWorld(flatStage(speed));
  const startY = world.player.y;
  let jumped = false;
  let sx = 0;
  let minY = startY;
  let held = 0;
  for (let i = 0; i < 400; i++) {
    const events = tick(
      world,
      { jumpPressed: !jumped, jumpHeld: held < hold },
      DT,
    );
    if (!jumped && events.some((e) => e.type === "jump")) {
      jumped = true;
      sx = world.player.x;
    }
    if (jumped) {
      if (world.player.y < minY) minY = world.player.y;
      if (world.player.onGround && i > 5) {
        return {
          height: Math.round(startY - minY),
          dist: Math.round(world.player.x - sx),
          air: ((i) / 60).toFixed(2),
        };
      }
    }
    held += DT;
  }
  return { height: Math.round(startY - minY), dist: null, air: "timeout" };
}

function measureBounce(speed) {
  const stage = {
    speed,
    solids: [
      { id: 1, kind: "ground", x: 0, y: GROUND_Y, w: 500, h: 500 },
      { id: 2, kind: "bounce", x: 500, y: GROUND_Y, w: 90, h: 22, bounce: true },
      { id: 3, kind: "ground", x: 590, y: GROUND_Y, w: 8000, h: 500 },
    ],
    hazards: [],
    pickups: [],
    checks: [],
    zones: [],
    goal: { x: 999999 },
  };
  const world = createWorld(stage);
  const startY = world.player.y;
  let launched = false;
  let sx = 0;
  let minY = startY;
  for (let i = 0; i < 500; i++) {
    const events = tick(world, { jumpPressed: false, jumpHeld: false }, DT);
    if (!launched && events.some((e) => e.type === "bounce")) {
      launched = true;
      sx = world.player.x;
    }
    if (launched) {
      if (world.player.y < minY) minY = world.player.y;
      if (world.player.onGround) {
        return { height: Math.round(startY - minY), dist: Math.round(world.player.x - sx) };
      }
    }
  }
  return { height: Math.round(startY - minY), dist: null, note: "no land", y: world.player.y, x: world.player.x };
}

console.log("bounceV", BOUNCE_V);
for (const speed of [240, 270, 310, 340]) {
  console.log("\nspeed", speed);
  for (const hold of [0, 0.06, 0.12, 0.2, 0.35, 0.7]) {
    const m = measureJump(speed, hold);
    console.log(`  hold ${hold.toFixed(2)}  h ${m.height}px  dist ${m.dist}px  air ${m.air}`);
  }
  console.log("  bounce", measureBounce(speed));
}

// coyote: run off a ledge and jump late
{
  const stage = {
    speed: 260,
    solids: [
      { id: 1, kind: "ground", x: 0, y: GROUND_Y, w: 600, h: 500 },
      { id: 2, kind: "ground", x: 780, y: GROUND_Y, w: 800, h: 500 },
    ],
    hazards: [],
    pickups: [],
    checks: [],
    zones: [],
    goal: { x: 99999 },
  };
  const world = createWorld(stage);
  let left = false;
  let timer = 0;
  let pressed = false;
  for (let i = 0; i < 400; i++) {
    if (!world.player.onGround && !left) left = true;
    let jump = false;
    if (left) {
      timer += DT;
      if (!pressed && timer >= 0.08) {
        jump = true;
        pressed = true;
      }
    }
    tick(world, { jumpPressed: jump, jumpHeld: jump }, DT);
    if (pressed && world.player.onGround) {
      console.log("\ncoyote land x", Math.round(world.player.x), "alive", world.player.alive);
      break;
    }
    if (!world.player.alive) {
      console.log("\ncoyote died x", Math.round(world.player.x));
      break;
    }
  }
}

// inertia: leave a right-moving platform and see vx after 0.35s
{
  const stage = {
    speed: 250,
    solids: [
      { id: 1, kind: "ground", x: 0, y: GROUND_Y, w: 400, h: 500 },
      {
        id: 2,
        kind: "mover",
        x: 520,
        y: GROUND_Y,
        w: 360,
        h: 22,
        move: { axis: "x", amp: 80, period: 2.2, phase: Math.PI / 2 },
      },
      { id: 3, kind: "ground", x: 1400, y: GROUND_Y, w: 2000, h: 500 },
    ],
    hazards: [],
    pickups: [],
    checks: [],
    zones: [],
    goal: { x: 99999 },
  };
  const world = createWorld(stage);
  let jumped = false;
  let tAfter = 0;
  for (let i = 0; i < 500; i++) {
    const onMover = world.player.platformId === 2 && world.player.onGround;
    const plat = world.solids[1];
    const jump = onMover && plat.vx > 150 && !jumped;
    tick(world, { jumpPressed: jump, jumpHeld: jump || (jumped && tAfter < 0.2) }, DT);
    if (jump) jumped = true;
    if (jumped) {
      tAfter += DT;
      if (tAfter >= 0.35) {
        console.log("inertia vx", Math.round(world.player.vx), "target", stage.speed, "x", Math.round(world.player.x));
        break;
      }
    }
  }
}

function measureDouble(speed, hold, again, hold2) {
  const world = createWorld(flatStage(speed));
  const startY = world.player.y;
  let first = false;
  let second = false;
  let sx = 0;
  let t0 = 0;
  let minY = startY;
  for (let i = 0; i < 500; i++) {
    const t = i * DT;
    let jumpPressed = false;
    let jumpHeld = false;
    if (!first && t >= 0.05) {
      jumpPressed = true;
      first = true;
      t0 = t;
      sx = world.player.x;
    }
    if (first && !second && t < t0 + hold) jumpHeld = true;
    if (first && !second && t >= t0 + again) {
      jumpPressed = true;
      second = true;
      t0 = t;
    }
    if (second && t < t0 + hold2) jumpHeld = true;
    tick(world, { jumpPressed, jumpHeld }, DT);
    if (world.player.y < minY) minY = world.player.y;
    if (second && world.player.onGround && t > t0 + 0.08) {
      return { height: Math.round(startY - minY), dist: Math.round(world.player.x - sx) };
    }
  }
  return { height: Math.round(startY - minY), dist: null };
}

console.log("\ndouble");
for (const speed of [240, 292, 310, 324]) {
  for (const again of [0.2, 0.35, 0.5]) {
    const m = measureDouble(speed, 0.55, again, 0.55);
    console.log(`  v${speed} again ${again} h ${m.height} dist ${m.dist}`);
  }
  const late = measureDouble(speed, 0.12, 0.42, 0.16);
  console.log(`  v${speed} short-then-pop h ${late.height} dist ${late.dist}`);
}
