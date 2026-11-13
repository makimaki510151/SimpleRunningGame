export function createParticles() {
  const items = [];

  function spawn(spec) {
    if (items.length > 480) items.splice(0, 60);
    items.push(spec);
  }

  function burst(x, y, count, opt = {}) {
    const colors = opt.colors || ["#fff4d2", "#f2b544", "#ef6a4a"];
    const shapes = opt.shapes || ["tri", "diamond", "rect"];
    const spread = opt.spread ?? Math.PI * 2;
    const aim = opt.aim ?? -Math.PI / 2;
    for (let i = 0; i < count; i++) {
      const ang = aim + (Math.random() - 0.5) * spread;
      const speed = (opt.speed || 90) * (0.45 + Math.random() * 0.7);
      const life = (opt.life || 0.45) * (0.65 + Math.random() * 0.5);
      spawn({
        x,
        y,
        vx: Math.cos(ang) * speed + (opt.vx || 0),
        vy: Math.sin(ang) * speed + (opt.vy || 0),
        life,
        max: life,
        size: (opt.size || 6) * (0.65 + Math.random() * 0.7),
        shape: opt.shape || shapes[i % shapes.length],
        color: colors[i % colors.length],
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 7,
        g: opt.g ?? 360,
        grow: opt.grow || 0,
        text: opt.text || "",
      });
    }
  }

  function update(dt) {
    for (let i = items.length - 1; i >= 0; i--) {
      const p = items[i];
      p.life -= dt;
      if (p.life <= 0) {
        items.splice(i, 1);
        continue;
      }
      p.vy += p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
    }
  }

  function draw(ctx) {
    for (const p of items) {
      const alpha = Math.max(0, p.life / p.max);
      const age = 1 - alpha;
      const size = p.size + age * p.grow;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 2;
      if (p.shape === "rect") {
        ctx.fillRect(-size / 2, -size / 2, size, size);
      } else if (p.shape === "diamond") {
        ctx.beginPath();
        ctx.moveTo(0, -size);
        ctx.lineTo(size * 0.7, 0);
        ctx.lineTo(0, size);
        ctx.lineTo(-size * 0.7, 0);
        ctx.closePath();
        ctx.fill();
      } else if (p.shape === "tri") {
        ctx.beginPath();
        ctx.moveTo(0, -size);
        ctx.lineTo(size * 0.86, size * 0.55);
        ctx.lineTo(-size * 0.86, size * 0.55);
        ctx.closePath();
        ctx.fill();
      } else if (p.shape === "ring") {
        ctx.beginPath();
        ctx.arc(0, 0, Math.max(1, size), 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.shape === "line") {
        ctx.beginPath();
        ctx.moveTo(-size, 0);
        ctx.lineTo(size, 0);
        ctx.stroke();
      } else if (p.shape === "text") {
        ctx.font = `${Math.round(size)}px "Yusei Magic", "Yu Gothic", sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText(p.text, 0, 0);
      }
      ctx.restore();
    }
  }

  return {
    spawn,
    burst,
    update,
    draw,
    clear() {
      items.length = 0;
    },
  };
}
