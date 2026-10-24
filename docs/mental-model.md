# Project Brief: Color Flip

## 1. Executive Summary
* **Title:** Color Flip
* **Platform:** Snapchat Web Lens (Built in PlayCanvas, packaged as a self-contained static `.zip` with `index.html` at the root)
* **SDK Package:** `@snap/web-lens-api` (`window.snapchat`) bundled locally (loaded `Before Engine` in PlayCanvas Editor or bundled via Vite) to comply with Snapchat's strict Content Security Policy (CSP), which blocks runtime external network requests.
* **Orientation & Input:** 9:16 Vertical Portrait; Single-Thumb Touch Control
* **Core Concept:** A fast-paced, 3D visual-memory color matching game played on a 4x4 grid. Players select from 5 progressively challenging color-shader levels—**Solid, Gradient, Center Glow, Split, and Mixed**. When the player clicks **"Play"**, all 16 face-up tiles initiate a **2.5-second (2–3s) Live Color Shuffle**, randomly lock into a final 8-pair layout for a **1.5-second (1–2s) Memorization Window**, and then flip face-down to start the 60.0-second clock. Scores are calculated from remaining time, flip efficiency, combo streaks, and a **Level Difficulty Multiplier**. The game uses 100% procedural shaders and integrates the official **Snapchat Web Lens API** (`snapchat.bitmoji`, `snapchat.leaderboards`, and `snapchat.storage`).

---

## 2. Core Gameplay Mechanics

### A. Pre-Round Sequence: Play Trigger, Shuffle & Peek Phase
The board remains in a calm, idle state during level selection and only initiates the scramble when the player commits to starting the round:
1. **Idle Pre-Game State:** While browsing levels on the pre-game overlay, the 4x4 board sits idle in the background showcasing a static preview of the selected level's aesthetic.
2. **"Play" Trigger & Face-Up Color Shuffle (2–3 Seconds):** The shuffle **only begins when the user clicks "Play"** (or **"Restart"**). All 16 tiles orient **face-up**, and the procedural color swatches rapidly cycle and scramble across the 4x4 grid for **2.5 seconds** (configurable between 2.0s–3.0s) like an arcade slot machine, paired with a rising rhythmic shuffle sound effect.
3. **Random Layout Lock-In & Memorization Peek (1–2 Seconds):** After the 2–3 second shuffle concludes, the generator locks in the final randomized 8-pair layout with a snappy camera pulse. This locked layout stays displayed **face-up for 1.5 seconds** (configurable between 1.0s–2.0s), giving the player a brief, high-stakes window to memorize key pair positions while tile tapping remains disabled.
4. **The Cascade Flip-Down (0.4 Seconds):** Once the 1–2 second display window ends, all 16 tiles flip **face-down** in a rapid diagonal wave across the 4x4 grid.
5. **Timer Start:** The moment the tiles finish flipping face-down, touch input unlocks and the **60.0-second countdown clock** begins ticking.

### B. The Turn Loop & Resolution
* **The Grid:** A 4x4 layout of 16 tiles containing **8 matching pairs** randomly pulled from a pool of 12 procedural color swatches per level (yielding 495 unique board layouts per level).
* **The Turn Loop:**
  * Players tap two face-down tiles per turn.
  * **Match:** Both tiles lock face-up with a 3D spring-pop animation and a level-specific light/particle burst. Consecutive matches increase the **Streak Multiplier**.
  * **Mismatch:** Both tiles shake briefly and flip back face-down after a **0.65-second delay**.
* **Urgency State (Final 10 Seconds):** At `00:10`, the 3D board frame subtly vibrates to the beat of a ticking clock that accelerates from `1.0x` to `1.5x` speed as time runs out.
* **Win/Loss Conditions:**
  * **Win:** Matching all 8 pairs before `00:00` stops the clock, applies the Level Multiplier to calculate the final integer score, writes career progress via `snapchat.storage.set()`, and submits the score via `snapchat.leaderboards.submitScore()` before opening the native Snapchat leaderboard panel (`snapchat.leaderboards.show()`).
  * **Loss:** Reaching `00:00` triggers a "Time's Up" state with zero points awarded and an instant retry button (which triggers a fresh 2–3s Face-Up Shuffle).

