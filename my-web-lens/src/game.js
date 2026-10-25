// src/game.js
// Core Game Logic, State Machine, Timer, Scoring & Progression (Solid Color Memory)
import { generateBoardPairs, LEVELS, SOLID_SWATCHES } from './palette.js';
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
    this.equippedSkinId = saveState.equippedSkin || 0;
    this.board.applyLevelStyle(1);
    this.board.applySkin(this.equippedSkinId);
    this.setState(GAME_STATES.LOBBY);
  }

  setState(newState) {
    this.state = newState;
    if (this.onStateChange) {
      this.onStateChange(this.state);
    }
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
    this.board.setLobbyTint(false); // neutral tile sides so colours never leak
    this.board.isInputLocked = true;

    // Generate final 8-pair board layout from solid swatches
    this.boardTiles = generateBoardPairs();

    // PHASE 1: 2.5s Live Color Shuffle
    this.setState(GAME_STATES.SHUFFLE);
    if (this.onPhaseBanner) {
      this.onPhaseBanner('SHUFFLING COLORS...', 'shuffle', 2500);
    }

    // Orient all 16 tiles face-up
    this.board.allFaceUp();

    // Pool of random swatches to scramble through
    const allPool = SOLID_SWATCHES;

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
        this.onPhaseBanner('MEMORIZE! 1.5s', 'peek', 1500);
      }

      // PHASE 3: Cascade Flip-Down (0.4s) after 1.5s peek
      setTimeout(() => {
        this.setState(GAME_STATES.CASCADE);
        sound.playCascadeFlipDown();

        if (this.onPhaseBanner) {
          this.onPhaseBanner('GO!', 'go', 400);
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
      sound.playFlip(1);
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
    sound.playFlip(1);

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
      sound.playMatch(1, this.currentStreak);

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

      sound.playMismatch(1);
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

    sound.playVictory(1);

    // Calculate Final Score per mental model formula
    const timeBonus = Math.round(this.timeLeft * 100); // 0.1s precision
    const flipBonus = Math.max(0, 4000 - this.flipsCount * 100);
    const streakBonus = this.streakBonusTotal;
    const finalScore = timeBonus + flipBonus + streakBonus;

    // Save state progression update
    const prevSave = getSaveState();
    const isNewHighScore = finalScore > (prevSave.highScore || 0);
    const newHighScore = Math.max(prevSave.highScore || 0, finalScore);
    const newCumulative = (prevSave.cumulativeScore || 0) + finalScore;
    const newGamesWon = (prevSave.totalGamesWon || 0) + 1;
    const newBestFlips = Math.min(prevSave.bestFlipCount || 999, this.flipsCount);
    const newBestTimeLeft = Math.max(prevSave.fastestClearTimeLeft || 0, this.timeLeft);

    const newUnlocks = [];

    const updatedSave = {
      highScore: newHighScore,
      cumulativeScore: newCumulative,
      totalGamesWon: newGamesWon,
      fastestClearTimeLeft: newBestTimeLeft,
      bestFlipCount: newBestFlips,
      equippedSkin: this.equippedSkinId,
    };

    // Persist and submit score to Snapchat Leaderboard
    persistSaveState(updatedSave);
    submitRoundScore(finalScore).catch(() => {});

    if (this.onRoundEnd) {
      this.onRoundEnd({
        status: 'VICTORY',
        levelName: 'Solid',
        finalScore,
        isNewHighScore,
        timeBonus,
        timeLeft: this.timeLeft,
        flipBonus,
        flipsCount: this.flipsCount,
        streakBonus,
        multiplier: 1.0,
        newUnlocks,
      });
    }
  }

  handleTimeUp() {
    this.setState(GAME_STATES.TIME_UP);
    this.board.isInputLocked = true;
    if (this.gameLoopTimer) cancelAnimationFrame(this.gameLoopTimer);

    sound.playMismatch(1);

    if (this.onRoundEnd) {
      this.onRoundEnd({
        status: 'TIME_UP',
        levelName: 'Solid',
        finalScore: 0,
        isNewHighScore: false,
        timeBonus: 0,
        timeLeft: 0,
        flipBonus: 0,
        flipsCount: this.flipsCount,
        streakBonus: 0,
        multiplier: 0,
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

    this.board.setCameraPreset('preview', 4.0);
    this.board.applyLevelStyle(1);
    this.board.allFaceUp(); // showcase colours in the lobby
    this.setState(GAME_STATES.LOBBY);
  }
}
