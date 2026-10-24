// src/ui.js
// UI Controller for Color Flip (HTML/CSS Overlay Layer)
import { LEVELS, EMBLEM_SKINS } from './palette.js';
import { getSaveState, getBitmojiUrl, isCapabilitySupported, showNativeLeaderboard } from './snapchat.js';
import { GAME_STATES } from './game.js';

export class UIController {
  constructor(gameEngine) {
    this.game = gameEngine;

    // Cache DOM Elements
    this.overlay = document.getElementById('ui-overlay');
    this.lobbyScreen = document.getElementById('lobby-screen');
    this.hudScreen = document.getElementById('hud-screen');
    this.phaseBanner = document.getElementById('phase-banner');
    this.phaseText = document.getElementById('phase-text');
    this.phaseBarFill = document.getElementById('phase-bar-fill');

    // Lobby Elements
    this.highScoreDisplay = document.getElementById('lobby-high-score');
    this.lobbyAvatar = document.getElementById('lobby-avatar');
    this.levelTitle = document.getElementById('lobby-level-title');
    this.levelSubtitle = document.getElementById('lobby-level-subtitle');
    this.levelMultBadge = document.getElementById('lobby-mult-badge');
    this.btnPrevLevel = document.getElementById('btn-prev-level');
    this.btnNextLevel = document.getElementById('btn-next-level');
    this.levelDotsContainer = document.getElementById('level-dots');
    this.btnPlay = document.getElementById('btn-play');
    this.levelLockNotice = document.getElementById('level-lock-notice');
    this.btnOpenLeaderboard = document.getElementById('btn-leaderboard');
    this.btnOpenSkins = document.getElementById('btn-skins');

    // HUD Elements
    this.hudAvatarContainer = document.getElementById('hud-avatar-container');
    this.hudAvatarImg = document.getElementById('hud-avatar-img');
    this.hudTimer = document.getElementById('hud-timer');
    this.hudFlips = document.getElementById('hud-flips');
    this.hudPaceDot = document.getElementById('hud-pace-dot');
    this.hudLevelBadge = document.getElementById('hud-level-badge');
    this.streakBar = document.getElementById('streak-bar');
    this.streakText = document.getElementById('streak-text');
    this.btnRestart = document.getElementById('btn-restart');

    // Skin Drawer Elements
    this.skinDrawer = document.getElementById('skin-drawer');
    this.skinDrawerOverlay = document.getElementById('skin-drawer-overlay');
    this.btnCloseSkins = document.getElementById('btn-close-skins');
    this.skinListContainer = document.getElementById('skin-list');

    // Flex Card Modal Elements
    this.flexModal = document.getElementById('flex-modal');
    this.flexModalOverlay = document.getElementById('flex-modal-overlay');
    this.flexTitle = document.getElementById('flex-title');
    this.flexAvatar = document.getElementById('flex-avatar');
    this.flexScore = document.getElementById('flex-score');
    this.flexPbBadge = document.getElementById('flex-pb-badge');
    this.flexTimeBonus = document.getElementById('flex-time-bonus');
    this.flexFlipBonus = document.getElementById('flex-flip-bonus');
    this.flexStreakBonus = document.getElementById('flex-streak-bonus');
    this.flexMult = document.getElementById('flex-mult');
    this.flexUnlocks = document.getElementById('flex-unlocks');
    this.btnFlexPlayAgain = document.getElementById('btn-flex-play-again');
    this.btnFlexLeaderboard = document.getElementById('btn-flex-leaderboard');
    this.btnFlexChangeLevel = document.getElementById('btn-flex-change-level');

    this.currentCarouselIndex = 0; // 0 to 4
    this.wireEvents();
    this.wireGameCallbacks();
  }

