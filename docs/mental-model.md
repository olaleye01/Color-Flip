# Project Brief: Color Flip

## 1. Executive Summary
* **Title:** Color Flip
* **Platform:** Snapchat Web Lens (Built in PlayCanvas / Three.js 3D WebGL, packaged as a self-contained static `.zip` with `index.html` at the root)
* **SDK Package:** `@snap/web-lens-api` (`window.snapchat`) bundled locally (loaded before engine or bundled via Vite) to comply with Snapchat's strict Content Security Policy (CSP), which blocks runtime external network requests.
* **Orientation & Input:** 9:16 Vertical Portrait; Single-Thumb Touch Control
* **Core Concept:** A fast-paced, 3D visual-memory color matching game played on a 4x4 grid focusing on high-energy, tactile **Solid** color matching. When the player clicks **"Play"**, all 16 face-up tiles initiate a **2.5-second Live Color Shuffle**, randomly lock into a final 8-pair layout for a **1.5-second Memorization Window**, and then flip face-down to start the 60.0-second clock. Scores are calculated from remaining time, flip efficiency, and combo streaks. The game uses 100% procedural canvas textures / shaders and integrates the official **Snapchat Web Lens API** (`snapchat.bitmoji`, `snapchat.leaderboards`, and `snapchat.storage`).

---

## 2. Core Gameplay Mechanics

### A. Pre-Round Sequence: Play Trigger, Shuffle & Peek Phase
The board remains in a calm, idle state during the welcome screen and only initiates the scramble when the player commits to starting the round:
1. **Idle Pre-Game State:** On the clean welcome lobby overlay, the 4x4 board gently rotates in the background showcasing a live preview of the tactile Studio Matte tiles.
2. **"Play" Trigger & Face-Up Color Shuffle (2–3 Seconds):** The shuffle **only begins when the user clicks "Play"** (or **"Restart"**). All 16 tiles orient **face-up**, and the procedural solid color swatches rapidly cycle and scramble across the 4x4 grid for **2.5 seconds** like an arcade slot machine, paired with a rising rhythmic shuffle sound effect.
3. **Random Layout Lock-In & Memorization Peek (1–2 Seconds):** After the 2–3 second shuffle concludes, the generator locks in the final randomized 8-pair layout with a snappy camera pulse. This locked layout stays displayed **face-up for 1.5 seconds**, giving the player a brief, high-stakes window to memorize key pair positions while tile tapping remains disabled.
4. **The Cascade Flip-Down (0.4 Seconds):** Once the 1.5-second display window ends, all 16 tiles flip **face-down** in a rapid diagonal wave across the 4x4 grid.
5. **Timer Start:** The moment the tiles finish flipping face-down, touch input unlocks and the **60.0-second countdown clock** begins ticking.

### B. The Turn Loop & Resolution
* **The Grid:** A 4x4 layout of 16 tiles containing **8 matching pairs** randomly pulled from a pool of 12 vibrant solid color swatches (yielding 495 unique board combinations).
* **The Turn Loop:**
  * Players tap two face-down tiles per turn.
  * **Match:** Both tiles lock face-up with a 3D spring-pop animation and a celebratory particle burst. Consecutive matches increase the **Streak Multiplier** (+250 pts per consecutive pair).
  * **Mismatch:** Both tiles shake briefly and flip back face-down after a **0.65-second delay**.
* **Urgency State (Final 10 Seconds):** At `00:10`, the HUD timer pulses crimson and the 3D board subtly vibrates to the beat of an accelerating clock tick.
* **Win/Loss Conditions:**
  * **Win:** Matching all 8 pairs before `00:00` stops the clock, calculates the final integer score (Time Left + Flip Bonus + Streak Bonus), writes career stats via `snapchat.storage.set()`, and submits the score via `snapchat.leaderboards.submitScore()` before offering to open the native Snapchat leaderboard panel (`snapchat.leaderboards.show()`).
  * **Loss:** Reaching `00:00` triggers a "Time's Up" game over modal with zero points awarded and an instant retry button (which triggers a fresh 2.5s Face-Up Shuffle).

---

## 3. Official Snapchat Web Lens API Architecture (`@snap/web-lens-api`)

Per the official Snapchat Web Lens documentation, `localStorage` and `IndexedDB` reset whenever a Web Lens closes, and runtime external network requests are blocked by CSP. **Color Flip** initializes the Web Lens API at startup (`await snapchat.init()`) and checks capability support via `snapchat.isSupported()` before invoking any feature.

### A. Initialization & Capability Check
* Must call `await snapchat.init()` once before checking capabilities (`isSupported()` returns `false` until `init()` resolves).
* Gracefully handle `ERR_UNSUPPORTED_HOST`, `ERR_UNKNOWN_CAPABILITY`, and `ERR_INTERNAL` so the game remains 100% playable even if a capability is unavailable on a specific device or host version.

