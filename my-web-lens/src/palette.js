// src/palette.js
// Procedural Swatch Pools & Emblem Skins for Color Flip

export const LEVELS = [
  {
    id: 1,
    name: 'Solid',
    subtitle: 'Studio Matte',
    multiplier: 1.0,
    multiplierLabel: '1.00x SCORE',
    unlockDesc: 'Unlocked at Start',
    unlockReq: null,
    aesthetic: 'studio-matte',
    boardBg: '#F3F4F6',
    boardBorder: '#E5E7EB',
    trayColor: '#FFFFFF',
    tileEdgeColor: '#E2E8F0',
    lightEnv: 'neutral-studio',
  },
  {
    id: 2,
    name: 'Gradient',
    subtitle: 'Satin Sunset',
    multiplier: 1.25,
    multiplierLabel: '1.25x SCORE',
    unlockDesc: 'Clear Level 1 once',
    unlockReq: { type: 'level_cleared', targetLevel: 1 },
    aesthetic: 'satin-sunset',
    boardBg: '#2A1F2D',
    boardBorder: '#E0A96D',
    trayColor: '#3D2C3F',
    tileEdgeColor: '#D4AF37',
    lightEnv: 'golden-hour',
  },
  {
    id: 3,
    name: 'Center Glow',
    subtitle: 'Neon Obsidian',
    multiplier: 1.5,
    multiplierLabel: '1.50x SCORE',
    unlockDesc: 'Clear Level 2 with >20.0s left',
    unlockReq: { type: 'time_left', targetLevel: 2, minTime: 20.0 },
    aesthetic: 'neon-obsidian',
    boardBg: '#090B10',
    boardBorder: '#00E5FF',
    trayColor: '#121620',
    tileEdgeColor: '#00F0FF',
    lightEnv: 'cyber-bloom',
  },
  {
    id: 4,
    name: 'Split',
    subtitle: 'Bauhaus Glass',
    multiplier: 1.75,
    multiplierLabel: '1.75x SCORE',
    unlockDesc: 'Clear Level 3 in ≤26 flips',
    unlockReq: { type: 'max_flips', targetLevel: 3, maxFlips: 26 },
    aesthetic: 'bauhaus-glass',
    boardBg: '#1E2124',
    boardBorder: '#94A3B8',
    trayColor: '#2D3238',
    tileEdgeColor: '#E2E8F0',
    lightEnv: 'high-contrast-architectural',
  },
  {
    id: 5,
    name: 'Mixed',
    subtitle: 'Holographic Prism (Master)',
    multiplier: 2.5,
    multiplierLabel: '2.50x SCORE',
    unlockDesc: 'Clear Level 4 OR reach 25k Score',
    unlockReq: { type: 'mixed_or_score', targetLevel: 4, minCumulative: 25000 },
    aesthetic: 'holographic-prism',
    boardBg: '#130924',
    boardBorder: '#DA22FF',
    trayColor: '#21133D',
    tileEdgeColor: '#00E5FF',
    lightEnv: 'rainbow-iridescent',
  },
];

// Level 1: Solid
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

// Level 2: Gradient (45° linear blend)
export const GRADIENT_SWATCHES = [
  { id: 'g1', name: 'Sunset Fade', type: 'gradient', colorA: '#FF512F', colorB: '#DD2476', angle: 45 },
  { id: 'g2', name: 'Ocean Abyss', type: 'gradient', colorA: '#00C6FF', colorB: '#0072FF', angle: 45 },
  { id: 'g3', name: 'Cyber Mint', type: 'gradient', colorA: '#11998E', colorB: '#38EF7D', angle: 45 },
  { id: 'g4', name: 'Solar Flare', type: 'gradient', colorA: '#F7971E', colorB: '#FFD200', angle: 45 },
  { id: 'g5', name: 'Cosmic Berry', type: 'gradient', colorA: '#8E2DE2', colorB: '#4A00E0', angle: 45 },
  { id: 'g6', name: 'Bubblegum Pop', type: 'gradient', colorA: '#FF758C', colorB: '#FF7EB3', angle: 45 },
  { id: 'g7', name: 'Neon Magma', type: 'gradient', colorA: '#FF0844', colorB: '#FFB199', angle: 45 },
  { id: 'g8', name: 'Arctic Aurora', type: 'gradient', colorA: '#00F2FE', colorB: '#4FACFE', angle: 45 },
  { id: 'g9', name: 'Ultraviolet', type: 'gradient', colorA: '#DA22FF', colorB: '#9733EE', angle: 45 },
  { id: 'g10', name: 'Kiwi Crush', type: 'gradient', colorA: '#DCE35B', colorB: '#45B649', angle: 45 },
  { id: 'g11', name: 'Dusk Horizon', type: 'gradient', colorA: '#2C3E50', colorB: '#FD746C', angle: 45 },
  { id: 'g12', name: 'Liquid Silver', type: 'gradient', colorA: '#757F9A', colorB: '#D7DDE8', angle: 45 },
];

