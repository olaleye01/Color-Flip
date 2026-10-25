// src/ui.js
// UI Controller for Color Flip (HTML/CSS Overlay Layer)
import { EMBLEM_SKINS } from './palette.js';
import { getSaveState, getBitmojiUrl, isCapabilitySupported, showNativeLeaderboard } from './snapchat.js';
import { GAME_STATES } from './game.js';
import { sound } from './audio.js';

const SOUND_PREF_KEY = 'colorflip_muted';

export class UIController {
  constructor(gameEngine) {
    this.game = gameEngine;

    // Cache DOM Elements
    this.stage = document.getElementById('lens-stage');
    this.overlay = document.getElementById('ui-overlay');
    this.lobbyScreen = document.getElementById('lobby-screen');
    this.hudScreen = document.getElementById('hud-screen');
    this.phaseBanner = document.getElementById('phase-banner');
    this.phaseText = document.getElementById('phase-text');
    this.phaseBarFill = document.getElementById('phase-bar-fill');

    // Lobby Elements
    this.highScoreDisplay = document.getElementById('lobby-high-score');
    this.lobbyAvatar = document.getElementById('lobby-avatar');
    this.btnPlay = document.getElementById('btn-play');
    this.btnOpenLeaderboard = document.getElementById('btn-leaderboard');
    this.btnOpenSkins = document.getElementById('btn-skins');
    this.btnSound = document.getElementById('btn-sound') || document.getElementById('btn-settings');

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
    this.flexTitleWord1 = document.getElementById('flex-title-word-1');
    this.flexTitleWord2 = document.getElementById('flex-title-word-2');
    this.flexAvatar = document.getElementById('flex-avatar');
    this.flexScore = document.getElementById('flex-score');
    this.flexPbBadge = document.getElementById('flex-pb-badge');
    this.flexTimeBonus = document.getElementById('flex-time-bonus');
    this.flexTimeDetail = document.getElementById('flex-time-detail');
    this.flexFlipBonus = document.getElementById('flex-flip-bonus');
    this.flexFlipDetail = document.getElementById('flex-flip-detail');
    this.flexStreakBonus = document.getElementById('flex-streak-bonus');
    this.flexMult = document.getElementById('flex-mult');
    this.flexUnlocks = document.getElementById('flex-unlocks');
    this.btnFlexPlayAgain = document.getElementById('btn-flex-play-again');
    this.btnFlexPlayText = document.getElementById('btn-flex-play-text');
    this.btnFlexLeaderboard = document.getElementById('btn-flex-leaderboard');
    this.btnFlexChangeLevel = document.getElementById('btn-flex-change-level');

    this.wireEvents();
    this.wireGameCallbacks();
  }