### B. Bitmoji API (`snapchat.bitmoji`)
The `bitmoji` capability describes **only the current player** (either as a head-and-shoulders 2D image or a rigged 3D `.glb` model):
* **Mandatory Local Fallback:** Per platform requirements, `hasAvatar` may be `false` (if the user has no Bitmoji) or media calls may reject with `ERR_INTERNAL`. The game zip **must** include fallback assets (`./assets/avatar_default.png`) so an empty character is never shown.
* **2D HUD Reactions & Tile Back Stamp:**
  * Check `const { hasAvatar } = await snapchat.bitmoji.getAvatarInfo()`.
  * Fetch available pose variants via `const { variants } = await snapchat.bitmoji.getVariants()` and load 2D head-and-shoulders images via `await snapchat.bitmoji.get2DAvatar({ variant, size: 'large' })` (falling back to default without `variant` if `ERR_INVALID_PARAMS` occurs).
  * **Important URL Expiry Rule:** Bitmoji URLs returned by `get2DAvatar()` expire after **~5 minutes**—textures must be rendered to canvas immediately after fetching.

### C. Leaderboards API (`snapchat.leaderboards`)
* **Submission Rules:**
  * Checked via `snapchat.isSupported('leaderboards')` (hide leaderboard UI if `false`).
  * `score` **must be a safe integer** (`Math.round(finalScore)`). Non-integers reject with `ERR_INVALID_PARAMS`.
  * Ordering defaults to `'descending'` (higher scores rank first), which matches **Color Flip**'s scoring system.
* **Native Panel Presentation:**
  * Call `const { bestScore } = await snapchat.leaderboards.submitScore({ leaderboardId: 'main', score: Math.round(finalScore) })`.
  * `bestScore` is optional in the response; if present, update the HUD's Personal Best label.
  * Tapping **"VIEW FRIEND LEADERBOARD"** on the victory screen invokes `await snapchat.leaderboards.show()` to open Snapchat's native leaderboard panel where players see how they rank against friends.

### D. Persistent Storage API (`snapchat.storage`)
* **Platform & Quota Rules:**
  * Checked via `snapchat.isSupported('storage')`. (Note: On unsupported platforms or when `ERR_STORAGE_UNAVAILABLE` occurs, fall back to in-session memory).
  * **Quotas:** Max `100 KiB` total per Lens, max `256` keys, max `32 KiB` JSON per value, key length `1–256` bytes.
  * **Rate Limit Rule:** Only read once at startup (`snapchat.storage.get('save')`) and write once at round completion (`snapchat.storage.set('save', state)`).

### Storage API Data Schema (`key: 'save'`, < 250 Bytes)
```json
{
  "highScore": 0,
  "cumulativeScore": 0,
  "totalGamesWon": 0,
  "fastestClearTimeLeft": 0.0,
  "bestFlipCount": 999,
  "equippedSkin": 0
}
```

---

## 4. Scoring Formula & Benchmarks
Because players get a **1.5-second Memorization Peek** right after the 2.5-second shuffle locks in, skilled players can aim for near-perfect 16-to-20 flip runs.

$$\text{Final Score} = \text{Base Score} = (\text{Seconds Left} \times 100) + \max(0, 4000 - (\text{Total Flips} \times 100)) + \text{Streak Bonus}$$

* **Time Left Bonus:** Calculated to 0.1s precision to prevent leaderboard ties (e.g., $32.4\text{s remaining} = 3,240\text{ pts}$).
* **Flip Efficiency Bonus:** Minimum possible flips is 16 (8 turns—a perfect 100% memorized board), awarding $2,400\text{ pts}$. A strong 22-flip (11-turn) game awards $1,800\text{ pts}$. 40+ flips reduces the efficiency bonus to $0\text{ pts}$.
* **Streak Bonus:** $+250\text{ pts}$ for each consecutive match made without an error.

### Score Benchmarks
| Metric | Performance Target | Score Contribution | Notes |
| :--- | :--- | :--- | :--- |
| **Time Left** | 30.0s remaining | $3,000\text{ pts}$ | Clock starts at 60.0s |
| **Flip Efficiency** | 16 flips (Perfect 8 turns) | $2,400\text{ pts}$ | Max achievable flip bonus |
| **Max Streak** | 8 consecutive matches | $+1,750\text{ pts}$ | Increments +250 per match |
| **Typical Win** | 30.0s left, 24 flips, +500 streak | $5,100\text{ pts}$ | Standard casual clear |
| **Speedrun Master** | 45.0s left, 16 flips, +1750 streak | $8,650\text{ pts}$ | Top leaderboard contender |

---

## 5. Progression System & Cosmetic Emblems