---

## 3. Official Snapchat Web Lens API Architecture (`@snap/web-lens-api`)

Per the official Snapchat Web Lens documentation, `localStorage` and `IndexedDB` reset whenever a Web Lens closes, and runtime external network requests are blocked by CSP. **Color Flip** initializes the Web Lens API at startup (`await snapchat.init()`) and checks capability support via `snapchat.isSupported()` before invoking any feature.

### A. Initialization & Capability Check
* Must call `await snapchat.init()` once before checking capabilities (`isSupported()` returns `false` until `init()` resolves).
* Gracefully handle `ERR_UNSUPPORTED_HOST`, `ERR_UNKNOWN_CAPABILITY`, and `ERR_INTERNAL` so the game remains 100% playable even if a capability is unavailable on a specific device or host version.

### B. Bitmoji API (`snapchat.bitmoji`)
The `bitmoji` capability describes **only the current player** (either as a head-and-shoulders 2D image or a rigged 3D `.glb` model):
* **Mandatory Local Fallback:** Per platform requirements, `hasAvatar` may be `false` (if the user has no Bitmoji) or media calls may reject with `ERR_INTERNAL`. The game zip **must** include fallback assets (`./assets/avatar_default.png` and `./assets/avatar_default.glb`) so an empty character is never shown.
* **2D HUD Reactions & Tile Back Stamp:**
  * Check `const { hasAvatar } = await snapchat.bitmoji.getAvatarInfo()`.
  * Fetch available pose variants via `const { variants } = await snapchat.bitmoji.getVariants()` and load 2D head-and-shoulders images via `await snapchat.bitmoji.get2DAvatar({ variant, size: 'large' })` (falling back to default without `variant` if `ERR_INVALID_PARAMS` occurs).
  * **Important URL Expiry Rule:** Bitmoji URLs returned by `get2DAvatar()` and `get3DAvatar()` expire after **~5 minutes**—textures must be loaded into PlayCanvas immediately after fetching.
* **3D Bitmoji Spectator (Optional Top-Bar 3D Avatar):**
  * Load via `const { url } = await snapchat.bitmoji.get3DAvatar()`, fetch as an `arrayBuffer()`, and pass to PlayCanvas's GLB container loader.

### C. Leaderboards API (`snapchat.leaderboards`)
* **Submission Rules:**
  * Checked via `snapchat.isSupported('leaderboards')` (hide leaderboard UI if `false`).
  * `score` **must be a safe integer** (`Math.round(finalScore)`). Non-integers reject with `ERR_INVALID_PARAMS`.
  * Ordering defaults to `'descending'` (higher scores rank first), which matches **Color Flip**'s scoring system.
* **Native Panel Presentation:**
  * Call `const { bestScore } = await snapchat.leaderboards.submitScore({ leaderboardId: 'main', score: Math.round(finalScore) })`.
  * `bestScore` is optional in the response; if present, update the HUD's Personal Best label.
  * Immediately call `await snapchat.leaderboards.show()` at game win (or via the "Leaderboard" button) to open Snapchat's native leaderboard panel where players see how they rank against friends.

### D. Persistent Storage API (`snapchat.storage`)
* **Platform & Quota Rules:**
  * Checked via `snapchat.isSupported('storage')`. (Note: Persistent storage is currently available on iOS; on unsupported platforms or when `ERR_STORAGE_UNAVAILABLE` occurs, fall back to in-session memory so the game remains playable, or unlock all levels for the session).
  * **Quotas:** Max `100 KiB` total per Lens, max `256` keys, max `32 KiB` JSON per value, key length `1–256` bytes.
  * **Rate Limit Rule:** Too many concurrent storage calls in flight reject with `ERR_QUOTA_EXCEEDED` (leaving the previous save intact). Only read once at startup (`snapchat.storage.get('save')`) and write once at round completion (`snapchat.storage.set('save', state)`).
  * Check `const { persistenceMode } = await snapchat.storage.getInfo()` (`'disk'` on device vs `'memory'` in Lens Studio preview / desktop stub).