// Level 3: Center Glow (Radial Core to Rim)
export const GLOW_SWATCHES = [
  { id: 'c1', name: 'Reactor Cyan', type: 'glow', coreColor: '#00FFFF', rimColor: '#081B33', inverted: false },
  { id: 'c2', name: 'Plasma Core', type: 'glow', coreColor: '#FF007F', rimColor: '#1F0021', inverted: false },
  { id: 'c3', name: 'Supernova', type: 'glow', coreColor: '#FFF200', rimColor: '#FF3B00', inverted: false },
  { id: 'c4', name: 'Kryptonite', type: 'glow', coreColor: '#39FF14', rimColor: '#052614', inverted: false },
  { id: 'c5', name: 'Void Eclipse', type: 'glow', coreColor: '#120024', rimColor: '#00E5FF', inverted: true },
  { id: 'c6', name: 'Blood Moon', type: 'glow', coreColor: '#1A0000', rimColor: '#FF1E42', inverted: true },
  { id: 'c7', name: 'Nebula Heart', type: 'glow', coreColor: '#E040FB', rimColor: '#311B92', inverted: false },
  { id: 'c8', name: 'Ember Pulse', type: 'glow', coreColor: '#FF9100', rimColor: '#2D0800', inverted: false },
  { id: 'c9', name: 'Frost Nova', type: 'glow', coreColor: '#FFFFFF', rimColor: '#0088FF', inverted: false },
  { id: 'c10', name: 'Biohazard', type: 'glow', coreColor: '#FFEA00', rimColor: '#1B5E20', inverted: false },
  { id: 'c11', name: 'Synthwave Sun', type: 'glow', coreColor: '#FF00A0', rimColor: '#00E5FF', inverted: false },
  { id: 'c12', name: 'Ghost Pearl', type: 'glow', coreColor: '#ECEFF1', rimColor: '#263238', inverted: false },
];

// Level 4: Split (50/50 Hard geometric cut)
export const SPLIT_SWATCHES = [
  { id: 'sp1', name: 'Cyber Slash A', type: 'split', colorA: '#FF00A0', colorB: '#00E5FF', split: 'diag_tl_br' },
  { id: 'sp2', name: 'Cyber Slash B', type: 'split', colorA: '#00E5FF', colorB: '#FF00A0', split: 'diag_tl_br' }, // Decoy
  { id: 'sp3', name: 'Hazard Split A', type: 'split', colorA: '#FFEA00', colorB: '#111111', split: 'vertical' },
  { id: 'sp4', name: 'Hazard Split B', type: 'split', colorA: '#111111', colorB: '#FFEA00', split: 'horizontal' }, // Decoy
  { id: 'sp5', name: 'Fire & Ice A', type: 'split', colorA: '#FF1E42', colorB: '#0066FF', split: 'diag_tl_br' },
  { id: 'sp6', name: 'Fire & Ice B', type: 'split', colorA: '#0066FF', colorB: '#FF1E42', split: 'diag_tl_br' }, // Decoy
  { id: 'sp7', name: 'Toxic Violet A', type: 'split', colorA: '#00E676', colorB: '#7C4DFF', split: 'vertical' },
  { id: 'sp8', name: 'Toxic Violet B', type: 'split', colorA: '#7C4DFF', colorB: '#00E676', split: 'horizontal' }, // Decoy
  { id: 'sp9', name: 'Sunset Block A', type: 'split', colorA: '#FF6D00', colorB: '#283593', split: 'diag_tl_br' },
  { id: 'sp10', name: 'Sunset Block B', type: 'split', colorA: '#283593', colorB: '#FF6D00', split: 'diag_tl_br' }, // Decoy
  { id: 'sp11', name: 'Mint Coral A', type: 'split', colorA: '#1DE9B6', colorB: '#FF6E6E', split: 'vertical' },
  { id: 'sp12', name: 'Mono Split', type: 'split', colorA: '#FFFFFF', colorB: '#263238', split: 'diag_tl_br' },
];