  wireEvents() {
    // Sound toggle (gear button) — restore saved preference
    try {
      sound.muted = localStorage.getItem(SOUND_PREF_KEY) === '1';
    } catch (e) {
      /* storage unavailable in some webviews */
    }
    this.syncSoundButton();
    if (this.btnSound) {
      this.btnSound.addEventListener('click', () => {
        sound.muted = !sound.muted;
        try {
          localStorage.setItem(SOUND_PREF_KEY, sound.muted ? '1' : '0');
        } catch (e) {
          /* ignore */
        }
        this.syncSoundButton();
      });
    }

    // Play CTA (Starts Solid board shuffle & peek)
    this.btnPlay.addEventListener('click', () => {
      this.game.startRound();
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

  syncSoundButton() {
    if (!this.btnSound) return;
    this.btnSound.classList.toggle('is-muted', sound.muted);
    this.btnSound.setAttribute('aria-pressed', String(sound.muted));
    this.btnSound.setAttribute('aria-label', sound.muted ? 'Sound muted — tap to unmute' : 'Sound active — tap to mute');
    const badge = document.getElementById('sound-state-badge');
    if (badge) badge.textContent = sound.muted ? 'MUTED' : 'ON';
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
        this.streakText.innerHTML = `<svg class="icon-streak-flame" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 23c4.97 0 9-4.03 9-9 0-3.6-2.1-6.72-5.15-8.15C15.4 7.2 14.3 8.8 13.5 10c-.8-1.5-1.5-3.6-1.5-6 0-.6-.2-1.2-.5-1.7C8.2 4.4 5 8.7 5 14c0 4.97 4.03 9 9 9zm-1-8.5c0-1.4.8-2.6 1.8-3.3 1.2 1.3 2.2 2.7 2.2 4.3 0 1.66-1.34 3-3 3s-3-1.34-3-3c0-.3.1-.7.2-1 .3-.3.8-.5 1.8-.5v.5z"/></svg> <span>${streak}x STREAK (+${bonusTotal} PTS)</span>`;
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
    this.highScoreDisplay.textContent = (save.highScore || 0).toLocaleString();

    const avatarUrl = getBitmojiUrl();
    if (avatarUrl) {
      this.lobbyAvatar.src = avatarUrl;
      this.hudAvatarImg.src = avatarUrl;
      this.flexAvatar.src = avatarUrl;
    }

    if (!isCapabilitySupported('leaderboards')) {
      this.btnOpenLeaderboard.classList.add('hidden');
    } else {
      this.btnOpenLeaderboard.classList.remove('hidden');
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
    if (this.stage) {
      this.stage.classList.toggle('in-game', state !== GAME_STATES.LOBBY);
    }

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

      if (this.hudLevelBadge) {
        this.hudLevelBadge.textContent = 'SOLID MODE';
      }
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
      const isUnlocked = skin.unlockedByDefault || skin.checkUnlock(save);

      const card = document.createElement('div');
      card.className = `skin-card glass-card ${isEquipped ? 'equipped' : ''} ${!isUnlocked ? 'locked' : ''}`;

      card.innerHTML = `
        <div class="skin-badge-container">
          <div class="skin-icon-box">
            ${
              skin.key === 'classic'
                ? `<svg viewBox="0 0 24 24" width="36" height="36" fill="currentColor"><path d="M12 2C7.58 2 4 5.58 4 10c0 3.08 1.74 5.76 4.3 7.07-.15.42-.3.9-.3 1.43 0 .83.67 1.5 1.5 1.5h5c.83 0 1.5-.67 1.5-1.5 0-.53-.15-1.01-.3-1.43 2.56-1.31 4.3-3.99 4.3-7.07 0-4.42-3.58-8-8-8z"/></svg>`
                : skin.key === 'neon'
                ? `<svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 22h20L12 2z"/></svg>`
                : skin.key === 'gold'
                ? `<svg viewBox="0 0 24 24" width="36" height="36" fill="currentColor"><circle cx="12" cy="12" r="9"/></svg>`
                : `<img src="${getBitmojiUrl()}" class="skin-bitmoji-icon" alt="Bitmoji" />`
            }
          </div>
          <div class="skin-name">${skin.name}</div>
          <div class="skin-desc">${skin.description}</div>
        </div>
        <div class="skin-footer">
          ${
            isEquipped
              ? `<span class="badge-equipped"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" style="display:inline-block;vertical-align:middle;margin-right:4px;"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>EQUIPPED</span>`
              : isUnlocked
              ? `<button class="btn-equip">EQUIP</button>`
              : `<span class="badge-locked"><svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" style="display:inline-block;vertical-align:middle;margin-right:4px;"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>${skin.condition}</span>`
          }
        </div>
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
      if (this.flexTitleWord1) this.flexTitleWord1.textContent = 'BOARD';
      if (this.flexTitleWord2) this.flexTitleWord2.textContent = 'CLEARED!';
      this.flexTitle.classList.remove('title-loss');
      this.flexTitle.classList.add('title-win');
      this.flexPbBadge.classList.toggle('hidden', !payload.isNewHighScore);

      this.flexTimeBonus.textContent = `+${payload.timeBonus.toLocaleString()} pts`;
      if (this.flexTimeDetail) {
        this.flexTimeDetail.textContent = `(${payload.timeLeft.toFixed(1)}s)`;
      }

      this.flexFlipBonus.textContent = `+${payload.flipBonus.toLocaleString()} pts`;
      if (this.flexFlipDetail) {
        this.flexFlipDetail.textContent = `(${payload.flipsCount} flips)`;
      }

      this.flexStreakBonus.textContent = `+${payload.streakBonus.toLocaleString()} pts`;
      if (this.btnFlexPlayText) {
        this.btnFlexPlayText.textContent = 'PLAY AGAIN';
      }

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

      // Unlocks toast (clean vector SVG, zero emojis)
      if (payload.newUnlocks && payload.newUnlocks.length > 0) {
        this.flexUnlocks.classList.remove('hidden');
        this.flexUnlocks.innerHTML = payload.newUnlocks
          .map(
            (u) =>
              `<div class="unlock-item"><svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg> <span>${u}</span></div>`
          )
          .join('');
      } else {
        this.flexUnlocks.classList.add('hidden');
      }
    } else {
      if (this.flexTitleWord1) this.flexTitleWord1.textContent = "TIME'S";
      if (this.flexTitleWord2) this.flexTitleWord2.textContent = "UP!";
      this.flexTitle.classList.remove('title-win');
      this.flexTitle.classList.add('title-loss');
      this.flexPbBadge.classList.add('hidden');
      this.flexScore.textContent = '0';
      this.flexTimeBonus.textContent = '+0 pts';
      if (this.flexTimeDetail) {
        this.flexTimeDetail.textContent = '(0.0s)';
      }
      this.flexFlipBonus.textContent = '+0 pts';
      if (this.flexFlipDetail) {
        this.flexFlipDetail.textContent = `(${payload.flipsCount} flips)`;
      }
      this.flexStreakBonus.textContent = '+0 pts';
      if (this.btnFlexPlayText) {
        this.btnFlexPlayText.textContent = 'TRY AGAIN';
      }
      this.flexUnlocks.classList.add('hidden');
    }
  }

  closeFlexCard() {
    this.flexModal.classList.add('hidden');
    this.flexModalOverlay.classList.add('hidden');
  }
}