### Storage API Data Schema (`key: 'save'`, < 250 Bytes)
```json
{
  "highScore": 0,
  "cumulativeScore": 0,
  "totalGamesWon": 0,
  "highestLevelUnlocked": 1,
  "fastestClearTimeLeft": 0.0,
  "bestFlipCount": 999,
  "levelsCleared": [false, false, false, false, false],
  "equippedSkin": 0
}
```

### Reference API Integration Pattern (PlayCanvas)
```javascript
import snapchat from '@snap/web-lens-api';

async function initSnapServices() {
  await snapchat.init();

  // 1. Load Save Data
  let saveState = DEFAULT_SAVE;
  if (snapchat.isSupported('storage')) {
    try {
      const result = await snapchat.storage.get('save');
      if (result.found && result.value) {
        saveState = result.value;
      }
    } catch (e) {
      console.warn('Storage load fallback:', e.message);
    }
  }

  // 2. Load Player Bitmoji (with mandatory local fallback)
  let avatarUrl = './assets/avatar_default.png';
  if (snapchat.isSupported('bitmoji')) {
    try {
      const { hasAvatar } = await snapchat.bitmoji.getAvatarInfo();
      if (hasAvatar) {
        const image = await snapchat.bitmoji.get2DAvatar({ size: 'large' });
        avatarUrl = image.url; // Render immediately (< 5 min expiry)
      }
    } catch (e) {
      console.warn('Bitmoji fallback used:', e.message);
    }
  }

  return { saveState, avatarUrl };
}

async function onRoundVictory(finalScore, updatedSaveState) {
  // 1. Persist Save State
  if (snapchat.isSupported('storage')) {
    try {
      await snapchat.storage.set('save', updatedSaveState);
    } catch (e) {
      console.warn('Save failed:', e.message);
    }
  }

  // 2. Submit Integer Score & Open Native Snapchat Leaderboard Panel
  if (snapchat.isSupported('leaderboards')) {
    try {
      const { bestScore } = await snapchat.leaderboards.submitScore({
        leaderboardId: 'main',
        score: Math.round(finalScore), // Must be safe integer
      });
      await snapchat.leaderboards.show();
      return bestScore;
    } catch (e) {
      console.warn('Leaderboard unavailable:', e.message);
    }
  }
}
```

---

## 4. Scoring Formula & Level Multipliers
Because players get a **1–2 second Memorization Peek** right after the 2–3 second shuffle locks in, skilled players can aim for near-perfect 16-to-20 flip runs. To ensure players who master harder visual-memory levels rank highest on `snapchat.leaderboards`, each round's base score is scaled by a **Level Multiplier** and rounded to a strict integer:

$$\text{Base Score} = (\text{Seconds Left} \times 100) + \max(0, 4000 - (\text{Total Flips} \times 100)) + \text{Streak Bonus}$$

$$\text{Final Score} = \text{Math.round}(\text{Base Score} \times \text{Level Multiplier})$$

* **Time Left Bonus:** Calculated to 0.1s precision to prevent leaderboard ties (e.g., $32.4\text{s remaining} = 3,240\text{ pts}$).
* **Flip Efficiency Bonus:** Minimum possible flips is 16 (8 turns—a perfect 100% memorized board), awarding $2,400\text{ pts}$. A strong 22-flip (11-turn) game awards $1,800\text{ pts}$. Spamming 40+ flips reduces the efficiency bonus to $0\text{ pts}$.
* **Streak Bonus:** $+250\text{ pts}$ for each consecutive match made without an error.

