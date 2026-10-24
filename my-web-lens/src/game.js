// src/game.js
// Core Game Logic, State Machine, Timer, Scoring & Progression
import { generateBoardPairs, LEVELS, EMBLEM_SKINS, SOLID_SWATCHES, GRADIENT_SWATCHES, GLOW_SWATCHES, SPLIT_SWATCHES } from './palette.js';
import { sound } from './audio.js';
import { persistSaveState, getSaveState, submitRoundScore } from './snapchat.js';

export const GAME_STATES = {
  LOBBY: 'LOBBY',
  SHUFFLE: 'SHUFFLE',
  PEEK: 'PEEK',
  CASCADE: 'CASCADE',
  PLAYING: 'PLAYING',
  VICTORY: 'VICTORY',
  TIME_UP: 'TIME_UP',
};

export class GameEngine {
  constructor(board3D) {
    this.board = board3D;
    this.state = GAME_STATES.LOBBY;
    this.currentLevelId = 1;
    this.equippedSkinId = 0;

    // Active round state
    this.boardTiles = []; // 16 items { pairIndex, swatch, isMatched, ... }
    this.timeLeft = 60.0;
    this.flipsCount = 0;
    this.matchedPairs = 0;
    this.currentStreak = 0;
    this.streakBonusTotal = 0;
    this.firstPickIndex = null;
    this.isProcessingTurn = false;

    // Timers
    this.gameLoopTimer = null;
    this.urgencyTickTimer = null;
    this.lastTimestamp = 0;

    // UI Callbacks
    this.onStateChange = null;
    this.onTimerTick = null;
    this.onFlipsUpdate = null;
    this.onStreakUpdate = null;
    this.onPhaseBanner = null; // (text, type, durationMs)
    this.onRoundEnd = null; // (resultPayload)

    // Wire 3D board pick event
    this.board.onTileTapped = (index) => this.handleTileTap(index);
  }

  init(saveState) {
    this.currentLevelId = saveState.highestLevelUnlocked || 1;
    this.equippedSkinId = saveState.equippedSkin || 0;
    this.board.applyLevelStyle(this.currentLevelId);
    this.board.applySkin(this.equippedSkinId);
    this.setState(GAME_STATES.LOBBY);
  }

  setState(newState) {
    this.state = newState;
    if (this.onStateChange) {
      this.onStateChange(this.state);
    }
  }

  isLevelUnlocked(levelId) {
    if (levelId === 1) return true;
    const save = getSaveState();
    if (levelId <= (save.highestLevelUnlocked || 1)) return true;

    // Milestone check
    if (levelId === 2) return save.levelsCleared && save.levelsCleared[0];
    if (levelId === 3) return save.levelsCleared && save.levelsCleared[1] && save.fastestClearTimeLeft > 20.0;
    if (levelId === 4) return save.levelsCleared && save.levelsCleared[2] && save.bestFlipCount <= 26;
    if (levelId === 5) {
      const l4Cleared = save.levelsCleared && save.levelsCleared[3];
      const scoreHigh = (save.cumulativeScore || 0) >= 25000;
      return l4Cleared || scoreHigh;
    }
    return false;
  }

  selectLevel(levelId) {
    this.currentLevelId = levelId;
    this.board.applyLevelStyle(levelId);
  }

  equipSkin(skinId) {
    this.equippedSkinId = skinId;
    this.board.applySkin(skinId);
    persistSaveState({ equippedSkin: skinId });
  }

