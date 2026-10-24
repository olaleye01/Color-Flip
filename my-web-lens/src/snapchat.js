// src/snapchat.js
// Snapchat Web Lens API Integration with graceful offline & browser fallback

let snapchatModule = null;

// Default Save State schema (< 250 Bytes)
export const DEFAULT_SAVE = {
  highScore: 0,
  cumulativeScore: 0,
  totalGamesWon: 0,
  highestLevelUnlocked: 1,
  fastestClearTimeLeft: 0.0,
  bestFlipCount: 999,
  levelsCleared: [false, false, false, false, false],
  equippedSkin: 0,
};

let currentSaveState = { ...DEFAULT_SAVE };
let isInitialized = false;
let bitmojiAvatarUrl = './assets/avatar_default.png';
let bitmojiVariants = [];

/**
 * Initialize Snapchat Web Lens API
 */
export async function initSnapchat() {
  if (isInitialized) return currentSaveState;

  try {
    if (typeof window !== 'undefined' && window.snapchat) {
      snapchatModule = window.snapchat;
    } else {
      const mod = await import('@snap/web-lens-api');
      snapchatModule = mod.default || mod;
    }

    if (snapchatModule && typeof snapchatModule.init === 'function') {
      await snapchatModule.init();
      console.log('Snapchat Web Lens API initialized successfully.');
    }
  } catch (err) {
    console.warn('Snapchat Web Lens API init skipped / fallback mode:', err?.message || err);
    snapchatModule = null;
  }

  // 1. Load persistent save data
  currentSaveState = await loadSaveState();

  // 2. Fetch Bitmoji
  bitmojiAvatarUrl = await fetchBitmoji2D();

  isInitialized = true;
  return currentSaveState;
}

export function isCapabilitySupported(cap) {
  try {
    if (snapchatModule && typeof snapchatModule.isSupported === 'function') {
      return snapchatModule.isSupported(cap);
    }
  } catch (e) {
    // ignore
  }
  return false;
}

/**
 * Load Save State from snapchat.storage or localStorage fallback
 */
export async function loadSaveState() {
  let loaded = null;

  if (isCapabilitySupported('storage')) {
    try {
      const result = await snapchatModule.storage.get('save');
      if (result && result.found && result.value) {
        loaded = typeof result.value === 'string' ? JSON.parse(result.value) : result.value;
      }
    } catch (e) {
      console.warn('Snapchat storage get failed:', e.message);
    }
  }

  // Fallback to localStorage in web preview
  if (!loaded && typeof localStorage !== 'undefined') {
    try {
      const local = localStorage.getItem('color_flip_save');
      if (local) {
        loaded = JSON.parse(local);
      }
    } catch (e) {
      console.warn('Local storage read error:', e);
    }
  }

  if (loaded) {
    currentSaveState = {
      ...DEFAULT_SAVE,
      ...loaded,
      levelsCleared: Array.isArray(loaded.levelsCleared) ? loaded.levelsCleared : DEFAULT_SAVE.levelsCleared,
    };
  } else {
    currentSaveState = { ...DEFAULT_SAVE };
  }

  return currentSaveState;
}

/**
 * Save state to snapchat.storage and localStorage fallback
 */
export async function persistSaveState(newState) {
  currentSaveState = { ...currentSaveState, ...newState };

  if (isCapabilitySupported('storage')) {
    try {
      await snapchatModule.storage.set('save', currentSaveState);
    } catch (e) {
      console.warn('Snapchat storage set error:', e.message);
    }
  }

  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem('color_flip_save', JSON.stringify(currentSaveState));
    } catch (e) {
      // quota or private mode
    }
  }

  return currentSaveState;
}

export function getSaveState() {
  return currentSaveState;
}

/**
 * Bitmoji 2D Avatar fetching with fallback
 */
export async function fetchBitmoji2D(variant = null) {
  let fallback = './assets/avatar_default.png';

  if (!isCapabilitySupported('bitmoji')) {
    return fallback;
  }

  try {
    const { hasAvatar } = await snapchatModule.bitmoji.getAvatarInfo();
    if (!hasAvatar) {
      return fallback;
    }

    try {
      const vResult = await snapchatModule.bitmoji.getVariants();
      if (vResult && vResult.variants) {
        bitmojiVariants = vResult.variants;
      }
    } catch (e) {
      // optional
    }

    const options = { size: 'large' };
    if (variant) options.variant = variant;

    let res = null;
    try {
      res = await snapchatModule.bitmoji.get2DAvatar(options);
    } catch (paramErr) {
      // Fallback without variant if ERR_INVALID_PARAMS
      res = await snapchatModule.bitmoji.get2DAvatar({ size: 'large' });
    }

    if (res && res.url) {
      return res.url;
    }
  } catch (err) {
    console.warn('Bitmoji fetch fallback used:', err.message);
  }

  return fallback;
}

export function getBitmojiUrl() {
  return bitmojiAvatarUrl;
}

/**
 * Leaderboards integration
 */
export async function submitRoundScore(finalScore) {
  const safeInt = Math.round(finalScore);

  if (!isCapabilitySupported('leaderboards')) {
    console.log('Leaderboards unsupported. Score achieved:', safeInt);
    return null;
  }

  try {
    const res = await snapchatModule.leaderboards.submitScore({
      leaderboardId: 'main',
      score: safeInt,
    });
    return res?.bestScore ?? null;
  } catch (e) {
    console.warn('Leaderboard submitScore error:', e.message);
    return null;
  }
}

export async function showNativeLeaderboard() {
  if (isCapabilitySupported('leaderboards')) {
    try {
      await snapchatModule.leaderboards.show();
      return true;
    } catch (e) {
      console.warn('snapchat.leaderboards.show error:', e.message);
    }
  }
  return false;
}