  wireEvents() {
    // Level Carousel Navigation
    this.btnPrevLevel.addEventListener('click', () => this.navigateCarousel(-1));
    this.btnNextLevel.addEventListener('click', () => this.navigateCarousel(1));

    // Play CTA
    this.btnPlay.addEventListener('click', () => {
      const targetLevel = LEVELS[this.currentCarouselIndex];
      if (this.game.isLevelUnlocked(targetLevel.id)) {
        this.game.selectLevel(targetLevel.id);
        this.game.startRound();
      }
    });

    // Quick Restart in HUD
    this.btnRestart.addEventListener('click', () => {
      this.game.quickRestart();
    });

    // Skin Drawer Open/Close
    this.btnOpenSkins.addEventListener('click', () => this.openSkinDrawer());
    this.btnCloseSkins.addEventListener('click', () => this.closeSkinDrawer());
    this.skinDrawerOverlay.addEventListener('click', () => this.closeSkinDrawer());

    // Native Snapchat Leaderboards CTA
    this.btnOpenLeaderboard.addEventListener('click', () => {
      showNativeLeaderboard();
    });

    // Flex Card Actions
    this.btnFlexPlayAgain.addEventListener('click', () => {
      this.closeFlexCard();
      this.game.startRound();
    });
    this.btnFlexLeaderboard.addEventListener('click', () => {
      showNativeLeaderboard();
    });
    this.btnFlexChangeLevel.addEventListener('click', () => {
      this.closeFlexCard();
      this.game.returnToLobby();
    });
  }

  wireGameCallbacks() {
    this.game.onStateChange = (state) => this.renderState(state);

    this.game.onTimerTick = (timeLeft) => {
      const formatted = timeLeft.toFixed(1);
      this.hudTimer.textContent = `${formatted}s`;

      if (timeLeft <= 10.0) {
        this.hudTimer.classList.add('timer-warning');
        this.hudAvatarContainer.classList.add('avatar-sweat');
      } else {
        this.hudTimer.classList.remove('timer-warning');
        this.hudAvatarContainer.classList.remove('avatar-sweat');
      }
    };

    this.game.onFlipsUpdate = (flips) => {
      this.hudFlips.textContent = flips;

      // Pace dot: Green <= 20, Yellow 22-32, Grey 34+
      this.hudPaceDot.className = 'pace-dot';
      if (flips <= 20) {
        this.hudPaceDot.classList.add('pace-green');
      } else if (flips <= 32) {
        this.hudPaceDot.classList.add('pace-yellow');
      } else {
        this.hudPaceDot.classList.add('pace-grey');
      }
    };

    this.game.onStreakUpdate = (streak, bonusTotal) => {
      if (streak >= 2) {
        this.streakBar.classList.remove('hidden');
        this.streakText.textContent = `🔥 ${streak}x STREAK (+${bonusTotal} PTS)`;
        this.hudAvatarContainer.classList.add('avatar-glow-cyan');
      } else {
        this.streakBar.classList.add('hidden');
        this.hudAvatarContainer.classList.remove('avatar-glow-cyan');
      }
    };

    this.game.onPhaseBanner = (text, type, durationMs) => {
      this.showPhaseBanner(text, type, durationMs);
    };

    this.game.onRoundEnd = (payload) => {
      this.showFlexCard(payload);
    };
  }

  refreshUserData() {
    const save = getSaveState();
    const avatarUrl = getBitmojiUrl();

    // High Score header pill
    this.highScoreDisplay.textContent = (save.highScore || 0).toLocaleString();

    // Set Bitmoji Avatars with fallback safety
    this.lobbyAvatar.src = avatarUrl;
    this.hudAvatarImg.src = avatarUrl;
    this.flexAvatar.src = avatarUrl;

    // Leaderboard button visibility
    if (!isCapabilitySupported('leaderboards')) {
      this.btnOpenLeaderboard.classList.add('hidden');
    } else {
      this.btnOpenLeaderboard.classList.remove('hidden');
    }

    this.updateCarouselDisplay();
  }