  /**
   * PLAY CTA TRIGGER:
   * 1. 2.5s Face-Up Live Color Shuffle
   * 2. 1.5s Memorization Peek
   * 3. 0.4s Cascade Flip-Down
   * 4. 60.0s Timer start
   */
  startRound() {
    if (this.gameLoopTimer) cancelAnimationFrame(this.gameLoopTimer);
    sound.stopShuffleSequence();

    // Reset round metrics
    this.timeLeft = 60.0;
    this.flipsCount = 0;
    this.matchedPairs = 0;
    this.currentStreak = 0;
    this.streakBonusTotal = 0;
    this.firstPickIndex = null;
    this.isProcessingTurn = false;

    if (this.onTimerTick) this.onTimerTick(this.timeLeft);
    if (this.onFlipsUpdate) this.onFlipsUpdate(this.flipsCount);
    if (this.onStreakUpdate) this.onStreakUpdate(this.currentStreak, this.streakBonusTotal);

    // Switch camera to overhead play position
    this.board.setCameraPreset('play', 5.0);
    this.board.isInputLocked = true;

    // Generate final 8-pair board layout
    this.boardTiles = generateBoardPairs(this.currentLevelId);

    // PHASE 1: 2.5s Live Color Shuffle
    this.setState(GAME_STATES.SHUFFLE);
    if (this.onPhaseBanner) {
      this.onPhaseBanner('🎲 SHUFFLING COLORS...', 'shuffle', 2500);
    }

    // Orient all 16 tiles face-up
    this.board.allFaceUp();

    // Pool of random swatches to scramble through
    const allPool = [
      ...SOLID_SWATCHES,
      ...GRADIENT_SWATCHES,
      ...GLOW_SWATCHES,
      ...SPLIT_SWATCHES,
    ];

    sound.startShuffleSequence(() => {
      // Rapidly assign random swatches to each of the 16 tiles
      for (let i = 0; i < 16; i++) {
        const randSwatch = allPool[Math.floor(Math.random() * allPool.length)];
        this.board.setTileSwatch(i, randSwatch);
      }
    });

    // PHASE 2: Lock-in & 1.5s Memorization Peek after 2.5s
    setTimeout(() => {
      sound.stopShuffleSequence();
      this.setState(GAME_STATES.PEEK);

      // Lock in the final 8-pair layout on the 3D tiles
      for (let i = 0; i < 16; i++) {
        this.board.setTileSwatch(i, this.boardTiles[i]);
      }

      // Snappy camera pulse and lock chime
      this.board.pulseCamera();
      sound.playLockInPeek();

      if (this.onPhaseBanner) {
        this.onPhaseBanner('👀 MEMORIZE! 1.5s', 'peek', 1500);
      }

      // PHASE 3: Cascade Flip-Down (0.4s) after 1.5s peek
      setTimeout(() => {
        this.setState(GAME_STATES.CASCADE);
        sound.playCascadeFlipDown();

        if (this.onPhaseBanner) {
          this.onPhaseBanner('⚡ GO!', 'go', 400);
        }

        this.board.cascadeFlipDown(() => {
          // PHASE 4: 60.0s Timer & Touch Unlocked
          this.setState(GAME_STATES.PLAYING);
          this.board.isInputLocked = false;
          this.lastTimestamp = performance.now();
          this.startGameLoop();
        });
      }, 1500);
    }, 2500);
  }

  startGameLoop() {
    const loop = (timestamp) => {
      if (this.state !== GAME_STATES.PLAYING) return;

      const delta = (timestamp - this.lastTimestamp) / 1000;
      this.lastTimestamp = timestamp;

      this.timeLeft = Math.max(0, this.timeLeft - delta);
      if (this.onTimerTick) {
        this.onTimerTick(this.timeLeft);
      }

      // Urgency state (final 10 seconds)
      if (this.timeLeft <= 10.0 && this.timeLeft > 0) {
        this.board.vibrateBoard(0.015);
      }

      if (this.timeLeft <= 0) {
        this.handleTimeUp();
        return;
      }

      this.gameLoopTimer = requestAnimationFrame(loop);
    };

    this.gameLoopTimer = requestAnimationFrame(loop);
  }

  handleTileTap(tileIndex) {
    if (this.state !== GAME_STATES.PLAYING || this.isProcessingTurn) return;

    const tileData = this.boardTiles[tileIndex];
    if (!tileData || tileData.isMatched) return;

    // Flip first tile
    if (this.firstPickIndex === null) {
      this.firstPickIndex = tileIndex;
      this.flipsCount++;
      if (this.onFlipsUpdate) this.onFlipsUpdate(this.flipsCount);

      this.board.flipTile(tileIndex, true);
      sound.playFlip(this.currentLevelId);
      return;
    }

    // Ignore tapping the exact same tile twice
    if (this.firstPickIndex === tileIndex) return;

    // Flip second tile
    const firstIdx = this.firstPickIndex;
    const secondIdx = tileIndex;
    this.firstPickIndex = null;
    this.flipsCount++;
    if (this.onFlipsUpdate) this.onFlipsUpdate(this.flipsCount);

    this.board.flipTile(secondIdx, true);
    sound.playFlip(this.currentLevelId);

    const firstTile = this.boardTiles[firstIdx];
    const secondTile = this.boardTiles[secondIdx];

    // Check Match
    if (firstTile.pairIndex === secondTile.pairIndex) {
      // MATCH!
      this.isProcessingTurn = true;
      this.matchedPairs++;
      this.currentStreak++;
      const streakPoints = 250 * this.currentStreak;
      this.streakBonusTotal += streakPoints;

      firstTile.isMatched = true;
      secondTile.isMatched = true;

      this.board.setTileMatched(firstIdx);
      this.board.setTileMatched(secondIdx);
      sound.playMatch(this.currentLevelId, this.currentStreak);

      if (this.onStreakUpdate) {
        this.onStreakUpdate(this.currentStreak, this.streakBonusTotal);
      }

      this.isProcessingTurn = false;

      // Check Victory (All 8 pairs matched)
      if (this.matchedPairs === 8) {
        this.handleVictory();
      }
    } else {
      // MISMATCH!
      this.isProcessingTurn = true;
      this.currentStreak = 0;
      if (this.onStreakUpdate) {
        this.onStreakUpdate(0, this.streakBonusTotal);
      }

      sound.playMismatch(this.currentLevelId);
      this.board.shakeTile(firstIdx);
      this.board.shakeTile(secondIdx);

      // Flip back after 0.65-second delay
      setTimeout(() => {
        this.board.flipTile(firstIdx, false);
        this.board.flipTile(secondIdx, false);
        this.isProcessingTurn = false;
      }, 650);
    }
  }