### Level Score Multiplier Table
| Level | Mode Name | Level Multiplier | Benchmark Score (30.0s left, 24 flips, +500 streak) | Perfect Memory Score (45.0s left, 16 flips, +1750 streak) |
| :--- | :--- | :--- | :--- | :--- |
| **Level 1** | **Solid** | **$1.00\times$** | $5,100\text{ pts}$ | $8,650\text{ pts}$ |
| **Level 2** | **Gradient** | **$1.25\times$** | $6,375\text{ pts}$ | $10,813\text{ pts}$ |
| **Level 3** | **Center Glow** | **$1.50\times$** | $7,650\text{ pts}$ | $12,975\text{ pts}$ |
| **Level 4** | **Split** | **$1.75\times$** | $8,925\text{ pts}$ | $15,138\text{ pts}$ |
| **Level 5** | **Mixed (Master)** | **$2.50\times$** | $12,750\text{ pts}$ | $21,625\text{ pts}$ |

---

## 5. Progression System & Milestone Unlocks

### A. Level Unlock Tiers
Players begin with **Level 1 (Solid)** unlocked and unlock each subsequent tier via `snapchat.storage`:

| Level | Pattern Type | Availability | Unlock Milestone | Cognitive Challenge During the 1–2s Peek |
| :--- | :--- | :--- | :--- | :--- |
| **1. Solid** | Flat Single Color | Unlocked at Start | Default | **Easy:** Players can quickly anchor 3–4 pairs verbally ("Red corners, Blue middle") during the 1–2s peek. |
| **2. Gradient** | 45° Smooth Linear Blend | **Locked** | Clear **Level 1** once | **Medium:** Harder to name colors verbally during the 1–2s peek; forces tracking of two-tone blends. |
| **3. Center Glow** | Radial Core-to-Edge Glow | **Locked** | Clear **Level 2** with **>20.0s left** | **Hard:** Shared dark outer rims camouflage the inner core hues during the brief 1–2s reveal. |
| **4. Split** | 50/50 Hard Geometric Cut | **Locked** | Clear **Level 3** in **26 flips or fewer** | **Very Hard:** Inverted decoy pairs (e.g., *Pink/Cyan* vs *Cyan/Pink*) create false memories during the peek. |
| **5. Mixed** | All 4 Styles Combined | **Locked** | Clear **Level 4** OR reach **25,000 Cumulative Score** | **Extreme:** 2 pairs of each style on one board using overlapping colors; forces memorization of *both* color and shader pattern in 1–2 seconds. |