  navigateCarousel(delta) {
    const total = LEVELS.length;
    this.currentCarouselIndex = (this.currentCarouselIndex + delta + total) % total;
    this.updateCarouselDisplay();

    // Live 3D board preview update in background
    const selectedLevel = LEVELS[this.currentCarouselIndex];
    this.game.selectLevel(selectedLevel.id);
  }

  updateCarouselDisplay() {
    const level = LEVELS[this.currentCarouselIndex];
    const isUnlocked = this.game.isLevelUnlocked(level.id);

    this.levelTitle.textContent = `LEVEL ${level.id}: ${level.name.toUpperCase()}`;
    this.levelSubtitle.textContent = level.subtitle;
    this.levelMultBadge.textContent = level.multiplierLabel;

    // Pagination Dots
    this.levelDotsContainer.innerHTML = '';
    LEVELS.forEach((l, idx) => {
      const dot = document.createElement('span');
      dot.className = `dot ${idx === this.currentCarouselIndex ? 'active' : ''} ${
        this.game.isLevelUnlocked(l.id) ? '' : 'locked-dot'
      }`;
      dot.addEventListener('click', () => {
        this.currentCarouselIndex = idx;
        this.updateCarouselDisplay();
        this.game.selectLevel(l.id);
      });
      this.levelDotsContainer.appendChild(dot);
    });

    // Play CTA vs Locked Badge
    if (isUnlocked) {
      this.btnPlay.disabled = false;
      this.btnPlay.classList.remove('btn-locked');
      this.btnPlay.innerHTML = `<span>P L A Y</span> <svg class="icon-play" viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>`;
      this.levelLockNotice.classList.add('hidden');
    } else {
      this.btnPlay.disabled = true;
      this.btnPlay.classList.add('btn-locked');
      this.btnPlay.innerHTML = `<span>🔒 LOCKED</span>`;
      this.levelLockNotice.classList.remove('hidden');
      this.levelLockNotice.textContent = `Milestone: ${level.unlockDesc}`;
    }
  }

  showPhaseBanner(text, type, durationMs) {
    this.phaseBanner.classList.remove('hidden', 'banner-shuffle', 'banner-peek', 'banner-go');
    this.phaseBanner.classList.add(`banner-${type}`);
    this.phaseText.textContent = text;

    if (type === 'peek') {
      this.phaseBarFill.style.transition = `width ${durationMs}ms linear`;
      this.phaseBarFill.style.width = '0%';
    } else {
      this.phaseBarFill.style.transition = 'none';
      this.phaseBarFill.style.width = '100%';
    }

    setTimeout(() => {
      if (this.game.state === GAME_STATES.PLAYING) {
        this.phaseBanner.classList.add('hidden');
      }
    }, durationMs);
  }

  renderState(state) {
    if (state === GAME_STATES.LOBBY) {
      this.lobbyScreen.classList.remove('hidden');
      this.hudScreen.classList.add('hidden');
      this.phaseBanner.classList.add('hidden');
      this.refreshUserData();
    } else if (state === GAME_STATES.SHUFFLE || state === GAME_STATES.PEEK || state === GAME_STATES.CASCADE) {
      this.lobbyScreen.classList.add('hidden');
      this.hudScreen.classList.remove('hidden');
    } else if (state === GAME_STATES.PLAYING) {
      this.lobbyScreen.classList.add('hidden');
      this.hudScreen.classList.remove('hidden');
      this.phaseBanner.classList.add('hidden');

      const lvl = LEVELS.find((l) => l.id === this.game.currentLevelId) || LEVELS[0];
      this.hudLevelBadge.textContent = `LVL ${lvl.id} • ${lvl.multiplier}x`;
    }
  }

  // Skin Drawer Modal
  openSkinDrawer() {
    this.skinDrawer.classList.remove('hidden');
    this.skinDrawerOverlay.classList.remove('hidden');
    this.renderSkinList();
  }

