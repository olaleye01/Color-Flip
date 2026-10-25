// src/snapchat.js
// Snapchat Web Lens API Integration complying with official specifications:
// - Storage: Account-bound key/value persistence with chained writes and cold-start read safety
// - Leaderboards: Integer score submission without deprecated parameters and native modal presentation
// - Bitmoji: 2D avatar extraction with variant retirement fallbacks and bundled default character
// - Lifecycle: Visibilitychange auto-save and Android safe haptics

let snapchatModule = null;

// Default Save State schema (< 250 Bytes, well below the 32 KiB per-value cap)
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

// Storage promise chain & cold-start read guard per Snap Storage Recipe
let storageLoaded = false; // No writes until first read answers (prevents overwriting cold-start data)
let storagePending = Promise.resolve(); // Single serialized promise chain prevents in-flight ERR_QUOTA_EXCEEDED

/**
 * Initialize Snapchat Web Lens API
 * Must be called once at startup before any capability checks.
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
      console.log('Snapchat Web Lens API initialized successfully. Stub mode:', isStub());
    }
  } catch (err) {
    console.warn('Snapchat Web Lens API init fallback mode:', err?.message || err);
    snapchatModule = null;
  }

  // 1. Load persistent save data
  currentSaveState = await loadSaveState();

  // 2. Fetch Bitmoji (2D Large Avatar)
  bitmojiAvatarUrl = await fetchBitmoji2D();

  isInitialized = true;
  return currentSaveState;
}

/**
 * Returns true if the host serves the given capability
 */
export function isCapabilitySupported(cap, minVersion = 1) {
  try {
    if (snapchatModule && typeof snapchatModule.isSupported === 'function') {
      return snapchatModule.isSupported(cap, minVersion);
    }
  } catch (e) {
    // Ignore
  }
  return false;
}

/**
 * Returns true if running against desktop/browser stub
 */
export function isStub() {
  return Boolean(snapchatModule?.isStub);
}

/**
 * Access stable error codes from the Web Lens API
 */
export function getErrors() {
  return snapchatModule?.errors || {};
}

/**
 * Load Save State from snapchat.storage with localStorage fallback
 * Cold-start safe: awaits any pending operations before reading
 */
export async function loadSaveState() {
  await storagePending;
  let loaded = null;

  if (isCapabilitySupported('storage')) {
    try {
      const result = await snapchatModule.storage.get('save');
      storageLoaded = true;
      if (result && result.found && result.value) {
        loaded = typeof result.value === 'string' ? JSON.parse(result.value) : result.value;
      }
    } catch (e) {
      console.warn('Snapchat storage get failed:', e.message);
    }
  } else {
    // If storage capability is not supported, mark as loaded so in-session/localStorage works
    storageLoaded = true;
  }

  // Fallback to localStorage in web preview / browser development
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
 * Persist save state to snapchat.storage and localStorage fallback
 * Chains writes through one promise to bound concurrent calls and prevent ERR_QUOTA_EXCEEDED
 */
export function persistSaveState(newState) {
  currentSaveState = { ...currentSaveState, ...newState };

  if (isCapabilitySupported('storage')) {
    if (!storageLoaded) {
      // Do not write before initial read answers, to avoid clobbering save data
      return Promise.resolve(currentSaveState);
    }

    storagePending = storagePending
      .then(() => snapchatModule.storage.set('save', currentSaveState))
      .then(
        () => true,
        (e) => {
          console.warn('Snapchat storage set error:', e?.message || e);
          return false;
        }
      );
  }

  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem('color_flip_save', JSON.stringify(currentSaveState));
    } catch (e) {
      // Ignore quota or private browsing mode
    }
  }

  return Promise.resolve(currentSaveState);
}

export function getSaveState() {
  return currentSaveState;
}

/**
 * Bitmoji 2D Avatar fetching with full fallback protection
 * URLs are ephemeral (~5 min) and opaque; they should be assigned directly to an img or texture
 */
export async function fetchBitmoji2D(variant = null) {
  const fallback = './assets/avatar_default.png';

  if (!isCapabilitySupported('bitmoji')) {
    return fallback;
  }

  try {
    const { hasAvatar } = await snapchatModule.bitmoji.getAvatarInfo();
    if (!hasAvatar) {
      return fallback;
    }

    // Discover available variants
    try {
      const vResult = await snapchatModule.bitmoji.getVariants();
      if (vResult && vResult.variants) {
        bitmojiVariants = vResult.variants;
      }
    } catch (e) {
      // Variants are optional
    }

    const options = { size: 'large' };
    if (variant) options.variant = variant;

    let res = null;
    try {
      res = await snapchatModule.bitmoji.get2DAvatar(options);
    } catch (paramErr) {
      // If a curated variant retired, fall back to the default large portrait
      try {
        res = await snapchatModule.bitmoji.get2DAvatar({ size: 'large' });
      } catch (fallbackErr) {
        return fallback;
      }
    }

    if (res && res.url) {
      return res.url;
    }
  } catch (err) {
    console.warn('Bitmoji fetch fallback used:', err?.message || err);
  }

  return fallback;
}

export function getBitmojiUrl() {
  return bitmojiAvatarUrl;
}

/**
 * Leaderboards: Submit integer score without deprecated leaderboardId
 * Higher scores rank first (default ordering: 'descending')
 */
export async function submitRoundScore(finalScore) {
  const safeInt = Math.round(finalScore);

  if (!isCapabilitySupported('leaderboards')) {
    console.log('Leaderboards unsupported. Score achieved:', safeInt);
    return null;
  }

  try {
    // leaderboardId is deprecated and omitted per official spec
    const res = await snapchatModule.leaderboards.submitScore({
      score: safeInt,
      ordering: 'descending',
    });
    return res?.bestScore ?? null;
  } catch (e) {
    console.warn('Leaderboard submitScore error:', e?.message || e);
    return null;
  }
}

/**
 * Show native Snapchat Leaderboard modal
 */
export async function showNativeLeaderboard() {
  if (isCapabilitySupported('leaderboards')) {
    try {
      await snapchatModule.leaderboards.show();
      return true;
    } catch (e) {
      console.warn('snapchat.leaderboards.show error:', e?.message || e);
    }
  }
  return false;
}

/**
 * Safe device haptics (Android only, guarded by userActivation per Snap guidelines)
 */
export function buzz(milliseconds = 35) {
  try {
    if (typeof navigator !== 'undefined' && navigator.userActivation?.hasBeenActive && navigator.vibrate) {
      navigator.vibrate(milliseconds);
    }
  } catch (e) {
    // Ignore
  }
}

// Auto-save when the Lens is sent to background or swiped away
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && storageLoaded) {
      persistSaveState(currentSaveState);
    }
  });
}
