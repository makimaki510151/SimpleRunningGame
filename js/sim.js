// ポヨランの物理。描画を持たないので、ブラウザでも自動チェックでも同じ結果になる。
// ジャンプの高さは「押しているあいだだけ上昇がゆるい」ことと、
// 離した瞬間に上昇速度を切ることで決まる。長押しほど高く、タップは小さく跳ぶ。

export const GROUND_Y = 408;
export const VIEW_W = 960;
export const VIEW_H = 540;
export const PLAYER_W = 34;
export const PLAYER_H = 44;
export const DEATH_Y = 700;
export const FOOT = 8;

export const GRAVITY_HOLD = 2050;
export const GRAVITY_RELEASE = 3900;
export const GRAVITY_FALL = 3050;
export const GRAVITY_APEX = 900;
export const GRAVITY_BOUNCE = 2350;
export const APEX_BAND = 130;

export const JUMP_V = -860;
export const AIR_JUMP_V = -860;
export const JUMP_CUT = -500;
export const BOUNCE_V = -1040;

export const COYOTE = 0.12;
export const BUFFER = 0.12;
export const GROUND_ACCEL = 820;
export const AIR_ACCEL = 190;

const STEP_SNAP = 10;

export function createWorld(stage, opts = {}) {
  const solids = stage.solids.map((s, i) => ({
    id: s.id ?? i + 1,
    kind: s.kind || "plat",
    x: s.x,
    y: s.y,
    w: s.w,
    h: s.h ?? (s.kind === "ground" ? 560 : 22),
    baseX: s.x,
    baseY: s.y,
    bounce: !!s.bounce,
    crumble: !!s.crumble,
    delay: s.delay ?? 0.5,
    move: s.move ? { ...s.move } : null,
    dx: 0,
    dy: 0,
    vx: 0,
    vy: 0,
    armed: false,
    crumbleT: 0,
    fallY: 0,
    fallV: 0,
    fallen: false,
  }));

  const hazards = (stage.hazards || []).map((h) => ({
    ...h,
    baseX: h.x,
    baseY: h.y,
    move: h.move ? { ...h.move } : null,
  }));

  const world = {
    stage,
    t: 0,
    elapsed: 0,
    solids,
    hazards,
    pickups: (stage.pickups || []).map((p) => ({ r: 13, ...p, got: false })),
    checks: (stage.checks || []).map((c) => ({ ...c, got: false })),
    fruitsGot: 0,
    deadTimer: 0,
    winTimer: 0,
    spawn: null,
    player: null,
  };

  placeMovers(world, true);

  const spawnX = opts.x ?? 88;
  const solid = supportNear(world, spawnX + PLAYER_W * 0.5, opts.surface ?? GROUND_Y);
  const y = (solid ? solid.y : GROUND_Y) - PLAYER_H;
  world.player = {
    x: spawnX,
    y,
    w: PLAYER_W,
    h: PLAYER_H,
    vx: stage.speed,
    vy: 0,
    onGround: !!solid,
    platformId: solid ? solid.id : null,
    coyote: 0,
    buffer: 0,
    holding: false,
    canCut: false,
    holdTime: 0,
    alive: true,
    won: false,
    invuln: 0,
    rideVx: 0,
    rideVy: 0,
    airJumps: 1,
  };
  world.spawn = { x: spawnX, y, solidId: solid ? solid.id : null };
  return world;
}

export function cloneWorld(world) {
  return {
    stage: world.stage,
    t: world.t,
    elapsed: world.elapsed,
    solids: world.solids.map((s) => ({ ...s })),
    hazards: world.hazards.map((h) => ({ ...h })),
    pickups: world.pickups.map((p) => ({ ...p })),
    checks: world.checks.map((c) => ({ ...c })),
    fruitsGot: world.fruitsGot,
    deadTimer: world.deadTimer,
    winTimer: world.winTimer,
    spawn: { ...world.spawn },
    player: { ...world.player },
  };
}

export function targetSpeed(world, x) {
  let speed = world.stage.speed;
  for (const zone of world.stage.zones || []) {
    if (x >= zone.x && x <= zone.x + zone.w) speed += zone.force;
  }
  if (speed < 80) speed = 80;
  if (speed > 680) speed = 680;
  return speed;
}

