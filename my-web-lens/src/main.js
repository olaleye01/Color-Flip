// src/main.js
// Application Entry Point for Color Flip Snapchat Web Lens
import { initSnapchat, getBitmojiUrl, getSaveState } from './snapchat.js';
import { Board3D } from './board3d.js';
import { GameEngine } from './game.js';
import { UIController } from './ui.js';

window.addEventListener('DOMContentLoaded', async () => {
  console.log('Color Flip Web Lens initializing...');

  // 1. Get 3D Canvas element
  const canvas = document.getElementById('application-canvas');
  if (!canvas) {
    console.error('Canvas #application-canvas not found!');
    return;
  }

  // 2. Initialize Snapchat API & load save data
  let saveState = null;
  try {
    saveState = await initSnapchat();
  } catch (err) {
    console.warn('Snapchat initialization fallback:', err);
  }

  // 3. Initialize PlayCanvas 3D Board
  const board3D = new Board3D(canvas);

  // 4. Preload Bitmoji Image Element for 3D Tile Back Stamp
  const bitmojiImg = new Image();
  bitmojiImg.crossOrigin = 'anonymous';
  bitmojiImg.src = getBitmojiUrl();
  bitmojiImg.onload = () => {
    board3D.applySkin(board3D.activeSkinId, bitmojiImg);
  };
  bitmojiImg.onerror = () => {
    bitmojiImg.src = './assets/avatar_default.png';
  };

  // 5. Initialize Game Engine & UI Controller
  const game = new GameEngine(board3D);
  const ui = new UIController(game);

  if (typeof window !== 'undefined') {
    window.game = game;
    window.ui = ui;
  }

  game.init(saveState || getSaveState());
  ui.refreshUserData();

  // Developer preview mode: ?preview=victory
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('preview') === 'victory') {
    ui.showFlexCard({
      status: 'VICTORY',
      levelName: 'Solid',
      finalScore: 4832,
      isNewHighScore: true,
      timeBonus: 2332,
      timeLeft: 23.3,
      flipBonus: 0,
      flipsCount: 42,
      streakBonus: 2500,
      multiplier: 1.0,
      newUnlocks: [],
    });
  }

  console.log('Color Flip Web Lens ready!');
});
