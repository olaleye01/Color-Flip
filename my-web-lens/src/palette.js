// src/palette.js
// Procedural Swatch Pool (Solid Category) & Emblem Skins for Color Flip

export const GAME_MODE = {
  id: 1,
  name: 'Solid',
  subtitle: 'Neon Arcade',
  multiplier: 1.0,
  boardBg: 'transparent', // CSS stage backdrop shows through the WebGL canvas
  boardBorder: '#3D8BFF',
  trayColor: '#141B42',
  trayRimColor: '#3D8BFF',
  tileEdgeColor: '#101634',
  lightEnv: 'neon-arcade',
};

export const LEVELS = [GAME_MODE];

// High-contrast, vibrant solid swatches (12 total for 495 unique 8-pair board combinations)
export const SOLID_SWATCHES = [
  { id: 's1', name: 'Crimson Red', type: 'solid', colorA: '#FF1E42' },
  { id: 's2', name: 'Electric Blue', type: 'solid', colorA: '#0066FF' },
  { id: 's3', name: 'Acid Green', type: 'solid', colorA: '#00E676' },
  { id: 's4', name: 'Solar Yellow', type: 'solid', colorA: '#FFEA00' },
  { id: 's5', name: 'Hyper Magenta', type: 'solid', colorA: '#FF00A0' },
  { id: 's6', name: 'Cyber Cyan', type: 'solid', colorA: '#00E5FF' },
  { id: 's7', name: 'Tangerine Orange', type: 'solid', colorA: '#FF6D00' },
  { id: 's8', name: 'Royal Violet', type: 'solid', colorA: '#7C4DFF' },
  { id: 's9', name: 'Mint Teal', type: 'solid', colorA: '#1DE9B6' },
  { id: 's10', name: 'Coral Peach', type: 'solid', colorA: '#FF6E6E' },
  { id: 's11', name: 'Indigo Night', type: 'solid', colorA: '#283593' },
  { id: 's12', name: 'Pure Titanium', type: 'solid', colorA: '#ECEFF1' },
];

// Cosmetic Tile Back Emblems (Center emblem on face-down side)
export const EMBLEM_SKINS = [
  {
    id: 0,
    name: 'Classic Snap',
    key: 'classic',
    description: 'Default Snapchat ghost silhouette',
    unlockedByDefault: true,
    condition: 'Unlocked by default',
    checkUnlock: () => true,
  },
  {
    id: 1,
    name: 'Neon Prism',
    key: 'neon',
    description: 'Win 5 games total',
    unlockedByDefault: false,
    condition: '5 Total Wins',
    checkUnlock: (save) => (save.totalGamesWon || 0) >= 5,
  },
  {
    id: 2,
    name: '24K Gold Foil',
    key: 'gold',
    description: 'Clear the board in ≤18 flips (Peak Memory)',
    unlockedByDefault: false,
    condition: '≤18 Flips Victory',
    checkUnlock: (save) => Boolean(save.bestFlipCount && save.bestFlipCount <= 18),
  },
  {
    id: 3,
    name: 'Bitmoji Stamp',
    key: 'bitmoji',
    description: 'Win 10 games or clear in ≤16 flips',
    unlockedByDefault: false,
    condition: '10 Wins or ≤16 Flips',
    checkUnlock: (save) => Boolean((save.totalGamesWon || 0) >= 10 || (save.bestFlipCount && save.bestFlipCount <= 16)),
  },
];

// Helper to shuffle array
export function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Generate the 8-pair board (16 tiles total) exclusively from Solid Swatches
export function generateBoardPairs() {
  const selectedSwatches = shuffle(SOLID_SWATCHES).slice(0, 8);

  // Duplicate each swatch to form pairs (8 * 2 = 16 tiles)
  const paired = [];
  selectedSwatches.forEach((swatch, idx) => {
    paired.push({ ...swatch, pairIndex: idx, instanceId: `${swatch.id}_a` });
    paired.push({ ...swatch, pairIndex: idx, instanceId: `${swatch.id}_b` });
  });

  return shuffle(paired);
}