  handleVictory() {
    this.setState(GAME_STATES.VICTORY);
    this.board.isInputLocked = true;
    if (this.gameLoopTimer) cancelAnimationFrame(this.gameLoopTimer);

    sound.playVictory(this.currentLevelId);

    // Calculate Final Score per Section 4 formula
    const timeBonus = Math.round(this.timeLeft * 100); // 0.1s precision
    const flipBonus = Math.max(0, 4000 - this.flipsCount * 100);
    const streakBonus = this.streakBonusTotal;
    const baseScore = timeBonus + flipBonus + streakBonus;

    const levelObj = LEVELS.find((l) => l.id === this.currentLevelId) || LEVELS[0];
    const finalScore = Math.round(baseScore * levelObj.multiplier);

    // Save state progression update
    const prevSave = getSaveState();
    const isNewHighScore = finalScore > (prevSave.highScore || 0);
    const newHighScore = Math.max(prevSave.highScore || 0, finalScore);
    const newCumulative = (prevSave.cumulativeScore || 0) + finalScore;
    const newGamesWon = (prevSave.totalGamesWon || 0) + 1;
    const newBestFlips = Math.min(prevSave.bestFlipCount || 999, this.flipsCount);
    const newBestTimeLeft = Math.max(prevSave.fastestClearTimeLeft || 0, this.timeLeft);

    const levelsCleared = [...(prevSave.levelsCleared || [false, false, false, false, false])];
    levelsCleared[this.currentLevelId - 1] = true;

    // Check unlocks
    let highestUnlocked = prevSave.highestLevelUnlocked || 1;
    const newUnlocks = [];

    if (this.currentLevelId === 1 && highestUnlocked < 2) {
      highestUnlocked = 2;
      newUnlocks.push('Level 2: Gradient');
    }
    if (this.currentLevelId === 2 && this.timeLeft > 20.0 && highestUnlocked < 3) {
      highestUnlocked = 3;
      newUnlocks.push('Level 3: Center Glow');
    }
    if (this.currentLevelId === 3 && this.flipsCount <= 26 && highestUnlocked < 4) {
      highestUnlocked = 4;
      newUnlocks.push('Level 4: Split');
    }
    if ((this.currentLevelId === 4 || newCumulative >= 25000) && highestUnlocked < 5) {
      highestUnlocked = 5;
      newUnlocks.push('Level 5: Mixed Master Tier');
    }

    // Check skin unlocks
    if (newGamesWon >= 5 && !EMBLEM_SKINS[1].unlockedByDefault) {
      newUnlocks.push('Tile Emblem: Neon Prism');
    }
    if (this.flipsCount <= 18) {
      newUnlocks.push('Tile Emblem: 24K Gold Foil');
    }
    if (this.currentLevelId === 5) {
      newUnlocks.push('Tile Emblem: Bitmoji Stamp');
    }

    const updatedSave = {
      highScore: newHighScore,
      cumulativeScore: newCumulative,
      totalGamesWon: newGamesWon,
      highestLevelUnlocked: highestUnlocked,
      fastestClearTimeLeft: newBestTimeLeft,
      bestFlipCount: newBestFlips,
      levelsCleared,
    };

    // Persist and submit score to Snapchat Leaderboard
    persistSaveState(updatedSave);
    submitRoundScore(finalScore).catch(() => {});

    if (this.onRoundEnd) {
      this.onRoundEnd({
        status: 'VICTORY',
        levelId: this.currentLevelId,
        levelName: levelObj.name,
        timeLeft: this.timeLeft,
        timeBonus,
        flipsCount: this.flipsCount,
        flipBonus,
        streakBonus,
        baseScore,
        multiplier: levelObj.multiplier,
        finalScore,
        isNewHighScore,
        newUnlocks,
      });
    }
  }

  handleTimeUp() {
    this.setState(GAME_STATES.TIME_UP);
    this.board.isInputLocked = true;
    if (this.gameLoopTimer) cancelAnimationFrame(this.gameLoopTimer);

    sound.playMismatch(this.currentLevelId);

    if (this.onRoundEnd) {
      this.onRoundEnd({
        status: 'TIME_UP',
        levelId: this.currentLevelId,
        levelName: LEVELS.find((l) => l.id === this.currentLevelId)?.name || 'Solid',
        finalScore: 0,
        flipsCount: this.flipsCount,
        isNewHighScore: false,
        newUnlocks: [],
      });
    }
  }

  quickRestart() {
    this.startRound();
  }

  returnToLobby() {
    if (this.gameLoopTimer) cancelAnimationFrame(this.gameLoopTimer);
    sound.stopShuffleSequence();
    this.board.isInputLocked = true;
    this.board.setCameraPreset('preview', 4.0);
    this.board.allFaceDown();
    this.setState(GAME_STATES.LOBBY);
  }
}
