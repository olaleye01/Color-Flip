import { initSnapchat, getSaveState } from './snapchat.js';
import { Board3D } from './board3d.js';
import { GameEngine } from './game.js';
import { UIController } from './ui.js';
import { sound } from './audio.js';

// Suppress default context menu (fires on touch & hold in mobile webviews)
window.addEventListener('contextmenu', (event) => event.preventDefault());

window.addEventListener('DOMContentLoaded', async () => {
  console.log('Color Flip Web Lens initializing...');

  const canvas = document.getElementById('application-canvas');
  if (!canvas) {
    console.error('Canvas #application-canvas not found!');
    return;
  }

  // Render the welcome board while Snapchat initializes the player's profile.
  const saveReady = initSnapchat().catch((err) => {
    console.warn('Snapchat initialization fallback:', err);
    return getSaveState();
  });

  const board3D = new Board3D(canvas);
  const game = new GameEngine(board3D);
  const ui = new UIController(game);

  if (typeof window !== 'undefined') {
    window.game = game;
    window.ui = ui;
  }

  // Snapchat lifecycle: Pause game and suspend Web Audio when webview is in background
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      sound.suspend();
      game.pause();
    } else {
      sound.resume();
      game.resume();
    }
  });

  game.init(await saveReady);

  // Developer preview modes: ?preview=victory and ?preview=timeup
  const preview = new URLSearchParams(window.location.search).get('preview');
  if (preview === 'victory') {
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
    ui.showFlexCard({ status: 'TIME_UP' });
  }

  console.log('Color Flip Web Lens ready!');
});
