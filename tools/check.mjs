import { STAGES } from "../js/stages.js";
import { cloneWorld, createWorld, tick, GROUND_Y, PLAYER_W } from "../js/sim.js";

const DT = 1 / 60;
const HOLDS = [0, 0.05, 0.1, 0.16, 0.24, 0.36, 0.58];
const WAITS = [0, 0.08, 0.16, 0.26, 0.38, 0.52, 0.7, 0.95, 1.2];
const WAITS2 = [0, 0.18, 0.4, 0.62, 0.9];
const HOLDS2 = [0.05, 0.16, 0.36, 0.58];
const AGAINS = [0.18, 0.3, 0.42, 0.56];
const HOLD2S = [0.05, 0.18, 0.5];

function forecast(world, action, limit = 3.5) {
  const w = cloneWorld(world);
  let t = 0;
  let pressed = false;
  let second = false;
  let firstAt = 0;
  let holdLeft = 0;
  let sawAir = false;
  const inputOf = () => {
    if (action.type !== "jump") return { jumpPressed: false, jumpHeld: false };
    let jumpPressed = false;
    if (!pressed && t >= action.wait) {
      pressed = true;
      firstAt = t;
      jumpPressed = true;
      holdLeft = action.hold;
    }
    if (pressed && action.again != null && !second && t >= firstAt + action.again) {
      second = true;
      jumpPressed = true;
      holdLeft = action.hold2;
    }
    const jumpHeld = pressed && holdLeft > 0;
    return { jumpPressed, jumpHeld };
  };

  while (t < limit) {
    const input = inputOf();
    tick(w, input, DT);
    if (pressed) holdLeft -= DT;
    t += DT;
    const p = w.player;
    if (!p.alive) return { ok: false, w };
    if (p.won) return { ok: true, landX: 1e9, w };
    if (!p.onGround) sawAir = true;
    if (action.type === "jump" && pressed && sawAir && p.onGround) {
      return landingResult(w);
    }
  }

  if (action.type === "none") {
    let extra = 0;
    while (!w.player.onGround && w.player.alive && !w.player.won && extra < 2.2) {
      tick(w, { jumpPressed: false, jumpHeld: false }, DT);
      extra += DT;
    }
    const p = w.player;
    if (p.won) return { ok: true, landX: 1e9, w };
    return { ok: p.alive && p.onGround, landX: p.x, w };
  }
  return { ok: false, w };
}

function landingResult(world) {
  const p = world.player;
  if (!p.alive) return { ok: false, world };
  if (p.won) return { ok: true, landX: 1e9, world };
  const plat = world.solids.find((solid) => solid.id === p.platformId);
  if (!plat) return { ok: false, world };
  const left = p.x - plat.x;
  const right = plat.x + plat.w - (p.x + p.w);
  const ok = left > -2 && right > 16;
  return { ok, landX: p.x, world };
}

function collect(world, plans, action) {
  const result = forecast(world, action, 4.2);
  if (result.ok) plans.push({ ...action, type: "jump", landX: result.landX });
}

function choose(world) {
  const nothing = forecast(world, { type: "none" }, 2.5);
  if (nothing.ok) return { type: "none" };

  const plans = [];
  for (const wait of WAITS) {
    for (const hold of HOLDS) collect(world, plans, { type: "jump", wait, hold });
  }
  const bestSingle = plans.reduce((best, plan) => (plan.landX > best ? plan.landX : best), 0);
  if (bestSingle < world.player.x + 170) {
    for (const wait of WAITS2) {
      for (const hold of HOLDS2) {
        for (const again of AGAINS) {
          for (const hold2 of HOLD2S) {
            collect(world, plans, { type: "jump", wait, hold, again, hold2 });
          }
        }
      }
    }
  }
  if (!plans.length) return { type: "stuck" };
  const maxX = Math.max(...plans.map((plan) => plan.landX));
  const pool = plans.filter((plan) => plan.landX >= maxX - 70);
  for (const plan of pool) {
    if (plan.landX >= 1e8) {
      plan.slack = true;
      continue;
    }
    const late = forecast(world, { ...plan, wait: plan.wait + 0.07 }, 4);
    plan.slack = late.ok && late.landX >= maxX - 100;
  }
  pool.sort((a, b) => {
    if (a.slack !== b.slack) return a.slack ? -1 : 1;
    if (Math.abs(a.landX - b.landX) > 20) return b.landX - a.landX;
    if (a.wait !== b.wait) return b.wait - a.wait;
    return a.hold - b.hold;
  });
  const best = pool[0];
  if (best.landX < world.player.x + 18) return { type: "stuck" };
  return { type: "jump", ...best };
}

