// src/confetti.js
// One-time celebratory confetti cannon burst for victory / board cleared

const PALETTE = [
  '#FFFC00', // Snap Yellow
  '#00E5FF', // Electric Cyan
  '#FF2E93', // Hot Pink
  '#B5179E', // Neon Purple
  '#FFB800', // Gold
  '#00E676', // Emerald
  '#FFFFFF', // Sparkle White
];

export class ConfettiCannon {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas ? canvas.getContext('2d') : null;
    this.particles = [];
    this.animId = null;
    this.isRunning = false;
    this.w = 0;
    this.h = 0;
  }

  resize() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = rect.width || this.canvas.parentElement?.clientWidth || window.innerWidth;
    this.h = rect.height || this.canvas.parentElement?.clientHeight || window.innerHeight;
    this.canvas.width = Math.floor(this.w * dpr);
    this.canvas.height = Math.floor(this.h * dpr);
    if (this.ctx) {
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }

  burst() {
    // Respect reduced motion preference
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    if (!this.canvas || !this.ctx) return;
    this.stop();

    this.canvas.classList.remove('hidden');
    this.resize();

    // Twin cannon origins: flanking the 3D celebration title and medallion
    const count = 120;
    const originY = this.h * 0.28;

    this.particles = [];
    for (let i = 0; i < count; i++) {
      const isLeft = i % 2 === 0;
      const originX = isLeft ? this.w * 0.28 : this.w * 0.72;

      // Arc upward and outward
      const angle = isLeft
        ? -Math.PI * 0.5 + (Math.random() * 0.7 - 0.15)
        : -Math.PI * 0.5 - (Math.random() * 0.7 - 0.15);
      const speed = 8 + Math.random() * 11;

      this.particles.push({
        x: originX + (Math.random() - 0.5) * 36,
        y: originY + (Math.random() - 0.5) * 24,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        sizeW: 7 + Math.random() * 7,
        sizeH: 4 + Math.random() * 8,
        color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.22,
        tiltAngle: Math.random() * Math.PI,
        tiltSpeed: 0.08 + Math.random() * 0.14,
        drag: 0.982,
        gravity: 0.28 + Math.random() * 0.09,
        flutterSpeed: 0.04 + Math.random() * 0.06,
        flutterPhase: Math.random() * Math.PI * 2,
        flutterAmp: 1.2 + Math.random() * 1.5,
        opacity: 1,
        life: 0,
        maxLife: 160 + Math.random() * 70, // ~3.0s - 3.8s at 60fps
        shape: Math.random() > 0.28 ? 'rect' : (Math.random() > 0.5 ? 'circle' : 'star'),
      });
    }

    this.isRunning = true;
    this.loop();
  }

  loop() {
    if (!this.isRunning || !this.ctx) return;

    this.ctx.clearRect(0, 0, this.w, this.h);

    let activeCount = 0;

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.life++;

      if (p.life >= p.maxLife || p.y > this.h + 20) {
        p.opacity -= 0.035;
      }

      if (p.opacity <= 0) continue;
      activeCount++;

      p.vx *= p.drag;
      p.vy = p.vy * p.drag + p.gravity;

      p.x += p.vx + Math.sin(p.flutterPhase + p.life * p.flutterSpeed) * p.flutterAmp;
      p.y += p.vy;

      p.rotation += p.rotSpeed;
      p.tiltAngle += p.tiltSpeed;

      const scaleY = Math.cos(p.tiltAngle);

      this.ctx.save();
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate(p.rotation);
      this.ctx.scale(1, scaleY);
      this.ctx.globalAlpha = Math.max(0, Math.min(1, p.opacity));
      this.ctx.fillStyle = p.color;

      if (p.shape === 'rect') {
        this.ctx.fillRect(-p.sizeW / 2, -p.sizeH / 2, p.sizeW, p.sizeH);
      } else if (p.shape === 'circle') {
        this.ctx.beginPath();
        this.ctx.arc(0, 0, p.sizeW * 0.42, 0, Math.PI * 2);
        this.ctx.fill();
      } else {
        // 4-pointed sparkle star
        const r = p.sizeW * 0.65;
        this.ctx.beginPath();
        this.ctx.moveTo(0, -r);
        this.ctx.quadraticCurveTo(0, 0, r, 0);
        this.ctx.quadraticCurveTo(0, 0, 0, r);
        this.ctx.quadraticCurveTo(0, 0, -r, 0);
        this.ctx.quadraticCurveTo(0, 0, 0, -r);
        this.ctx.fill();
      }

      this.ctx.restore();
    }

    if (activeCount > 0) {
      this.animId = requestAnimationFrame(() => this.loop());
    } else {
      this.stop();
    }
  }

  stop() {
    this.isRunning = false;
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
    if (this.ctx && this.w && this.h) {
      this.ctx.clearRect(0, 0, this.w, this.h);
    }
    if (this.canvas) {
      this.canvas.classList.add('hidden');
    }
    this.particles = [];
  }
}