  closeSkinDrawer() {
    this.skinDrawer.classList.add('hidden');
    this.skinDrawerOverlay.classList.add('hidden');
  }

  renderSkinList() {
    const save = getSaveState();
    this.skinListContainer.innerHTML = '';

    EMBLEM_SKINS.forEach((skin) => {
      const isEquipped = this.game.equippedSkinId === skin.id;
      let isUnlocked = skin.unlockedByDefault;

      if (!isUnlocked && skin.checkUnlock) {
        isUnlocked = skin.checkUnlock(save);
      }

      const card = document.createElement('div');
      card.className = `skin-card ${isEquipped ? 'active' : ''} ${!isUnlocked ? 'locked' : ''}`;

      card.innerHTML = `
        <div class="skin-card-header">
          <span class="skin-name">${skin.name}</span>
          ${isEquipped ? '<span class="skin-tag active-tag">EQUIPPED ✓</span>' : ''}
          ${!isEquipped && isUnlocked ? '<button class="btn-equip">EQUIP</button>' : ''}
          ${!isUnlocked ? '<span class="skin-tag locked-tag">🔒</span>' : ''}
        </div>
        <p class="skin-desc">${skin.description}</p>
      `;

      if (isUnlocked && !isEquipped) {
        card.querySelector('.btn-equip').addEventListener('click', () => {
          this.game.equipSkin(skin.id);
          this.renderSkinList();
        });
      }

      this.skinListContainer.appendChild(card);
    });
  }

  // Flex Card Modal
  showFlexCard(payload) {
    this.flexModal.classList.remove('hidden');
    this.flexModalOverlay.classList.remove('hidden');

    if (payload.status === 'VICTORY') {
      this.flexTitle.textContent = `★ ${payload.levelName.toUpperCase()} CLEARED! ★`;
      this.flexTitle.classList.remove('title-loss');
      this.flexTitle.classList.add('title-win');
      this.flexPbBadge.classList.toggle('hidden', !payload.isNewHighScore);

      this.flexTimeBonus.textContent = `+${payload.timeBonus.toLocaleString()} pts (${payload.timeLeft.toFixed(1)}s)`;
      this.flexFlipBonus.textContent = `+${payload.flipBonus.toLocaleString()} pts (${payload.flipsCount} flips)`;
      this.flexStreakBonus.textContent = `+${payload.streakBonus.toLocaleString()} pts`;
      this.flexMult.textContent = `×${payload.multiplier.toFixed(2)}`;

      // Score count-up animation
      let count = 0;
      const target = payload.finalScore;
      const step = Math.max(1, Math.floor(target / 40));
      const counter = setInterval(() => {
        count = Math.min(target, count + step);
        this.flexScore.textContent = count.toLocaleString();
        if (count >= target) {
          clearInterval(counter);
        }
      }, 20);

      // Unlocks toast
      if (payload.newUnlocks && payload.newUnlocks.length > 0) {
        this.flexUnlocks.classList.remove('hidden');
        this.flexUnlocks.innerHTML = payload.newUnlocks
          .map((u) => `<div class="unlock-item">🎉 ${u}</div>`)
          .join('');
      } else {
        this.flexUnlocks.classList.add('hidden');
      }
    } else {
      this.flexTitle.textContent = `⏰ TIME'S UP!`;
      this.flexTitle.classList.remove('title-win');
      this.flexTitle.classList.add('title-loss');
      this.flexPbBadge.classList.add('hidden');
      this.flexScore.textContent = '0';
      this.flexTimeBonus.textContent = '0 pts';
      this.flexFlipBonus.textContent = '0 pts';
      this.flexStreakBonus.textContent = '0 pts';
      this.flexMult.textContent = '×0.00';
      this.flexUnlocks.classList.add('hidden');
    }
  }

  closeFlexCard() {
    this.flexModal.classList.add('hidden');
    this.flexModalOverlay.classList.add('hidden');
  }
}