function play(stage) {
  const world = createWorld(stage);
  const bot = { holdLeft: 0, jumps: [], note: "start" };
  const deaths = [];
  const limit = 60 * 150;
  for (let i = 0; i < limit; i++) {
    let input = { jumpPressed: false, jumpHeld: false };
    if (!world.player.alive) {
      bot.holdLeft = 0;
      bot.jumps = [];
    } else if (world.player.won) {
      return {
        ok: true,
        time: world.elapsed,
        fruits: world.fruitsGot,
        total: stage.pickups.length,
        missed: world.pickups.filter((fruit) => !fruit.got).map((fruit) => `${Math.round(fruit.x)},${Math.round(fruit.y)}`),
        deaths: deaths.length,
      };
    } else if (bot.holdLeft > 0 && !(bot.jumps.length && world.t + 1e-4 >= bot.jumps[0].at)) {
      bot.holdLeft -= DT;
      input.jumpHeld = bot.holdLeft > 0;
    } else if (bot.jumps.length) {
      if (world.t + 1e-4 >= bot.jumps[0].at) {
        const jump = bot.jumps.shift();
        bot.holdLeft = jump.hold;
        input.jumpPressed = true;
        input.jumpHeld = true;
        bot.note = "jump";
      }
    } else {
      const plan = choose(world);
      const air = plan.again != null ? ` air ${plan.again}/${plan.hold2}` : "";
      bot.note = plan.type === "jump" ? `jump wait ${plan.wait} hold ${plan.hold}${air}` : plan.type;
      if (plan.type === "jump") {
        const first = world.t + plan.wait;
        if (plan.wait <= DT) {
          bot.holdLeft = plan.hold;
          input.jumpPressed = true;
          input.jumpHeld = true;
        } else {
          bot.jumps.push({ at: first, hold: plan.hold });
        }
        if (plan.again != null) bot.jumps.push({ at: first + plan.again, hold: plan.hold2 });
      }
    }

    const events = tick(world, input, DT);
    if (events.some((event) => event.type === "death")) {
      deaths.push(Math.round(world.player.x));
      bot.jumps = [];
      bot.holdLeft = 0;
      const recent = deaths.slice(-4);
      if (recent.length >= 4 && recent.every((x) => Math.abs(x - recent[0]) < 90)) {
        return fail(stage, world, deaths, bot.note);
      }
    }
  }
  return fail(stage, world, deaths, "timeout " + bot.note);
}

function fail(stage, world, deaths, note) {
  const x = world.player.x;
  const near = stage.solids
    .filter((solid) => solid.x + solid.w > x - 250 && solid.x < x + 450)
    .map((solid) => `${solid.kind}@${Math.round(solid.x)}-${Math.round(solid.x + solid.w)} y${Math.round(solid.y)}`)
    .join(" | ");
  return {
    ok: false,
    x: Math.round(x),
    deaths,
    note,
    near,
  };
}

let bad = 0;
for (const stage of STAGES) {
  const issues = [];
  if (stage.pickups.length !== 3) issues.push(`fruits ${stage.pickups.length}`);
  const spawn = 88 + PLAYER_W * 0.5;
  const spawnSolid = stage.solids.some(
    (solid) => spawn >= solid.x && spawn <= solid.x + solid.w && Math.abs(solid.y - GROUND_Y) < 2,
  );
  if (!spawnSolid) issues.push("spawn missing");
  const goalSolid = stage.solids.some(
    (solid) => stage.goal.x >= solid.x && stage.goal.x <= solid.x + solid.w,
  );
  if (!goalSolid) issues.push("goal not on a solid");
  const started = performance.now();
  const result = play(stage);
  const ms = Math.round(performance.now() - started);
  if (!result.ok || issues.length) {
    bad += 1;
    console.log(`FAIL ${stage.id} ${stage.name} ${ms}ms ${issues.join(",")}`);
    console.log(" ", result.note, "x", result.x, "deaths", result.deaths?.join(","));
    console.log(" ", result.near);
  } else {
    console.log(
      `ok   ${stage.id} ${stage.name}  ${result.time.toFixed(1)}s  fruits ${result.fruits}/${result.total}  miss [${result.missed}]  deaths ${result.deaths}  ${ms}ms`,
    );
  }
}
if (bad) process.exitCode = 1;