export function tick(world, input, dt) {
  const events = [];
  dt = Math.min(dt, 0.034);
  const p = world.player;

  if (!p.alive) {
    world.deadTimer -= dt;
    if (world.deadTimer <= 0) respawn(world, events);
    return events;
  }

  if (p.won && p.onGround) {
    p.vx = 0;
    p.vy = 0;
    world.winTimer += dt;
    return events;
  }

  world.t += dt;
  world.elapsed += dt;
  if (p.invuln > 0) p.invuln -= dt;

  placeMovers(world, false, dt);

  if (input.jumpPressed) p.buffer = BUFFER;
  else p.buffer = Math.max(0, p.buffer - dt);

  const wasOnGround = p.onGround;
  if (wasOnGround) {
    const plat = byId(world, p.platformId);
    if (plat && isSupport(plat)) {
      p.x += plat.dx;
      p.y += plat.dy;
      p.rideVx = plat.vx;
      p.rideVy = plat.vy;
    } else {
      leaveGround(p, COYOTE);
    }
  }

  const canJump = p.onGround || p.coyote > 0;
  if (!p.won && p.buffer > 0 && canJump) {
    const inheritedX = p.onGround ? p.rideVx : 0;
    const inheritedY = p.onGround ? p.rideVy : 0;
    p.vx += inheritedX;
    p.vy = JUMP_V + inheritedY * 0.9;
    p.onGround = false;
    p.platformId = null;
    p.coyote = 0;
    p.buffer = 0;
    p.holding = !!input.jumpHeld;
    p.canCut = true;
    p.holdTime = 0;
    p.rideVx = 0;
    p.rideVy = 0;
    p.airJumps = 1;
    events.push({ type: "jump", air: false, x: p.x + p.w * 0.5, y: p.y + p.h });
  } else if (!p.won && p.buffer > 0 && p.airJumps > 0) {
    p.airJumps -= 1;
    p.vy = AIR_JUMP_V;
    p.holding = !!input.jumpHeld;
    p.canCut = true;
    p.holdTime = 0;
    p.buffer = 0;
    p.coyote = 0;
    events.push({ type: "jump", air: true, x: p.x + p.w * 0.5, y: p.y + p.h });
  }

  if (!input.jumpHeld) p.holding = false;
  if (p.holding && p.vy < 0) p.holdTime += dt;

  const target = targetSpeed(world, p.x + p.w * 0.5);

  if (p.onGround) {
    p.vx = approach(p.vx, target, GROUND_ACCEL * dt);
    p.x += p.vx * dt;
    const stand = findStand(world, p);
    if (stand && stand.bounce) {
      launchBounce(world, p, stand, events);
    } else if (stand) {
      if (stand.crumble && !stand.armed) {
        stand.armed = true;
        stand.crumbleT = 0;
      }
      p.platformId = stand.id;
      p.y = stand.y - p.h;
      p.vy = 0;
      p.onGround = true;
      p.coyote = 0;
      p.canCut = false;
      p.airJumps = 1;
      p.rideVx = stand.vx;
      p.rideVy = stand.vy;
    } else {
      leaveGround(p, COYOTE);
    }
  } else {
    applyGravity(p, dt);
    p.vx = approach(p.vx, target, AIR_ACCEL * dt);
    const prevY = p.y;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    resolveLanding(world, p, prevY, events);
    if (!p.onGround) p.coyote = Math.max(0, p.coyote - dt);
  }

  if (!p.alive) return events;

  if (!p.won && p.y > DEATH_Y) {
    kill(world, events);
    return events;
  }

  if (!p.won && p.invuln <= 0 && overlapsHazard(world, p)) {
    kill(world, events);
    return events;
  }

  for (const fruit of world.pickups) {
    if (fruit.got) continue;
    if (circleHits(fruit.x, fruit.y, fruit.r, p.x - 2, p.y - 6, p.w + 4, p.h + 8)) {
      fruit.got = true;
      world.fruitsGot += 1;
      events.push({
        type: "fruit",
        x: fruit.x,
        y: fruit.y,
        got: world.fruitsGot,
        total: world.pickups.length,
      });
    }
  }

  for (const check of world.checks) {
    if (check.got) continue;
    const center = p.x + p.w * 0.5;
    if (center >= check.x && p.onGround && p.y + p.h <= check.y + 24) {
      check.got = true;
      const stand = supportNear(world, center, check.y);
      world.spawn = {
        x: Math.max(check.x - 6, stand ? stand.x + 6 : check.x),
        y: (stand ? stand.y : check.y) - p.h,
        solidId: stand ? stand.id : null,
      };
      events.push({ type: "checkpoint", x: check.x, y: check.y });
    }
  }

  const goal = world.stage.goal;
  if (
    !p.won &&
    p.onGround &&
    p.x + p.w * 0.5 >= goal.x &&
    p.y + p.h <= (goal.y ?? GROUND_Y) + 48
  ) {
    p.won = true;
    p.vx = 0;
    p.vy = 0;
    events.push({
      type: "win",
      time: world.elapsed,
      fruits: world.fruitsGot,
      total: world.pickups.length,
    });
  }

  return events;
}

