import { GROUND_Y, VIEW_H, VIEW_W } from "./sim.js";

const RAINBOW = ["#ef6b6b", "#f2a03a", "#ffe56a", "#7dce72", "#6eb7e8"];

export function computeLayout(canvas) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cssW = window.innerWidth;
  const cssH = window.innerHeight;
  canvas.width = Math.max(1, Math.round(cssW * dpr));
  canvas.height = Math.max(1, Math.round(cssH * dpr));
  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${cssH}px`;
  const scale = Math.min(cssW / VIEW_W, cssH / VIEW_H);
  return {
    dpr,
    cssW,
    cssH,
    scale,
    ox: (cssW - VIEW_W * scale) / 2,
    oy: (cssH - VIEW_H * scale) / 2,
  };
}

export function drawFrame(ctx, world, cam, layout, vis, particles, shake) {
  const { dpr, cssW, cssH, scale, ox, oy } = layout;
  const palette = world.stage.palette;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const sky = ctx.createLinearGradient(0, 0, 0, cssH);
  sky.addColorStop(0, palette.skyTop);
  sky.addColorStop(1, palette.skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, cssW, cssH);

  ctx.save();
  ctx.translate(ox, oy);
  ctx.scale(scale, scale);
  ctx.beginPath();
  ctx.rect(0, 0, VIEW_W, VIEW_H);
  ctx.clip();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  const sx = shake ? Math.sin(vis.phase * 40) * shake : 0;
  const sy = shake ? Math.cos(vis.phase * 33) * shake * 0.6 : 0;
  drawBackdrop(ctx, world, cam, palette);
  ctx.save();
  const snap = scale * dpr;
  ctx.translate(
    Math.round((-cam.x + sx) * snap) / snap,
    Math.round((-cam.y + sy) * snap) / snap,
  );
  drawPit(ctx, world, cam, palette);
  drawWind(ctx, world, palette);
  drawSolids(ctx, world, cam, palette);
  drawProps(ctx, world, cam, palette);
  drawHazards(ctx, world, cam, palette);
  drawFruits(ctx, world, palette);
  drawChecks(ctx, world, palette);
  drawGoal(ctx, world, palette);
  drawHints(ctx, world, cam, palette);
  particles.draw(ctx);
  drawPoyo(ctx, world, vis);
  ctx.restore();
  ctx.restore();
}

function drawBackdrop(ctx, world, cam, palette) {
  const t = world.t;
  const dress = world.stage.dress;
  if (dress === "stars") {
    ctx.fillStyle = palette.sun;
    ctx.beginPath();
    ctx.arc(VIEW_W - 130, 78, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = palette.skyTop;
    ctx.beginPath();
    ctx.arc(VIEW_W - 118, 70, 24, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = palette.sun;
    ctx.beginPath();
    ctx.arc(VIEW_W - 120, 84, 36, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = palette.accent2 || palette.sun;
    ctx.globalAlpha = 0.7;
    ctx.lineWidth = 3;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + t * 0.15;
      ctx.beginPath();
      ctx.moveTo(VIEW_W - 120 + Math.cos(a) * 46, 84 + Math.sin(a) * 46);
      ctx.lineTo(VIEW_W - 120 + Math.cos(a) * 58, 84 + Math.sin(a) * 58);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  const scene = world.stage.scenery;
  drawHillLayer(ctx, scene.hillsFar, cam, 0.18, palette.hillFar);
  if (dress === "bamboo") drawStalks(ctx, scene.stalks, cam, palette);
  drawClouds(ctx, scene.clouds, cam, t, palette);
  drawMotes(ctx, scene.motes, cam, t, palette);
  drawHillLayer(ctx, scene.hillsMid, cam, 0.38, palette.hillMid);
  if (dress === "rainbow") drawRainbows(ctx, scene.rainbows, cam);
}

function drawHillLayer(ctx, hills, cam, parallax, color) {
  ctx.save();
  ctx.translate(-cam.x * parallax, -cam.y * 0.12);
  ctx.fillStyle = color;
  for (const hill of hills) {
    if (hill.x + hill.r < cam.x * parallax - 20) continue;
    if (hill.x - hill.r > cam.x * parallax + VIEW_W + 20) continue;
    ctx.beginPath();
    ctx.arc(hill.x, hill.y, hill.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawClouds(ctx, clouds, cam, t, palette) {
  for (const cloud of clouds) {
    const x = cloud.x - cam.x * cloud.p;
    if (x < -160 || x > VIEW_W + 160) continue;
    const y = cloud.y - cam.y * 0.05 + Math.sin(t * 0.4 + cloud.x) * 3;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(cloud.s, cloud.s);
    ctx.fillStyle = palette.cloud;
    ctx.strokeStyle = palette.rim || palette.ink;
    ctx.lineWidth = 2.5;
    ctx.globalAlpha = 0.92;
    blob(ctx, 0, 0, 28);
    blob(ctx, -24, 6, 18);
    blob(ctx, 26, 8, 20);
    ctx.restore();
  }
}

function blob(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function drawMotes(ctx, motes, cam, t, palette) {
  ctx.fillStyle = palette.mote;
  for (const mote of motes) {
    const x = mote.x - cam.x * mote.p;
    const y = mote.y - cam.y * 0.08 + Math.sin(t * 0.8 + mote.rot) * 8;
    if (x < -20 || x > VIEW_W + 20) continue;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(mote.rot + t * 0.4);
    ctx.globalAlpha = 0.75;
    traceShape(ctx, mote.shape, mote.s);
    ctx.fill();
    ctx.restore();
  }
}

function drawStalks(ctx, stalks, cam, palette) {
  ctx.save();
  ctx.translate(-cam.x * 0.28, -cam.y * 0.1);
  for (const stalk of stalks) {
    const x = stalk.x;
    if (x < cam.x * 0.28 - 40 || x > cam.x * 0.28 + VIEW_W + 40) continue;
    ctx.save();
    ctx.translate(x, GROUND_Y + 10);
    ctx.rotate(stalk.lean || 0);
    ctx.fillStyle = palette.plat;
    ctx.strokeStyle = palette.ink;
    ctx.lineWidth = 2;
    pathRound(ctx, -5, -stalk.h, 10, stalk.h, 5);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = palette.groundDeep;
    ctx.lineWidth = 1.5;
    for (let y = -stalk.h + 28; y < -8; y += 34) {
      ctx.beginPath();
      ctx.moveTo(-5, y);
      ctx.lineTo(5, y);
      ctx.stroke();
    }
    ctx.restore();
  }
  ctx.restore();
}

function drawRainbows(ctx, rainbows, cam) {
  for (const bow of rainbows) {
    const x = bow.x - cam.x * 0.2;
    const y = bow.y - cam.y * 0.05;
    if (x < -300 || x > VIEW_W + 300) continue;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(bow.s, bow.s);
    ctx.lineCap = "round";
    RAINBOW.forEach((color, index) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 8;
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.arc(0, 40, 78 - index * 10, Math.PI, 0);
      ctx.stroke();
    });
    ctx.restore();
  }
}

function drawPit(ctx, world, cam, palette) {
  const left = cam.x - 40;
  const right = cam.x + VIEW_W + 40;
  const top = GROUND_Y + 8;
  const shade = ctx.createLinearGradient(0, top, 0, top + 260);
  shade.addColorStop(0, palette.water || palette.pit);
  shade.addColorStop(1, palette.water ? "#1a5870" : "#3a2618");
  ctx.fillStyle = shade;
  ctx.fillRect(left, top, right - left, 360);
  if (!palette.water) return;
  ctx.beginPath();
  ctx.moveTo(left, top);
  for (let x = left; x <= right; x += 16) {
    ctx.lineTo(x, top + Math.sin(x * 0.04 + world.t * 2.2) * 4);
  }
  ctx.lineTo(right, top + 28);
  ctx.lineTo(left, top + 28);
  ctx.closePath();
  ctx.fillStyle = "rgba(255,255,255,0.28)";
  ctx.fill();
}

function drawWind(ctx, world, palette) {
  for (const zone of world.stage.zones || []) {
    const tail = zone.force >= 0;
    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = tail ? palette.accent : palette.ink;
    ctx.fillStyle = tail ? palette.accent : palette.ink;
    ctx.lineWidth = 3;
    for (let i = 0; i < 5; i++) {
      const span = zone.w + 80;
      const shift = ((world.t * (tail ? 180 : -120) + i * 90) % span);
      const x = zone.x - 40 + (tail ? shift : span - shift);
      const y = 180 + i * 38;
      if (x < zone.x - 20 || x > zone.x + zone.w) continue;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (tail ? 28 : -28), y);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawSolids(ctx, world, cam, palette) {
  for (const solid of world.solids) {
    if (solid.x + solid.w < cam.x - 30 || solid.x > cam.x + VIEW_W + 30) continue;
    if (solid.kind === "ground") drawGround(ctx, solid, cam, palette);
    else drawPlatform(ctx, solid, world.t, palette);
  }
}

function groundTop(x, y) {
  return y + Math.sin(x * 0.07) * 3;
}

function groundPoints(x0, x1, y) {
  const step = 14;
  const points = [x0];
  const start = Math.ceil((x0 + 0.01) / step) * step;
  for (let x = start; x < x1 - 0.5; x += step) points.push(x);
  if (points[points.length - 1] !== x1) points.push(x1);
  return points.map((x) => ({ x, y: groundTop(x, y) }));
}

function drawGround(ctx, solid, cam, palette) {
  const y = solid.y;
  const x0 = Math.max(solid.x, cam.x - 40);
  const x1 = Math.min(solid.x + solid.w, cam.x + VIEW_W + 40);
  if (x1 <= x0) return;
  const top = groundPoints(x0, x1, y);
  const rightLip = x1 >= solid.x + solid.w - 0.01;
  const leftLip = x0 <= solid.x + 0.01;

  ctx.beginPath();
  ctx.moveTo(top[0].x, top[0].y);
  for (let i = 1; i < top.length; i++) ctx.lineTo(top[i].x, top[i].y);
  ctx.lineTo(x1, y + 220);
  ctx.lineTo(x0, y + 220);
  ctx.closePath();
  ctx.fillStyle = palette.ground;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = palette.soil;
  ctx.fillRect(x0, y + 8, x1 - x0, 16);
  ctx.fillStyle = palette.groundDeep;
  ctx.fillRect(x0, y + 24, x1 - x0, 200);
  ctx.restore();

  ctx.beginPath();
  ctx.moveTo(top[0].x, top[0].y);
  for (let i = 1; i < top.length; i++) ctx.lineTo(top[i].x, top[i].y);
  ctx.strokeStyle = palette.rim || palette.ink;
  ctx.lineWidth = 3.5;
  ctx.stroke();

  ctx.lineWidth = 3.5;
  ctx.strokeStyle = palette.rim || palette.ink;
  ctx.fillStyle = palette.soil;
  if (rightLip) {
    const lip = top[top.length - 1].y;
    ctx.fillRect(x1 - 12, lip, 12, 56);
    ctx.beginPath();
    ctx.moveTo(x1, lip);
    ctx.lineTo(x1, lip + 64);
    ctx.stroke();
  }
  if (leftLip) {
    const lip = top[0].y;
    ctx.fillRect(x0, lip, 12, 56);
    ctx.beginPath();
    ctx.moveTo(x0, lip);
    ctx.lineTo(x0, lip + 64);
    ctx.stroke();
  }
}

function drawPlatform(ctx, solid, t, palette) {
  let x = solid.x;
  const y = solid.y;
  if (solid.crumble && solid.armed && !solid.fallen) {
    x += Math.sin(t * 46) * Math.min(3.5, solid.crumbleT * 9);
  }
  const bounce = solid.bounce;
  const color = bounce ? palette.accent2 || "#ffe14a" : palette.plat;
  const top = bounce ? "#fff7c8" : palette.platTop;
  ctx.fillStyle = color;
  ctx.strokeStyle = palette.ink;
  ctx.lineWidth = 3;
  pathRound(ctx, x, y, solid.w, solid.h + 6, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = top;
  pathRound(ctx, x + 3, y + 3, solid.w - 6, 7, 4);
  ctx.fill();

  if (bounce) {
    const squash = 1 + Math.sin(t * 10 + solid.x) * 0.06;
    ctx.strokeStyle = palette.ink;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const cy = y + 8 + i * 6;
      ctx.ellipse(x + solid.w / 2, cy, solid.w * 0.22 * squash, 3.2, 0, Math.PI, 0);
    }
    ctx.stroke();
  }

  if (solid.crumble) {
    ctx.strokeStyle = palette.ink;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + solid.w * 0.3, y + 4);
    ctx.lineTo(x + solid.w * 0.42, y + solid.h);
    ctx.moveTo(x + solid.w * 0.62, y + 2);
    ctx.lineTo(x + solid.w * 0.55, y + solid.h + 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  if (solid.move) {
    ctx.fillStyle = palette.ink;
    const mid = x + solid.w / 2;
    if (solid.move.axis === "y") {
      arrow(ctx, mid - 10, y - 8, 0, -1);
      arrow(ctx, mid + 10, y + solid.h + 14, 0, 1);
    } else {
      arrow(ctx, x - 8, y + 8, -1, 0);
      arrow(ctx, x + solid.w + 8, y + 8, 1, 0);
    }
  }
}

function arrow(ctx, x, y, dx, dy) {
  ctx.beginPath();
  if (dy !== 0) {
    ctx.moveTo(x, y + dy * 6);
    ctx.lineTo(x - 5, y - dy * 4);
    ctx.lineTo(x + 5, y - dy * 4);
  } else {
    ctx.moveTo(x + dx * 6, y);
    ctx.lineTo(x - dx * 4, y - 5);
    ctx.lineTo(x - dx * 4, y + 5);
  }
  ctx.closePath();
  ctx.fill();
}

function drawProps(ctx, world, cam, palette) {
  for (const prop of world.stage.scenery.props) {
    if (prop.x < cam.x - 20 || prop.x > cam.x + VIEW_W + 20) continue;
    if (prop.kind === "grass") drawGrass(ctx, prop, palette);
    else if (prop.kind === "flower") drawFlower(ctx, prop, palette);
    else drawPebble(ctx, prop, palette);
  }
}

function drawGrass(ctx, prop, palette) {
  ctx.strokeStyle = palette.grass;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(prop.x, prop.y);
  ctx.lineTo(prop.x - 4 * prop.s, prop.y - 10 * prop.s);
  ctx.moveTo(prop.x, prop.y);
  ctx.lineTo(prop.x + 1, prop.y - 13 * prop.s);
  ctx.moveTo(prop.x, prop.y);
  ctx.lineTo(prop.x + 5 * prop.s, prop.y - 9 * prop.s);
  ctx.stroke();
}

function drawFlower(ctx, prop, palette) {
  const colors = [palette.accent, palette.accent2 || "#f2c14a", "#fffaf2"];
  ctx.strokeStyle = palette.grass;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(prop.x, prop.y);
  ctx.lineTo(prop.x, prop.y - 12);
  ctx.stroke();
  ctx.fillStyle = colors[Math.floor(prop.tint * colors.length) % colors.length];
  ctx.beginPath();
  ctx.arc(prop.x, prop.y - 14, 4.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff4c8";
  ctx.beginPath();
  ctx.arc(prop.x, prop.y - 14, 1.6, 0, Math.PI * 2);
  ctx.fill();
}

function drawPebble(ctx, prop, palette) {
  ctx.fillStyle = palette.soil;
  ctx.strokeStyle = palette.ink;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(prop.x, prop.y - 3, 5 * prop.s, 3.2 * prop.s, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function drawHazards(ctx, world, cam, palette) {
  for (const hazard of world.hazards) {
    if (hazard.kind === "spike") drawSpike(ctx, hazard, cam, palette);
    else if (hazard.kind === "pendulum") drawPendulum(ctx, hazard, cam, palette);
    else if (hazard.kind === "saw") drawSaw(ctx, hazard, world.t, cam, palette);
  }
}

function drawSpike(ctx, hazard, cam, palette) {
  const box = hazard.dir === "down"
    ? { x: hazard.x, y: hazard.y, w: hazard.w, h: hazard.h }
    : { x: hazard.x, y: hazard.y - hazard.h, w: hazard.w, h: hazard.h };
  if (box.x + box.w < cam.x - 20 || box.x > cam.x + VIEW_W + 20) return;
  ctx.fillStyle = palette.spike;
  ctx.strokeStyle = palette.ink;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  if (hazard.dir === "down") {
    ctx.moveTo(hazard.x, hazard.y);
    ctx.lineTo(hazard.x + hazard.w, hazard.y);
    ctx.lineTo(hazard.x + hazard.w / 2, hazard.y + hazard.h);
  } else {
    ctx.moveTo(hazard.x, hazard.y);
    ctx.lineTo(hazard.x + hazard.w, hazard.y);
    ctx.lineTo(hazard.x + hazard.w / 2, hazard.y - hazard.h);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = palette.spikeDeep;
  ctx.beginPath();
  if (hazard.dir === "down") {
    ctx.moveTo(hazard.x + hazard.w * 0.35, hazard.y + 2);
    ctx.lineTo(hazard.x + hazard.w * 0.62, hazard.y + 2);
    ctx.lineTo(hazard.x + hazard.w / 2, hazard.y + hazard.h * 0.62);
  } else {
    ctx.moveTo(hazard.x + hazard.w * 0.35, hazard.y - 2);
    ctx.lineTo(hazard.x + hazard.w * 0.62, hazard.y - 2);
    ctx.lineTo(hazard.x + hazard.w / 2, hazard.y - hazard.h * 0.62);
  }
  ctx.closePath();
  ctx.fill();
}

function drawPendulum(ctx, hazard, cam, palette) {
  if (hazard.x < cam.x - 200 || hazard.x > cam.x + VIEW_W + 200) return;
  ctx.strokeStyle = palette.ink;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(hazard.x, hazard.y);
  ctx.lineTo(hazard.bx, hazard.by);
  ctx.stroke();
  ctx.fillStyle = palette.accent;
  ctx.beginPath();
  ctx.arc(hazard.bx, hazard.by, hazard.r || 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.save();
  ctx.translate(hazard.bx, hazard.by);
  ctx.rotate(worldAngle(hazard));
  ctx.fillStyle = palette.accent2 || "#fff6d4";
  traceShape(ctx, "tri", 7);
  ctx.fill();
  ctx.restore();
}

function worldAngle(hazard) {
  return hazard.ang || 0;
}

function drawSaw(ctx, hazard, t, cam, palette) {
  if (hazard.x < cam.x - 40 || hazard.x > cam.x + VIEW_W + 40) return;
  ctx.save();
  ctx.translate(hazard.x + hazard.w / 2, hazard.y + hazard.h / 2);
  ctx.rotate(t * 4);
  ctx.fillStyle = palette.spike;
  ctx.strokeStyle = palette.ink;
  ctx.lineWidth = 2.5;
  pathRound(ctx, -hazard.w / 2, -hazard.h / 2, hazard.w, hazard.h, 4);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawFruits(ctx, world, palette) {
  world.pickups.forEach((fruit, index) => {
    if (fruit.got) return;
    const bob = Math.sin(world.t * 3 + index) * 4;
    ctx.save();
    ctx.translate(fruit.x, fruit.y + bob);
    ctx.rotate(Math.sin(world.t * 2 + index) * 0.18);
    ctx.fillStyle = "#5aaa40";
    ctx.beginPath();
    ctx.ellipse(3, -13, 6, 3, 0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = index % 2 === 0 ? palette.accent : palette.accent2 || palette.accent;
    ctx.strokeStyle = palette.ink;
    ctx.lineWidth = 2.5;
    traceShape(ctx, index % 3 === 0 ? "diamond" : index % 3 === 1 ? "tri" : "circle", 11);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.beginPath();
    ctx.arc(-3, -3, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

function drawChecks(ctx, world, palette) {
  for (const check of world.checks) {
    const y = check.y;
    ctx.fillStyle = palette.soil;
    ctx.strokeStyle = palette.ink;
    ctx.lineWidth = 2.5;
    pathRound(ctx, check.x - 3, y - 46, 6, 46, 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = check.got ? palette.accent : "#efe6d4";
    ctx.beginPath();
    ctx.moveTo(check.x + 2, y - 42);
    ctx.lineTo(check.x + 22, y - 34);
    ctx.lineTo(check.x + 2, y - 26);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

function drawGoal(ctx, world, palette) {
  const goal = world.stage.goal;
  if (!goal || goal.x > 90000) return;
  const y = goal.y || GROUND_Y;
  ctx.fillStyle = palette.ink;
  ctx.fillRect(goal.x, y - 78, 5, 78);
  const wave = Math.sin(world.t * 6) * 5;
  ctx.fillStyle = palette.accent;
  ctx.strokeStyle = palette.ink;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(goal.x + 5, y - 74);
  ctx.lineTo(goal.x + 38, y - 60 + wave);
  ctx.lineTo(goal.x + 5, y - 46 + wave * 0.4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = palette.accent2 || "#fff";
  ctx.fillRect(goal.x + 10, y - 66, 8, 8);
}

function drawHints(ctx, world, cam, palette) {
  ctx.font = '22px "Yusei Magic", "Yu Gothic", sans-serif';
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  for (const hint of world.stage.hints || []) {
    if (hint.x < cam.x - 420 || hint.x > cam.x + VIEW_W + 40) continue;
    const width = Math.min(460, ctx.measureText(hint.text).width + 36);
    ctx.save();
    ctx.translate(hint.x, hint.y);
    ctx.rotate(-0.03);
    ctx.fillStyle = "#8a5a32";
    ctx.fillRect(18, 46, 8, 28);
    ctx.fillStyle = "#f0d2a4";
    ctx.strokeStyle = "#4a301c";
    ctx.lineWidth = 3;
    pathRound(ctx, 0, 0, width, 48, 10);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#4a301c";
    ctx.fillText(hint.text, 16, 25);
    ctx.restore();
  }
}

function drawPoyo(ctx, world, vis) {
  const p = world.player;
  const cx = p.x + p.w / 2;
  const feet = p.y + p.h;
  const dead = !p.alive;
  const deadP = dead ? 1 - world.deadTimer / 0.46 : 0;
  const hop = p.won ? Math.abs(Math.sin(world.winTimer * 12)) * 12 : 0;
  const bob = p.onGround && !p.won ? Math.sin(vis.phase * Math.PI * 2) * 2.2 : 0;
  const blink = vis.blinking > 0;

  ctx.save();
  if (p.invuln > 0 && Math.sin(world.t * 46) > 0) ctx.globalAlpha = 0.45;
  ctx.translate(cx, feet - hop);
  if (dead) {
    ctx.rotate(deadP * 1.4);
    ctx.scale(1 + deadP * 0.15, 1 - deadP * 0.35);
  }

  ctx.fillStyle = "rgba(74, 48, 28, 0.18)";
  ctx.beginPath();
  ctx.ellipse(0, 2, p.onGround ? 15 : 11, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();

  const swing = p.onGround
    ? Math.sin(vis.phase * Math.PI * 2) * 0.72
    : p.vy < 0
      ? -0.45
      : 0.55;
  drawLeg(ctx, -7, -16 + bob * 0.3, swing);
  drawLeg(ctx, 6, -16 + bob * 0.3, p.onGround ? -swing : swing * 0.4);

  ctx.save();
  ctx.translate(0, -24 + bob);
  ctx.scale(vis.squash, vis.stretch);

  ctx.fillStyle = "#ffe3a8";
  ctx.strokeStyle = "#4a301c";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(0, 0, 16.5, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#fff6d4";
  ctx.beginPath();
  ctx.ellipse(0, 4.5, 9, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ff9b84";
  ctx.beginPath();
  ctx.ellipse(-8.5, 2, 3.3, 2.2, 0, 0, Math.PI * 2);
  ctx.ellipse(8.5, 2, 3.3, 2.2, 0, 0, Math.PI * 2);
  ctx.fill();

  const happy = p.holdTime > 0.16 && p.vy < 0;
  const look = p.vy < -180 ? -1.6 : p.vy > 220 ? 2 : 0;
  if (happy || blink) {
    ctx.strokeStyle = "#3a2718";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(-6, -2, 3.2, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(6, -2, 3.2, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  } else {
    const wide = p.vy > 280 ? 1.2 : 1;
    ctx.fillStyle = "#3a2718";
    eye(ctx, -6, -3 + look, wide);
    eye(ctx, 6, -3 + look, wide);
  }

  ctx.strokeStyle = "#c9845a";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  if (p.vy > 280) {
    ctx.arc(0, 6, 3, 0, Math.PI);
  } else {
    ctx.arc(0, 5, 3.2, 0.15 * Math.PI, 0.85 * Math.PI);
  }
  ctx.stroke();
  ctx.restore();

  drawSprout(ctx, p, vis, bob, hop);
  ctx.restore();
}

function eye(ctx, x, y, wide) {
  ctx.beginPath();
  ctx.ellipse(x, y, 2.3, 2.8 * wide, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fffaf2";
  ctx.beginPath();
  ctx.arc(x - 0.7, y - 0.8, 0.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#3a2718";
}

function drawLeg(ctx, x, y, swing) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(swing);
  ctx.fillStyle = "#f0c56a";
  ctx.strokeStyle = "#4a301c";
  ctx.lineWidth = 2.4;
  pathRound(ctx, -4, 0, 8, 15, 4);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#e7a85c";
  pathRound(ctx, -5, 11, 10, 6, 3);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawSprout(ctx, p, vis, bob, hop) {
  const pts = vis.trail;
  if (!pts || pts.length < 2) return;
  const ox = p.x + p.w / 2;
  const oy = p.y + p.h - hop;
  const hy = bob - p.h;
  ctx.strokeStyle = "#3d8a34";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, hy);
  for (const pt of pts) ctx.lineTo(pt.x - ox, pt.y - oy);
  ctx.stroke();
  const end = pts[pts.length - 1];
  const prev = pts[pts.length - 2];
  const ang = Math.atan2(end.y - prev.y, end.x - prev.x);
  ctx.save();
  ctx.translate(end.x - ox, end.y - oy);
  ctx.rotate(ang);
  ctx.fillStyle = "#78c84e";
  ctx.strokeStyle = "#2f6a28";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(6, 0, 8, 4.2, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function traceShape(ctx, shape, size) {
  ctx.beginPath();
  if (shape === "tri") {
    ctx.moveTo(0, -size);
    ctx.lineTo(size * 0.9, size * 0.7);
    ctx.lineTo(-size * 0.9, size * 0.7);
    ctx.closePath();
  } else if (shape === "diamond") {
    ctx.moveTo(0, -size);
    ctx.lineTo(size * 0.75, 0);
    ctx.lineTo(0, size);
    ctx.lineTo(-size * 0.75, 0);
    ctx.closePath();
  } else if (shape === "rect") {
    ctx.rect(-size / 2, -size / 2, size, size);
  } else {
    ctx.arc(0, 0, size, 0, Math.PI * 2);
  }
}

function pathRound(ctx, x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
