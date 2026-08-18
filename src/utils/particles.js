// particles.js
//
// A high-performance canvas particle engine for Aashirwad celebrations.
// Renders petals, golden sparkles, and ambient light orbs via requestAnimationFrame.

const PETAL_COLORS = [
  '#ffb3c6', // lotus pink
  '#f5789a', // rose pink
  '#ff8a3d', // marigold orange
  '#ffd166', // golden yellow
  '#f0b429', // deep gold
  '#ffe1ec', // pearl pink
  '#e0447b', // vibrant magenta-rose
];

const GOLD_COLORS = ['#f0b429', '#f9d879', '#ffb454', '#ffffff', '#ffeaa7'];

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

class Petal {
  constructor(width, height) {
    this.reset(width, height, true);
  }

  reset(width, height, initial = false) {
    this.x = rand(0, width);
    this.y = initial ? rand(-height * 0.8, 0) : -30;
    this.size = rand(8, 18);
    this.speedY = rand(1.0, 2.4);
    this.speedX = rand(-0.6, 0.6);
    this.rotation = rand(0, Math.PI * 2);
    this.rotationSpeed = rand(-0.035, 0.035);
    this.color = pick(PETAL_COLORS);
    this.swayPhase = rand(0, Math.PI * 2);
    this.swaySpeed = rand(0.015, 0.035);
    this.opacity = rand(0.8, 0.98);
    this.life = 0;
    this.maxLife = rand(350, 750);
  }

  update(width, height) {
    this.life += 1;
    this.swayPhase += this.swaySpeed;
    this.x += this.speedX + Math.sin(this.swayPhase) * 0.9;
    this.y += this.speedY;
    this.rotation += this.rotationSpeed;
    return this.y < height + 40 && this.life < this.maxLife;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.globalAlpha = this.opacity;
    ctx.fillStyle = this.color;
    
    // Organic curved petal shape
    const s = this.size;
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.bezierCurveTo(s * 0.85, -s * 0.35, s * 0.65, s * 0.85, 0, s);
    ctx.bezierCurveTo(-s * 0.65, s * 0.85, -s * 0.85, -s * 0.35, 0, -s);
    ctx.fill();
    ctx.restore();
  }
}

class Sparkle {
  constructor(x, y, speedMult = 1) {
    this.x = x;
    this.y = y;
    this.size = rand(2.5, 6);
    this.maxSize = this.size;
    this.angle = rand(0, Math.PI * 2);
    this.speed = rand(1.5, 5.5) * speedMult;
    this.vx = Math.cos(this.angle) * this.speed;
    this.vy = Math.sin(this.angle) * this.speed;
    this.life = 0;
    this.maxLife = rand(30, 65);
    this.color = pick(GOLD_COLORS);
    this.twinklePhase = rand(0, Math.PI * 2);
  }

  update() {
    this.life += 1;
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= 0.95;
    this.vy *= 0.95;
    this.twinklePhase += 0.35;
    return this.life < this.maxLife;
  }

  draw(ctx) {
    const t = this.life / this.maxLife;
    const alpha = Math.max(0, 1 - t);
    const size = this.maxSize * (1 - t * 0.5) * (0.75 + 0.25 * Math.sin(this.twinklePhase));
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(this.x, this.y);
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 10;

    // 4-point golden star
    ctx.beginPath();
    ctx.moveTo(0, -size * 2);
    ctx.lineTo(size * 0.5, -size * 0.5);
    ctx.lineTo(size * 2, 0);
    ctx.lineTo(size * 0.5, size * 0.5);
    ctx.lineTo(0, size * 2);
    ctx.lineTo(-size * 0.5, size * 0.5);
    ctx.lineTo(-size * 2, 0);
    ctx.lineTo(-size * 0.5, -size * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

class GlowDot {
  constructor(width, height) {
    this.x = rand(0, width);
    this.y = rand(height * 0.2, height);
    this.size = rand(12, 32);
    this.vy = rand(-0.7, -0.2);
    this.vx = rand(-0.2, 0.2);
    this.life = 0;
    this.maxLife = rand(120, 240);
    this.color = pick(GOLD_COLORS);
    this.pulsePhase = rand(0, Math.PI * 2);
  }

  update() {
    this.life += 1;
    this.x += this.vx;
    this.y += this.vy;
    this.pulsePhase += 0.05;
    return this.life < this.maxLife;
  }

  draw(ctx) {
    const t = this.life / this.maxLife;
    const alpha = Math.sin(Math.PI * t) * 0.7;
    const pulse = 1 + Math.sin(this.pulsePhase) * 0.2;
    ctx.save();
    ctx.globalAlpha = Math.max(0, alpha);
    const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size * pulse);
    grad.addColorStop(0, this.color);
    grad.addColorStop(1, 'rgba(240,180,41,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export class ParticleSystem {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.petals = [];
    this.sparkles = [];
    this.glowDots = [];
    this.rafId = null;
    this.running = false;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.resize();
  }

  resize() {
    const { clientWidth, clientHeight } = this.canvas;
    this.width = clientWidth;
    this.height = clientHeight;
    this.canvas.width = clientWidth * this.dpr;
    this.canvas.height = clientHeight * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  spawnPetalBurst(count = 50) {
    for (let i = 0; i < count; i++) {
      this.petals.push(new Petal(this.width, this.height));
    }
  }

  spawnSparkleBurst(x, y, count = 35) {
    const cx = x ?? this.width / 2;
    const cy = y ?? this.height / 2;
    for (let i = 0; i < count; i++) {
      this.sparkles.push(new Sparkle(cx, cy));
    }
  }

  spawnAuraSparkles(x, y, count = 4) {
    const cx = x ?? this.width / 2;
    const cy = y ?? this.height / 2;
    for (let i = 0; i < count; i++) {
      this.sparkles.push(new Sparkle(cx + rand(-25, 25), cy + rand(-25, 25), 0.6));
    }
  }

  spawnGlowDots(count = 14) {
    for (let i = 0; i < count; i++) {
      this.glowDots.push(new GlowDot(this.width, this.height));
    }
  }

  clear() {
    this.petals = [];
    this.sparkles = [];
    this.glowDots = [];
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  start() {
    if (this.running) return;
    this.running = true;
    const loop = () => {
      if (!this.running) return;
      this.tick();
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  tick() {
    const { ctx, width, height } = this;
    ctx.clearRect(0, 0, width, height);

    this.petals = this.petals.filter((p) => {
      const alive = p.update(width, height);
      if (alive) p.draw(ctx);
      return alive;
    });

    this.sparkles = this.sparkles.filter((s) => {
      const alive = s.update();
      if (alive) s.draw(ctx);
      return alive;
    });

    this.glowDots = this.glowDots.filter((g) => {
      const alive = g.update();
      if (alive) g.draw(ctx);
      return alive;
    });
  }

  destroy() {
    this.stop();
    this.clear();
  }
}