function leaveGround(p, coyote) {
  p.onGround = false;
  p.vx += p.rideVx;
  p.platformId = null;
  p.coyote = coyote;
  p.rideVx = 0;
  p.rideVy = 0;
}

function launchBounce(world, p, stand, events) {
  if (stand.crumble && !stand.armed) {
    stand.armed = true;
    stand.crumbleT = 0;
  }
  p.vx += stand.vx;
  p.vy = BOUNCE_V + Math.min(0, stand.vy) * 0.7;
  p.onGround = false;
  p.platformId = null;
  p.holding = false;
  p.canCut = false;
  p.holdTime = 0;
  p.coyote = 0;
  p.airJumps = 1;
  p.rideVx = 0;
  p.rideVy = 0;
  p.y = stand.y - p.h - 1;
  events.push({ type: "bounce", x: p.x + p.w * 0.5, y: stand.y });
}

function applyGravity(p, dt) {
  let g;
  if (p.vy < 0 && Math.abs(p.vy) < APEX_BAND) g = GRAVITY_APEX;
  else if (p.vy < 0 && p.holding) g = GRAVITY_HOLD;
  else if (p.vy < 0 && p.canCut) {
    if (p.vy < JUMP_CUT) p.vy = JUMP_CUT;
    g = GRAVITY_RELEASE;
  } else if (p.vy < 0) g = GRAVITY_BOUNCE;
  else g = GRAVITY_FALL;
  p.vy += g * dt;
  if (p.vy > 1480) p.vy = 1480;
}

function resolveLanding(world, p, prevY, events) {
  if (p.vy < 0) return;
  const prevBottom = prevY + p.h;
  const bottom = p.y + p.h;
  const footL = p.x + FOOT;
  const footR = p.x + p.w - FOOT;
  let best = null;
  for (const solid of world.solids) {
    if (!isSupport(solid)) continue;
    if (footR <= solid.x || footL >= solid.x + solid.w) continue;
    const top = solid.y;
    if (prevBottom <= top + STEP_SNAP && bottom >= top - 1) {
      if (!best || top < best.y - 0.5 || (solid.bounce && !best.bounce && Math.abs(top - best.y) <= STEP_SNAP)) {
      best = solid;
    }
    }
  }
  if (!best) {
    p.onGround = false;
    p.platformId = null;
    return;
  }
  p.y = best.y - p.h;
  if (best.bounce) {
    launchBounce(world, p, best, events);
    return;
  }
  const impact = p.vy;
  p.vy = 0;
  p.onGround = true;
  p.platformId = best.id;
  p.canCut = false;
  p.holding = false;
  p.coyote = 0;
  p.airJumps = 1;
  p.rideVx = best.vx;
  p.rideVy = best.vy;
  if (best.crumble && !best.armed) {
    best.armed = true;
    best.crumbleT = 0;
  }
  if (impact > 220) {
    events.push({ type: "land", x: p.x + p.w * 0.5, y: best.y, impact, holdTime: p.holdTime });
  }
}

function findStand(world, p) {
  const footL = p.x + FOOT;
  const footR = p.x + p.w - FOOT;
  const feet = p.y + p.h;
  const hits = [];
  for (const solid of world.solids) {
    if (!isSupport(solid)) continue;
    if (footR <= solid.x || footL >= solid.x + solid.w) continue;
    if (Math.abs(solid.y - feet) > STEP_SNAP) continue;
    hits.push(solid);
  }
  if (!hits.length) return null;
  const pad = hits.find((solid) => solid.bounce);
  if (pad) return pad;
  hits.sort((a, b) => a.y - b.y);
  return hits[0];
}

function supportNear(world, x, surfaceY) {
  let best = null;
  let bestD = Infinity;
  for (const solid of world.solids) {
    if (!isSupport(solid)) continue;
    if (x < solid.x || x > solid.x + solid.w) continue;
    const d = Math.abs(solid.y - surfaceY);
    if (d < bestD) {
      bestD = d;
      best = solid;
    }
  }
  return bestD <= 30 ? best : null;
}