// Level 5: Cross-Pattern Color Clusters
export const CLUSTERS = {
  neon_cyber: {
    solid: SOLID_SWATCHES.find(s => s.id === 's5'), // Hyper Magenta
    gradient: GRADIENT_SWATCHES.find(s => s.id === 'g9'), // Ultraviolet
    glow: GLOW_SWATCHES.find(s => s.id === 'c11'), // Synthwave Sun
    split: SPLIT_SWATCHES.find(s => s.id === 'sp1'), // Cyber Slash A
  },
  solar_heat: {
    solid: SOLID_SWATCHES.find(s => s.id === 's4'), // Solar Yellow
    gradient: GRADIENT_SWATCHES.find(s => s.id === 'g4'), // Solar Flare
    glow: GLOW_SWATCHES.find(s => s.id === 'c3'), // Supernova
    split: SPLIT_SWATCHES.find(s => s.id === 'sp3'), // Hazard Split A
  },
  deep_ocean: {
    solid: SOLID_SWATCHES.find(s => s.id === 's6'), // Cyber Cyan
    gradient: GRADIENT_SWATCHES.find(s => s.id === 'g2'), // Ocean Abyss
    glow: GLOW_SWATCHES.find(s => s.id === 'c1'), // Reactor Cyan
    split: SPLIT_SWATCHES.find(s => s.id === 'sp6'), // Fire & Ice B
  },
  bio_emerald: {
    solid: SOLID_SWATCHES.find(s => s.id === 's3'), // Acid Green
    gradient: GRADIENT_SWATCHES.find(s => s.id === 'g3'), // Cyber Mint
    glow: GLOW_SWATCHES.find(s => s.id === 'c4'), // Kryptonite
    split: SPLIT_SWATCHES.find(s => s.id === 'sp7'), // Toxic Violet A
  },
};

// Cosmetic Tile Back Emblem Skins
export const EMBLEM_SKINS = [
  {
    id: 0,
    name: 'Classic Snap Emblem',
    key: 'classic',
    description: 'Default starting tile back',
    unlockedByDefault: true,
    condition: 'Default',
  },
  {
    id: 1,
    name: 'Neon Prism Crest',
    key: 'prism',
    description: 'Unlocked after 5 total wins',
    unlockedByDefault: false,
    condition: '5 Total Wins',
    checkUnlock: (save) => (save.totalGamesWon || 0) >= 5,
  },
  {
    id: 2,
    name: '24K Gold Foil Emblem',
    key: 'gold',
    description: 'Cleared board in ≤18 flips',
    unlockedByDefault: false,
    condition: 'Clear board in ≤18 flips',
    checkUnlock: (save) => (save.bestFlipCount && save.bestFlipCount <= 18),
  },
  {
    id: 3,
    name: 'Bitmoji Stamp',
    key: 'bitmoji',
    description: 'Clear Level 5 (Mixed) once',
    unlockedByDefault: false,
    condition: 'Clear Level 5',
    checkUnlock: (save) => (save.levelsCleared && save.levelsCleared[4] === true),
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

// Generate the 8-pair board (16 tiles total)
export function generateBoardPairs(levelId) {
  let selectedSwatches = [];

  if (levelId === 1) {
    selectedSwatches = shuffle(SOLID_SWATCHES).slice(0, 8);
  } else if (levelId === 2) {
    selectedSwatches = shuffle(GRADIENT_SWATCHES).slice(0, 8);
  } else if (levelId === 3) {
    selectedSwatches = shuffle(GLOW_SWATCHES).slice(0, 8);
  } else if (levelId === 4) {
    // Split: balance standard and inverted decoy pairs
    selectedSwatches = shuffle(SPLIT_SWATCHES).slice(0, 8);
  } else if (levelId === 5) {
    // Mixed: 2 Solid + 2 Gradient + 2 Glow + 2 Split
    // Prioritize 2 clusters to create cross-pattern cognitive color traps!
    const clusterKeys = shuffle(Object.keys(CLUSTERS));
    const clusterA = CLUSTERS[clusterKeys[0]];
    const clusterB = CLUSTERS[clusterKeys[1]];

    selectedSwatches = [
      clusterA.solid,
      clusterB.solid,
      clusterA.gradient,
      clusterB.gradient,
      clusterA.glow,
      clusterB.glow,
      clusterA.split,
      clusterB.split,
    ];
  } else {
    selectedSwatches = shuffle(SOLID_SWATCHES).slice(0, 8);
  }

  // Duplicate each swatch to form pairs (8 * 2 = 16 tiles)
  const paired = [];
  selectedSwatches.forEach((swatch, idx) => {
    paired.push({ ...swatch, pairIndex: idx, instanceId: `${swatch.id}_a` });
    paired.push({ ...swatch, pairIndex: idx, instanceId: `${swatch.id}_b` });
  });

  return shuffle(paired);
}
