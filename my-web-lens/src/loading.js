// src/loading.js
// Dedicated Loading Screen Controller for Color Flip

export const GAME_TIPS = [
  'Watch the pattern carefully before the tiles flip!',
  'Match pairs quickly in succession to build massive streak bonuses!',
  'Fewer flips mean higher bonus points at the end of the round!',
];

export class LoadingScreen {
  constructor() {
    this.container = document.getElementById('loading-screen');
    this.barFill = document.getElementById('loading-bar-fill');
    this.percentLabel = document.getElementById('loading-percent');
    this.tipCard = document.getElementById('loading-tip-card');
    this.tipText = document.getElementById('loading-tip-text');

    this.currentPercent = 0;
    this.targetPercent = 0;
    this.isFinished = false;
    this.tipIndex = 0;
    this.animating = false;

    this.wireEvents();
    this.pickRandomTip();
  }

  wireEvents() {
    if (this.tipCard) {
      this.tipCard.addEventListener('click', () => {
        this.nextTip();
      });
    }
  }

  pickRandomTip() {
    // Avoid repeating the exact same tip twice consecutively
    let lastIndex = -1;
    try {
      const stored = sessionStorage.getItem('colorflip_last_tip');
      if (stored !== null) {
        lastIndex = parseInt(stored, 10);
      }
    } catch (e) {
      /* ignore */
    }

    let nextIndex;
    if (GAME_TIPS.length > 1) {
      do {
        nextIndex = Math.floor(Math.random() * GAME_TIPS.length);
      } while (nextIndex === lastIndex);
    } else {
      nextIndex = 0;
    }

    try {
      sessionStorage.setItem('colorflip_last_tip', String(nextIndex));
    } catch (e) {
      /* ignore */
    }

    this.tipIndex = nextIndex;
    this.setTip(GAME_TIPS[this.tipIndex]);
  }

  nextTip() {
    if (!this.tipText) return;
    this.tipIndex = (this.tipIndex + 1) % GAME_TIPS.length;
    this.tipText.style.opacity = '0';
    this.tipText.style.transform = 'translateY(4px)';

    setTimeout(() => {
      this.tipText.textContent = GAME_TIPS[this.tipIndex];
      this.tipText.style.opacity = '1';
      this.tipText.style.transform = 'translateY(0)';
    }, 150);
  }

  setTip(text) {
    if (this.tipText && text) {
      this.tipText.textContent = text;
    }
  }

  setTipByIndex(index) {
    if (index >= 0 && index < GAME_TIPS.length) {
      this.tipIndex = index;
      this.setTip(GAME_TIPS[this.tipIndex]);
    }
  }

  setProgress(percent) {
    this.currentPercent = Math.min(100, Math.max(0, percent));
    this.targetPercent = this.currentPercent;
    this.render();
  }

  render() {
    if (this.barFill) {
      this.barFill.style.width = `${this.currentPercent}%`;
    }
    if (this.percentLabel) {
      this.percentLabel.textContent = `${Math.round(this.currentPercent)}%`;
    }
  }

  animateTo(target, duration = 300) {
    return new Promise((resolve) => {
      const start = this.currentPercent;
      const targetVal = Math.min(100, Math.max(0, target));
      const diff = targetVal - start;
      const startTime = performance.now();

      const step = (now) => {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / duration);
        // Quad ease out
        const ease = 1 - (1 - progress) * (1 - progress);
        this.currentPercent = start + diff * ease;
        this.render();

        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          this.currentPercent = targetVal;
          this.render();
          resolve();
        }
      };

      requestAnimationFrame(step);
    });
  }

  async finish() {
    if (this.isFinished) return;
    this.isFinished = true;
    await this.animateTo(100, 260);
    // Brief pause at 100% so user sees completion
    await new Promise((r) => setTimeout(r, 220));
    this.hide();
  }

  hide() {
    if (!this.container) return;
    this.container.classList.add('fade-out');
    setTimeout(() => {
      this.container.classList.add('hidden');
    }, 450);
  }

  show() {
    if (!this.container) return;
    this.isFinished = false;
    this.container.classList.remove('hidden', 'fade-out');
  }
}