function placeMovers(world, init, dt = 0) {
  for (const solid of world.solids) {
    const prevX = solid.x;
    const prevY = solid.y;
    if (!init && solid.crumble && solid.armed && !solid.fallen) {
      solid.crumbleT += dt;
      if (solid.crumbleT >= solid.delay) solid.fallen = true;
    }
    let x = solid.baseX;
    let y = solid.baseY;
    let vx = 0;
    let vy = 0;
    if (solid.move && !solid.fallen) {
      const sampled = sampleMove(solid.baseX, solid.baseY, solid.move, world.t);
      x = sampled.x;
      y = sampled.y;
      vx = sampled.vx;
      vy = sampled.vy;
    }
    if (solid.fallen) {
      solid.fallV += 2500 * dt;
      solid.fallY += solid.fallV * dt;
      y = solid.baseY + solid.fallY;
      vy = solid.fallV;
    }
    solid.x = x;
    solid.y = y;
    solid.vx = vx;
    solid.vy = vy;
    solid.dx = init ? 0 : solid.x - prevX;
    solid.dy = init ? 0 : solid.y - prevY;
  }

  for (const hazard of world.hazards) {
    if (hazard.kind === "pendulum") {
      const bob = samplePendulum(hazard, world.t);
      hazard.ang = bob.ang;
      hazard.bx = bob.x;
      hazard.by = bob.y;
    } else if (hazard.kind === "saw" && hazard.move) {
      const sampled = sampleMove(hazard.baseX, hazard.baseY, hazard.move, world.t);
      hazard.x = sampled.x;
      hazard.y = sampled.y;
    }
  }
}

export function sampleMove(baseX, baseY, move, t) {
  const omega = (Math.PI * 2) / move.period;
  const phase = omega * t + (move.phase || 0);
  const along = Math.sin(phase) * move.amp;
  const vel = Math.cos(phase) * omega * move.amp;
  if (move.axis === "y") return { x: baseX, y: baseY + along, vx: 0, vy: vel };
  return { x: baseX + along, y: baseY, vx: vel, vy: 0 };
}

export function samplePendulum(hazard, t) {
  const omega = (Math.PI * 2) / hazard.period;
  const ang = Math.sin(omega * t + (hazard.phase || 0)) * hazard.amp;
  return {
    ang,
    x: hazard.x + Math.sin(ang) * hazard.len,
    y: hazard.y + Math.cos(ang) * hazard.len,
  };
}

function respawn(world, events) {
  for (const solid of world.solids) {
    if (!solid.crumble) continue;
    solid.armed = false;
    solid.crumbleT = 0;
    solid.fallY = 0;
    solid.fallV = 0;
    solid.fallen = false;
  }
  placeMovers(world, true, 0);
  const p = world.player;
  p.x = world.spawn.x;
  p.y = world.spawn.y;
  p.vx = world.stage.speed;
  p.vy = 0;
  p.onGround = true;
  p.platformId = world.spawn.solidId;
  p.coyote = 0;
  p.buffer = 0;
  p.holding = false;
  p.canCut = false;
  p.holdTime = 0;
  p.alive = true;
  p.invuln = 0.7;
  p.rideVx = 0;
  p.rideVy = 0;
  p.airJumps = 1;
  events.push({ type: "respawn", x: p.x, y: p.y });
}

function kill(world, events) {
  const p = world.player;
  if (!p.alive || p.won) return;
  p.alive = false;
  p.onGround = false;
  world.deadTimer = 0.46;
  events.push({ type: "death", x: p.x + p.w * 0.5, y: p.y + p.h * 0.4 });
}

function overlapsHazard(world, p) {
  const x = p.x + 8;
  const y = p.y + 10;
  const w = p.w - 16;
  const h = p.h - 14;
  for (const hazard of world.hazards) {
    if (hazard.kind === "spike") {
      const box = spikeBox(hazard);
      if (overlap(x, y, w, h, box.x, box.y, box.w, box.h)) return true;
    } else if (hazard.kind === "pendulum") {
      if (circleHits(hazard.bx, hazard.by, hazard.r ?? 15, x, y, w, h)) return true;
    } else if (hazard.kind === "saw") {
      const r = hazard.r ?? Math.min(hazard.w, hazard.h) * 0.46;
      if (circleHits(hazard.x + hazard.w / 2, hazard.y + hazard.h / 2, r, x, y, w, h)) return true;
    }
  }
  return false;
}

function spikeBox(hazard) {
  if (hazard.dir === "down") {
    return { x: hazard.x + 4, y: hazard.y + 3, w: hazard.w - 8, h: hazard.h - 6 };
  }
  return { x: hazard.x + 4, y: hazard.y - hazard.h + 6, w: hazard.w - 8, h: hazard.h - 8 };
}

function byId(world, id) {
  if (id == null) return null;
  for (const solid of world.solids) if (solid.id === id) return solid;
  return null;
}

function isSupport(solid) {
  return !solid.fallen;
}

function approach(value, target, maxDelta) {
  const delta = target - value;
  if (Math.abs(delta) <= maxDelta) return target;
  return value + Math.sign(delta) * maxDelta;
}

function overlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function circleHits(cx, cy, r, x, y, w, h) {
  const nx = Math.max(x, Math.min(cx, x + w));
  const ny = Math.max(y, Math.min(cy, y + h));
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy <= r * r;
}