### Cosmetic Tile Backs (Center Emblem Skins)
Players customize the **center emblem on the face-down side of the tiles** by achieving gameplay milestones:
1. **Classic Snap Emblem:** Default starting tile back featuring the iconic ghost outline.
2. **Neon Prism Crest:** Unlocked after **5 total wins**.
3. **24K Gold Foil Emblem:** Unlocked by clearing any board in **18 flips or fewer** (9 turns—mastering the 1.5s peek).
4. **Bitmoji Stamp:** Unlocked after **10 total wins** OR clearing a board in **16 flips or fewer** (stamps the player's personal Bitmoji avatar on the back of every tile).

---

## 6. Board & Sound Design

### 3D Board Aesthetic: Studio Matte
* **Board Frame:** Clean minimalist white studio tray with soft rounded corners, recessed slots, and subtle ambient drop shadow.
* **Tile Finish:** Tactile matte-plastic toy tiles with beveled tactile edges and specular gloss accents.
* **Lighting:** Bright neutral studio softbox lighting with soft directional fill.
* **Match VFX:** Crisp color-matched celebratory confetti and floating combo indicators (`+250!`, `2x STREAK`).

### Sound Bank (Procedural Web Audio API)
* **Shuffle Phase (2.5s):** Rapid rhythmic card-flutter ticks that decelerate and rise in pitch.
* **Lock-In Chime (1.5s):** Crisp crystal chime when the 8 pairs lock into place.
* **Tile Flip:** Tactile plastic tap sound (`800Hz → 400Hz` fast pitch envelope).
* **Match:** Bright two-note harmonic marimba chord (`523Hz + 659Hz` / C-E).
* **Mismatch:** Muted soft wood thud (`180Hz → 90Hz`).
* **Streak Match:** Upbeat harmonic chord with rising pitch per streak level.
* **Victory:** Joyful four-note ascending fanfare chime flourish.

---

## 7. Screen Layout & UX Flow (9:16 Vertical)

1. **Pre-Game Lobby Screen (Clean Welcome State):**
   * High Score header pill at top displaying personal record and player Bitmoji.
   * Bold extruded title logo ("COLOR FLIP").
   * **Unobstructed View:** The 3D 4x4 board sits angled in the center, gently rotating in preview mode without any overlapping category cards, arrows, or level selectors.
   * Prominent Snapchat Yellow **"PLAY ▶"** CTA button.
   * Secondary action pills: **"LEADERBOARD"** and **"TILE SKIN"**.
2. **Post-"Play" Shuffle & Peek Sequence (~4.0 Seconds Total):**
   * **0.0s – 2.5s (Shuffle):** Clicking **"Play"** hides the lobby UI. Status banner shows **"SHUFFLING COLORS..."** while colors scramble rapidly across all 16 face-up tiles.
   * **2.5s – 4.0s (Memorization Lock-In):** Layout snaps into position. Banner displays **"MEMORIZE! 1.5s"** with a rapid progress depletion bar.
   * **4.0s – 4.4s (Flip-Down & Start):** Tiles flip face-down, banner flashes **"GO!"**, touch input unlocks, and countdown begins.
3. **In-Game HUD:**
   * **Top Bar:** Player Bitmoji avatar (left), bold `60.0` countdown timer (center), `FLIPS: 0` counter (right).
   * **Mode Badge:** Subtle **"SOLID MODE"** pill below the timer.
   * **Center Zone:** 3D 4x4 interactive board in the natural thumb zone.
   * **Bottom Bar:** Dynamic streak bar (`2x STREAK (+500 PTS)`) and quick `RESTART` pill.
4. **Post-Game 3D Celebration Flex Card:**
   * Animated trading-card modal showing **"BOARD CLEARED!"**, avatar medallion, retro synthwave perspective grid, and breakdown (Time Left, Flips Efficiency, Streak Bonus).
   * Displays unlocked skin milestone toasts if earned.
   * CTAs: **"PLAY AGAIN ▶"**, **"< VIEW FRIEND LEADERBOARD >"**, and **"BACK TO LOBBY"**.

---

## 8. Procedural Swatch Pool (12 Solid Colors)
Each round randomly selects 8 swatches from the 12 vibrant solid colors below, duplicating each to form the 16-tile board:

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

---

## 9. Web Lens Platform Compliance & Packaging
* **Self-Contained Static Build:** Package as a zero-dependency static bundle with `index.html` at the zip root.
* **Zero Runtime Network Calls:** All textures are procedurally drawn to HTML5 canvas and applied to 3D materials. All audio is procedurally synthesized via the Web Audio API. Complies with Snapchat's offline Content Security Policy.
* **Safe-Zone Insets:** Respects the 140px top inset and 120px bottom inset so UI controls never collide with native Snapchat buttons or gesture bars.