### B. Cosmetic Tile Backs (Center Emblem Skins)
While the 3D board frame and tile surface material match the active level, players can customize the **center emblem on the face-down side of the tiles**:
1. **Classic Snap Emblem:** Default starting tile back.
2. **Neon Prism Crest:** Unlocked after **5 total wins**.
3. **24K Gold Foil Emblem:** Unlocked by clearing any board in **18 flips or fewer** (9 turns—mastering the 1–2s Peek).
4. **Bitmoji Stamp:** Unlocked after clearing **Level 5 (Mixed)** at least once (stamps the player's `get2DAvatar()` head-and-shoulders image—or the fallback avatar—on the back of every tile).

---

## 6. Level-Specific 3D Boards & Sound Design
Each of the 5 levels features a distinct PlayCanvas 3D board architecture, tile material shader, and lightweight one-shot SFX bank (`0.2s–0.5s` files with `+0.1` rising pitch on combo streaks).

* **Universal Shuffle & Peek Audio (Triggered on "Play"):**
  * **2–3s Shuffle Phase:** Rapid rhythmic synth/card-flutter ticks that gradually decelerate and rise in pitch over 2.5 seconds as the colors scramble across the face-up tiles.
  * **1–2s Lock-In Peek:** A crisp camera-shutter/crystal "Lock" chime when the final layout snaps into place, followed by a tense 2-beat bass pulse while the player memorizes the board.
  * **0.4s Cascade Flip-Down:** A rapid domino-style *whoosh-clack* wave as all 16 tiles flip face-down and the 60.0s timer starts.

| Level | 3D Board & Tile Aesthetic | Match VFX & Lighting | Level Sound Bank (SFX) |
| :--- | :--- | :--- | :--- |
| **1. Solid** *(Studio Matte)* | Clean minimalist white studio tray with soft rounded corners; tactile matte-plastic toy tiles. | Crisp color-matched confetti pop; bright neutral studio softbox lighting. | **Flip:** Tactile plastic/wood tap.<br>**Match:** Upbeat Marimba two-note chord.<br>**Miss:** Soft muted thud.<br>**Win:** Cheerful acoustic chime flourish. |
| **2. Gradient** *(Satin Sunset)* | Warm brushed-champagne aluminum frame; smooth satin-finish tiles with beveled edges. | Soft glowing color-mist puff; warm golden-hour rim lighting. | **Flip:** Smooth satin card slide/tap.<br>**Match:** Warm lo-fi Rhodes synth chord.<br>**Miss:** Low muted bass pluck.<br>**Win:** Dreamy rising synth arpeggio. |
| **3. Center Glow** *(Neon Obsidian)* | Matte-black obsidian monolith board with dark recessed slots; emissive core tiles that cast bloom. | Expanding neon shockwave ring; dark cyber environment with high bloom contrast. | **Flip:** Crisp mechanical switch click.<br>**Match:** Futuristic synth pulse.<br>**Miss:** Low digital "access denied" buzz.<br>**Win:** Sci-fi power-core charge & chime. |
| **4. Split** *(Bauhaus Glass)* | Brutalist concrete and chrome architectural grid; sharp 45°-chamfered glossy acrylic tiles. | Geometric triangle shard burst; sharp high-contrast directional lighting. | **Flip:** Crisp acrylic/glass clink.<br>**Match:** Clean harmonic bell ding.<br>**Miss:** Hollow ceramic knock.<br>**Win:** Orchestral glass-harp crescendo. |
| **5. Mixed** *(Holographic Prism)* | Floating dark frosted-glass pedestal with shifting iridescent rainbow rim lighting; ultra-glossy crystal tiles. | Prism light refraction beam & rainbow sparks; dynamic shifting studio lighting. | **Flip:** Liquid water-drop glass tap.<br>**Match:** Angelic crystal harp shimmer.<br>**Miss:** Reversed synth sweep.<br>**Win:** Euphoric arcade jackpot fanfare. |

---

## 7. Screen Layout & UX Flow (9:16 Vertical)

1. **Pre-Game Level Selector (Overlay on Idle 3D Board):**
   * Swipe left/right through the 5 Levels (**Solid $\rightarrow$ Gradient $\rightarrow$ Center Glow $\rightarrow$ Split $\rightarrow$ Mixed**), showing the live 3D board swap in the background and the active **Score Multiplier badge** ($1.0\times$ to $2.5\times$).
   * Locked levels display their unlock milestone requirement and progress bar.
   * Includes a **"Leaderboard"** button (`snapchat.leaderboards.show()`) (hidden if `!snapchat.isSupported('leaderboards')`), a Tile Back Emblem selector, and a prominent **"PLAY"** button.
2. **Post-"Play" Shuffle & Peek Sequence (~4.0 Seconds Total):**
   * **0.0s – 2.5s (2–3s Shuffle):** Clicking **"Play"** dismisses the menu overlay. Floating HUD toast reads **"SHUFFLING..."** while colors rapidly scramble across the 16 face-up tiles.
   * **2.5s – 4.0s (1–2s Memorization Lock-In):** The board locks into the chosen layout. Toast snaps to **"MEMORIZE!"** with a fast 1.5-second depletion bar while all 16 face-up tiles stay visible.
   * **4.0s – 4.4s (Flip-Down & Start):** Tiles wave-flip face-down, toast flashes **"GO!"**, input unlocks, and the 60.0s countdown begins.
3. **In-Game HUD:**
   * **Top Zone (20%):** Player Bitmoji (`get2DAvatar` variant or fallback) on the left, bold `60.0` timer in the center, `Flips: 0` and Level Multiplier badge on the right.
   * **Center Zone (65%):** The 4x4 3D PlayCanvas board positioned in the natural thumb zone.
   * **Bottom Zone (15%):** Active Streak multiplier meter and a quick **"Restart"** button (triggers a fresh 2–3s Shuffle & 1–2s Peek).
4. **Post-Game Summary & Native Leaderboard Panel:**
   * Displays Final Score calculation (`Base Score × Level Multiplier`), server-recorded `bestScore` (if returned by `submitScore`), player's Bitmoji victory pose, and any newly unlocked Level or Tile Emblem toasts.
   * Automatically submits the score and triggers `snapchat.leaderboards.show()` so players can view Snapchat's native leaderboard panel and compete with friends.

---

## 8. Complete Procedural Swatch Pools (12 Items Per Level)
All 5 levels share a unified palette foundation so that **Level 5 (Mixed)** can pit identical color pairs with *different shader styles* against one another on the same board. Each round randomly selects 8 of the 12 swatches.

### 8.1 Level 1: Solid (Flat Single-Color Shader)
| # | Swatch Name | Hex Code | Visual Description |
| :--- | :--- | :--- | :--- |
| 1 | **Crimson Red** | `#FF1E42` | Pure, high-saturation arcade red |
| 2 | **Electric Blue** | `#0066FF` | Vivid cobalt blue |
| 3 | **Acid Green** | `#00E676` | Bright neon emerald green |
| 4 | **Solar Yellow** | `#FFEA00` | High-visibility canary yellow |
| 5 | **Hyper Magenta** | `#FF00A0` | Punchy hot pink / magenta |
| 6 | **Cyber Cyan** | `#00E5FF` | Crisp electric aqua |
| 7 | **Tangerine Orange** | `#FF6D00` | Warm, saturated vivid orange |
| 8 | **Royal Violet** | `#7C4DFF` | Deep electric purple |
| 9 | **Mint Teal** | `#1DE9B6` | Cool seafoam turquoise |
| 10 | **Coral Peach** | `#FF6E6E` | Soft pastel salmon-coral |
| 11 | **Indigo Night** | `#283593` | Deep midnight navy blue |
| 12 | **Pure Titanium** | `#ECEFF1` | Crisp bright silver-white |

### 8.2 Level 2: Gradient (45° Diagonal Smooth Linear Blend)
| # | Swatch Name | Color A (Top-Left) | Color B (Bottom-Right) | Visual Transition |
| :--- | :--- | :--- | :--- | :--- |
| 1 | **Sunset Fade** | `#FF512F` (Orange) | `#DD2476` (Magenta) | Warm dusk orange to deep berry pink |
| 2 | **Ocean Abyss** | `#00C6FF` (Cyan) | `#0072FF` (Deep Blue) | Tropical aqua to deep marine blue |
| 3 | **Cyber Mint** | `#11998E` (Teal) | `#38EF7D` (Neon Green) | Forest teal to bright toxic lime |
| 4 | **Solar Flare** | `#F7971E` (Amber) | `#FFD200` (Lemon) | Rich gold-orange to bright yellow |
| 5 | **Cosmic Berry** | `#8E2DE2` (Violet) | `#4A00E0` (Indigo) | Electric purple to deep midnight blue |
| 6 | **Bubblegum Pop** | `#FF758C` (Coral) | `#FF7EB3` (Candy Pink) | Warm rose to soft pastel pink |
| 7 | **Neon Magma** | `#FF0844` (Crimson) | `#FFB199` (Peach) | Intense red fading into soft peach |
| 8 | **Arctic Aurora** | `#00F2FE` (Ice Cyan) | `#4FACFE` (Sky Blue) | Glowing cyan to cool azure |
| 9 | **Ultraviolet** | `#DA22FF` (Fuchsia) | `#9733EE` (Purple) | Neon pink-purple to royal violet |
| 10 | **Kiwi Crush** | `#DCE35B` (Chartreuse) | `#45B649` (Emerald) | Yellow-green to rich leaf green |
| 11 | **Dusk Horizon** | `#2C3E50` (Slate) | `#FD746C` (Sunset Coral) | Dark storm grey to warm salmon |
| 12 | **Liquid Silver** | `#757F9A` (Steel) | `#D7DDE8` (Platinum) | Metallic gunmetal to bright silver |

### 8.3 Level 3: Center Glow (Radial Core-to-Rim Shader)
*Note: Several swatches share dark outer rims (`#081B33` or `#1F0021`) or bright cores to test precision recall during the 1–2s Peek.*

| # | Swatch Name | Inner Core Glow | Outer Rim Edge | Visual Hook |
| :--- | :--- | :--- | :--- | :--- |
| 1 | **Reactor Cyan** | `#00FFFF` (Neon Cyan) | `#081B33` (Dark Navy) | Glowing blue laser core in a dark housing |
| 2 | **Plasma Core** | `#FF007F` (Hot Pink) | `#1F0021` (Dark Plum) | Vibrant magenta orb in deep violet shadow |
| 3 | **Supernova** | `#FFF200` (Bright Yellow) | `#FF3B00` (Blood Orange) | Blazing white-yellow sun inside a red rim |
| 4 | **Kryptonite** | `#39FF14` (Acid Green) | `#052614` (Dark Forest) | Radioactive green center fading to black-green |
| 5 | **Void Eclipse** | `#120024` (Dark Void) | `#00E5FF` (Cyan Rim) | **Inverted Glow:** Dark center with a glowing cyan border |
| 6 | **Blood Moon** | `#1A0000` (Dark Maroon) | `#FF1E42` (Crimson Rim) | **Inverted Glow:** Dark center with a fiery red border |
| 7 | **Nebula Heart** | `#E040FB` (Lavender) | `#311B92` (Deep Indigo) | Soft purple starlight inside royal indigo |
| 8 | **Ember Pulse** | `#FF9100` (Amber) | `#2D0800` (Charcoal) | Glowing fireplace ember in dark ash |
| 9 | **Frost Nova** | `#FFFFFF` (Pure White) | `#0088FF` (Cobalt) | Blinding white ice core with a blue outer ring |
| 10 | **Biohazard** | `#FFEA00` (Yellow) | `#1B5E20` (Jungle Green) | Bright yellow core ringed by deep green |
| 11 | **Synthwave Sun** | `#FF00A0` (Magenta) | `#00E5FF` (Cyan) | High-contrast neon pink core with an aqua edge |
| 12 | **Ghost Pearl** | `#ECEFF1` (Silver) | `#263238` (Dark Slate) | Metallic white orb inside matte gunmetal |

### 8.4 Level 4: Split (50/50 Hard-Edge Geometric Cut)
*Note: Includes deliberate **Inverted Decoy Pairs** (e.g., #1 vs #2, #3 vs #4) where the exact same two colors swap positions or split angles.*

| # | Swatch Name | Side A (Top / Left) | Side B (Bottom / Right) | Split Angle |
| :--- | :--- | :--- | :--- | :--- |
| 1 | **Cyber Slash A** | `#FF00A0` (Magenta) | `#00E5FF` (Cyan) | **45° Diagonal** (Magenta Top-Left / Cyan Bottom-Right) |
| 2 | **Cyber Slash B** | `#00E5FF` (Cyan) | `#FF00A0` (Magenta) | **45° Diagonal Inverted** (Cyan Top-Left / Magenta Bottom-Right) |
| 3 | **Hazard Split A** | `#FFEA00` (Yellow) | `#111111` (Jet Black) | **Vertical 50/50** (Yellow Left / Black Right) |
| 4 | **Hazard Split B** | `#111111` (Jet Black) | `#FFEA00` (Yellow) | **Horizontal 50/50** (Black Top / Yellow Bottom) |
| 5 | **Fire & Ice A** | `#FF1E42` (Crimson) | `#0066FF` (Cobalt) | **45° Diagonal** (Red Top-Left / Blue Bottom-Right) |
| 6 | **Fire & Ice B** | `#0066FF` (Cobalt) | `#FF1E42` (Crimson) | **45° Diagonal Inverted** (Blue Top-Left / Red Bottom-Right) |
| 7 | **Toxic Violet A** | `#00E676` (Acid Green) | `#7C4DFF` (Violet) | **Vertical 50/50** (Green Left / Violet Right) |
| 8 | **Toxic Violet B** | `#7C4DFF` (Violet) | `#00E676` (Acid Green) | **Horizontal 50/50** (Violet Top / Green Bottom) |
| 9 | **Sunset Block A** | `#FF6D00` (Orange) | `#283593` (Indigo) | **45° Diagonal** (Orange Top-Left / Indigo Bottom-Right) |
| 10 | **Sunset Block B** | `#283593` (Indigo) | `#FF6D00` (Orange) | **45° Diagonal Inverted** (Indigo Top-Left / Orange Bottom-Right) |
| 11 | **Mint Coral A** | `#1DE9B6` (Mint) | `#FF6E6E` (Coral) | **Vertical 50/50** (Mint Left / Coral Right) |
| 12 | **Mono Split** | `#FFFFFF` (Pure White) | `#263238` (Charcoal) | **45° Diagonal** (White Top-Left / Charcoal Bottom-Right) |

### 8.5 Level 5: Mixed — Master Tier (Cross-Pattern Color Traps)
In **Level 5**, the game generator builds the 8-pair board by selecting **2 pairs from each of the 4 shader styles above** (`2 Solid + 2 Gradient + 2 Center Glow + 2 Split = 8 pairs`). 

To maximize cognitive challenge during the **1–2 second Memorization Peek**, the generator prioritizes **Cross-Pattern Color Clusters**—putting the *same color family* on the board across different shader styles so players must memorize both **Hue + Pattern Type**:

| Cluster Theme | Pair 1 (Solid) | Pair 2 (Gradient) | Pair 3 (Center Glow) | Pair 4 (Split) |
| :--- | :--- | :--- | :--- | :--- |
| **Neon Cyber Cluster** | `#FF00A0` (Hyper Magenta) | **Ultraviolet** (`#DA22FF` $\rightarrow$ `#9733EE`) | **Synthwave Sun** (Magenta Core / Cyan Rim) | **Cyber Slash A** (Magenta / Cyan 45° Split) |
| **Solar Heat Cluster** | `#FFEA00` (Solar Yellow) | **Solar Flare** (`#F7971E` $\rightarrow$ `#FFD200`) | **Supernova** (Yellow Core / Orange Rim) | **Hazard Split A** (Yellow / Black Vertical Split) |
| **Deep Ocean Cluster** | `#00E5FF` (Cyber Cyan) | **Ocean Abyss** (`#00C6FF` $\rightarrow$ `#0072FF`) | **Reactor Cyan** (Cyan Core / Navy Rim) | **Fire & Ice B** (Blue / Red 45° Split) |
| **Bio-Emerald Cluster** | `#00E676` (Acid Green) | **Cyber Mint** (`#11998E` $\rightarrow$ `#38EF7D`) | **Kryptonite** (Green Core / Forest Rim) | **Toxic Violet A** (Green / Violet Vertical Split) |

---

## 9. PlayCanvas Packaging & Web Lens Platform Compliance
* **Self-Contained Zip Build (No External Fetches):** Per Snapchat Web Lens requirements, the Lens runs offline inside a strict CSP webview. Bundle `dist/snap-api.js` (from `@snap/web-lens-api`) directly inside the build with `Loading Type: Before Engine` (never under `Settings > External Scripts`). Ensure all asset paths are relative and `index.html` is at the zip root.
* **Zero Texture Atlas Overhead:** All 48 color swatches across Levels 1–5 are rendered using **one unified GLSL fragment shader** on the tile face material via uniform parameters (`u_patternType`, `u_colorA`, `u_colorB`, `u_angle`).
* **Efficient 2–3s Shuffle Animation:** When the user clicks **"Play"**, run a `2.5s` timer that updates `u_colorA`, `u_colorB`, and `u_patternType` material uniforms on each of the 16 face-up tiles every `0.08s`–`0.12s` (gradually slowing down like a roulette wheel). At `t = 2.5s`, assign the final 8-pair layout uniforms, hold face-up for `1.5s` (the 1–2s peek window), and then trigger the 180° flip-down tween across all tiles.
* **Audio Budget:** Keep all one-shot SFX files mono `.ogg`/`.mp3` under `25KB` each (`<500KB` total audio footprint) bundled locally in the zip.