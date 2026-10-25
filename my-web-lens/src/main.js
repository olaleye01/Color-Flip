import { initSnapchat, getBitmojiUrl, getSaveState } from './snapchat.js';
import { Board3D } from './board3d.js';
import { GameEngine } from './game.js';
import { UIController } from './ui.js';
import { LoadingScreen } from './loading.js';

window.addEventListener('DOMContentLoaded', async () => {
  console.log('Color Flip Web Lens initializing...');

  const loading = new LoadingScreen();
  if (typeof window !== 'undefined') {
    window.loadingScreen = loading;
  }

  // Developer preview mode: ?preview=...
  const urlParams = new URLSearchParams(window.location.search);
  const preview = urlParams.get('preview');

  if (preview === 'loading') {
    // 65% progress matching inspiration image; tip is shuffled on every load
    loading.setProgress(65);
    const tipParam = urlParams.get('tip');
    if (tipParam !== null && !isNaN(parseInt(tipParam, 10))) {
      loading.setTipByIndex(parseInt(tipParam, 10));
    }
    return;
  } else if (preview === 'loading-loop') {
    const runLoop = async () => {
      while (true) {
        loading.setProgress(0);
        await loading.animateTo(35, 500);
        await loading.animateTo(65, 600);
        await loading.animateTo(90, 400);
        await loading.animateTo(100, 300);
        await new Promise((r) => setTimeout(r, 1200));
      }
    };
    runLoop();
    return;
  }

  // Step 1: Initial boot phase
  await loading.animateTo(25, 200);

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
  await loading.animateTo(50, 200);

  // 3. Initialize PlayCanvas 3D Board
  const board3D = new Board3D(canvas);
  await loading.animateTo(75, 200);

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
  if (preview === 'victory') {
    loading.hide();
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
  } else if (preview === 'timeup') {
    loading.hide();
    ui.showFlexCard({ status: 'TIME_UP' });
  } else {
    // Normal launch: smooth complete to 100% and fade out
    await loading.finish();
  }

  console.log('Color Flip Web Lens ready!');
});
