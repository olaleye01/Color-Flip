# UI/UX Design Specification: Color Flip (9:16 Vertical Web Lens)

## 1. Viewport, Safe Zones & Ergonomics
Because **Color Flip** runs inside the Snapchat mobile webview, the native Snapchat chrome (Close `X` button, Lens Info pill, and bottom system bar) overlaps the extreme edges of the screen. All PlayCanvas 2D Screen / HTML UI elements must respect the following **1080×1920 reference resolution** safe zones:

* **Top Safe Inset (`0px – 140px`):** Reserved for Snapchat’s native top-left Close/Back button and camera/header pills. **Never place interactive buttons here.**
* **Active Top HUD Zone (`140px – 420px`):** Displays the Player Bitmoji, 60.0s Countdown Timer, Flip Counter, and Active Level Multiplier.
* **Center 3D Viewport / Thumb Zone (`420px – 1500px`):** Reserved for the PlayCanvas 3D camera rendering the 4x4 board. Kept completely clear of permanent UI overlays during active play.
* **Bottom Action Zone (`1500px – 1800px`):** Houses the Streak Meter, Pre-Game Level Carousel controls, and Quick Restart CTA right under the player's resting thumb.
* **Bottom Safe Inset (`1800px – 1920px`):** Reserved for the iOS/Android home indicator bar.

---

## 2. Visual Language & Design System

### A. Glassmorphic Adaptive UI (Letting the 3D Board Shine)
Since each of the 5 Levels changes the 3D board and lighting environment (from bright *Studio Matte* in Level 1 to dark *Neon Obsidian* in Level 3), the 2D HUD uses **Dark Translucent Glass Cards** so text remains legible across every background:
* **Surface Panel Fill:** `rgba(18, 20, 28, 0.78)` with `2px` border `rgba(255, 255, 255, 0.14)` and `16px` corner radius.
* **Primary CTA ("PLAY" / "REMATCH"):** Snapchat Yellow `#FFFC00` background with `#0B0C10` bold black text and a `4px` bottom lip (`#D4D100`) that depresses on tap.
* **Secondary CTA ("LEADERBOARD" / "SKINS"):** Frosted Pill `rgba(255, 255, 255, 0.15)` with crisp `#FFFFFF` text.
* **Accent Status Colors:**
  * **Timer Normal (`60.0s – 10.1s`):** Pure White `#FFFFFF`
  * **Timer Warning (`10.0s – 0.0s`):** Pulsing Crimson `#FF1E42`
  * **Streak / Multiplier Active:** Electric Cyan `#00E5FF` $\rightarrow$ Hyper Magenta `#FF00A0` gradient pill.

### B. Typography (Bundled Local `.ttf` / PlayCanvas Font Asset)
* **Display / Numbers (Timer, Score, Multipliers):** *Montserrat Black* or *Rubik Bold* using `tabular-nums` (monospaced numerals) so the `60.0` timer never jitters horizontally as tenths of a second tick down.
* **UI Labels & Toasts:** *Inter Bold / ExtraBold* uppercase with `0.05em` letter-spacing for instant readability at small mobile sizes.

---

## 3. Screen-by-Screen Wireframes & Component Specs

### Screen 1: Pre-Game Lobby & Level Selector (Overlay on Idle 3D Board)
The 3D 4x4 board sits angled at `15°` in the background, dynamically swapping its 3D frame and tile materials as the player swipes between Levels 1–5.

```text
+---------------------------------------+
| [Snap Native X]       [Snap Info Pill]| <-- Top Safe Inset (140px)
|                                       |
|  +---------------------------------+  |
|  | [Bitmoji]  HIGH SCORE: 14,250   |  | <-- Personal Best Header Pill
|  +---------------------------------+  |
|                                       |
|              COLOR FLIP               | <-- 3D Extruded / Neon Title Logo
|                                       |
|      +-------------------------+      |
|      |  LEVEL 3: CENTER GLOW   |      | <-- Level Header + Multiplier Badge
|      |    [ 1.50x SCORE ]      |      |
|      +-------------------------+      |
|                                       |
|   <   +-----------------------+   >   |
|       |   [ ] [ ] [ ] [ ]     |       | <-- Live 3D 4x4 Board Preview
|       |   [ ] [ ] [ ] [ ]     |       |     (Swipes Left/Right)
|       |   [ ] [ ] [ ] [ ]     |       |
|       |   [ ] [ ] [ ] [ ]     |       |
|       +-----------------------+       |
|                                       |
|         ( * ) ( * ) ( O ) ( o ) ( o ) | <-- 5-Level Pagination Dots
|                                       |
|  +---------------------------------+  |
|  |          P L A Y  ▶             |  | <-- Primary Snap Yellow CTA (#FFFC00)
|  +---------------------------------+  |
|                                       |
|  +----------------+ +--------------+  |
|  | 🏆 LEADERBOARD | | 🎨 TILE SKIN |  | <-- Secondary Action Pills
|  +----------------+ +--------------+  |
|                                       |
+---------------------------------------+
```

* **Locked Level State:** When swiping to a locked level (e.g., Level 4: Split), the **PLAY** button transforms into a dark locked badge showing the exact milestone requirement and progress bar:
  * `🔒 CLEAR LEVEL 3 IN ≤26 FLIPS (BEST: 30)`
* **Conditional Leaderboard Button:** If `snapchat.isSupported('leaderboards') === false`, the `🏆 LEADERBOARD` button automatically hides and `🎨 TILE SKIN` centers itself.

---

### Screen 2: The Shuffle & Memorization Peek Overlay (`0.0s – 4.0s`)
Triggered the instant the user clicks **"PLAY"**. All menu UI slides out, the camera eases directly overhead the 4x4 board, and a non-intrusive center-top status banner guides the player's eyes:

```text
+---------------------------------------+
|                                       |
|  +---------------------------------+  |
|  |  [Bitmoji: 👀]   MEMORIZE! 1.5s |  | <-- Dynamic Phase Banner
|  |  [==================---------]  |  | <-- High-Speed Depletion Bar
|  +---------------------------------+  |
|                                       |
|       +-----------------------+       |
|       |  [C1] [C4] [C2] [C7]  |       |
|       |  [C8] [C1] [C5] [C3]  |       | <-- All 16 Tiles Face-Up
|       |  [C3] [C6] [C8] [C2]  |       |     (Touch Input Locked)
|       |  [C5] [C7] [C4] [C6]  |       |
|       +-----------------------+       |
|                                       |
+---------------------------------------+
```

* **Phase 1 (`0.0s – 2.5s`):** Banner displays `🎲 SHUFFLING COLORS...` in Cyan `#00E5FF` while the 16 face-up tiles rapidly cycle colors.
* **Phase 2 (`2.5s – 4.0s`):** Board snaps into its final layout with a subtle white screen-border flash. Banner switches to `👀 MEMORIZE! 1.5s` in Snap Yellow `#FFFC00` with a depleting progress bar underneath.
* **Phase 3 (`4.0s`):** Tiles wave-flip face-down, a punchy `"GO!"` text scales up and fades out over `0.3s`, and the In-Game HUD activates.

---

### Screen 3: Active In-Game HUD (60.0s Countdown)
Designed for zero visual clutter so the player's peripheral vision stays locked on the 4x4 grid.

```text
+---------------------------------------+
|                                       | <-- Top Safe Inset
|  +---------+ +---------+ +---------+  |
|  | [Bitmoji| |  48.6s  | | FLIPS   |  |
|  |  Pose]  | |  TIMER  | |   12    |  | <-- 3-Pod Top HUD Bar
|  +---------+ +---------+ +---------+  |
|              [ LVL 3 • 1.5x ]         | <-- Subtle Multiplier Pill
|                                       |
|       +-----------------------+       |
|       |  [?]  [?]  [✓]  [?]   |       |
|       |                       |       |
|       |  [?]  [✓]  [?]  [?]   |       | <-- 3D 4x4 PlayCanvas Grid
|       |                       |       |     (Occupies 65% Height)
|       |  [?]  [?]  [?]  [?]   |       |
|       |                       |       |
|       |  [?]  [?]  [?]  [?]   |       |
|       +-----------------------+       |
|                                       |
|  +---------------------------------+  |
|  | 🔥 3x STREAK (+750 PTS)         |  | <-- Dynamic Streak Bar
|  +---------------------------------+  |
|                                       |
|            ( ↻ RESTART )              | <-- Quick Thumb Reset Pill
|                                       |
+---------------------------------------+
```

* **Pod 1 — Live Bitmoji Spectator (Top Left):**
  * Circular or rounded-square frame (`110×110px`) displaying the player's `get2DAvatar()` image (or `./assets/avatar_default.png` fallback).
  * **Reactive Border & Pose:** Glows Cyan with a hyped Bitmoji variant when `streak >= 2`; pulses Red with a sweating variant when `timer <= 10.0s`.
* **Pod 2 — Precision Countdown Timer (Top Center):**
  * Largest typographic element on screen (`64px` tabular bold).
  * Displays tenths of a second (`48.6`). At `10.0s`, scales up `1.15x` on every full second tick and turns `#FF1E42`.
* **Pod 3 — Flip Efficiency Counter (Top Right):**
  * Displays total individual tile taps (`FLIPS: 12`) alongside a tiny efficiency dot:
    * **Green Dot (`0–20 Flips`):** Gold Skin / Peak Efficiency pace.
    * **Yellow Dot (`22–32 Flips`):** Standard pace.
    * **Grey Dot (`34+ Flips`):** Low efficiency bonus.
* **Bottom Streak & Quick-Restart Zone:**
  * Every speedrunner who misses their first two pairs wants an instant reset. Tapping `↻ RESTART` immediately aborts the timer and triggers a fresh `2.5s` Face-Up Shuffle without kicking the user back to the main menu.

---

### Screen 4: Tile Skin Drawer (Modal Bottom Sheet)
Tapped from the Pre-Game Lobby (`🎨 TILE SKIN`). Slides up over the bottom `45%` of the screen while keeping the 3D board visible above so tapping an emblem previews it live on the 3D tiles:

```text
+---------------------------------------+
|       (3D Board Live Preview Above)   |
+---------------------------------------+
|           SELECT TILE EMBLEM      [X] |
|                                       |
|  +--------+ +--------+ +--------+ +--------+
|  | [Snap] | | [Prism]| | [Gold] | |[Bitmoji|
|  |Classic | | 5 Wins | |≤18 Flip| | Master |
|  |ACTIVE ✓| | EQUIP  | |  🔒    | |  🔒    |
|  +--------+ +--------+ +--------+ +--------+
|                                       |
|  Selected: Classic Snap Emblem        |
+---------------------------------------+
```

---

### Screen 5: Post-Game "Flex Card" & Native Leaderboard Trigger
When the 8th pair is matched (or time expires), a sleek **Trading Card / Arcade Receipt Modal** animates into the center of the screen:

```text
+---------------------------------------+
|                                       |
|    +-----------------------------+    |
|    |   ★ LEVEL 3 CLEARED! ★      |    |
|    |                             |    |
|    |      [Bitmoji Victory]      |    | <-- Large 2D Bitmoji Pose
|    |                             |    |
|    |        FINAL SCORE          |    |
|    |         11,475              |    | <-- Animated Count-Up Number
|    |     🏆 NEW PERSONAL BEST!   |    | <-- Shown if > bestScore
|    |                             |    |
|    |  -------------------------  |    |
|    |  ⏱ TIME LEFT (34.2s) +3,420 |    |
|    |  🎯 FLIPS (18 Flips) +2,200 |    |
|    |  🔥 STREAK BONUS     +2,000 |    |
|    |  ⚡ LEVEL 3 MULT      ×1.50 |    |
|    |  -------------------------  |    |
|    |  🔓 UNLOCKED: LEVEL 4 SPLIT!|    | <-- Milestone Toast (if earned)
|    +-----------------------------+    |
|                                       |
|    +-----------------------------+    |
|    |      P L A Y  A G A I N     |    | <-- Primary Snap Yellow CTA
|    +-----------------------------+    |
|    |  🏆 VIEW FRIEND LEADERBOARD |    | <-- Calls leaderboards.show()
|    +-----------------------------+    |
|    |       CHANGE LEVEL          |    |
|    +-----------------------------+    |
+---------------------------------------+
```

* **Automatic Native Leaderboard Flow:**
  1. At `t = 0.0s` of Victory, the Flex Card pops in and counts up the score over `0.8s`.
  2. In the background, `snapchat.storage.set('save', updatedState)` and `snapchat.leaderboards.submitScore({ leaderboardId: 'main', score: finalScore })` execute.
  3. Players can either auto-open `snapchat.leaderboards.show()` after the count-up finishes or tap **`🏆 VIEW FRIEND LEADERBOARD`** directly on the card to compare ranks with their Snapchat friends.

---

## 4. PlayCanvas UI Implementation Architecture (2D Screen vs HTML/CSS)
For a Snapchat Web Lens in PlayCanvas, you have two ways to build this UI—and a **Hybrid Approach** works best:

1. **HTML/CSS Overlay Layer (Recommended for Menus, HUD & Flex Card):**
   * Because Web Lenses run in a standard mobile browser webview, building the Pre-Game Carousel, Top 3-Pod HUD, and Post-Game Flex Card in **HTML/CSS overlaid on top of `<canvas id="application-canvas">`** gives you native CSS `backdrop-filter: blur(12px)`, crisp responsive flexbox layout, smooth CSS transitions, and zero PlayCanvas texture memory overhead for UI sprites.
   * **Bitmoji Integration:** You can bind the URL returned by `snapchat.bitmoji.get2DAvatar()` directly to an HTML `<img id="hud-bitmoji" src="...">` element with `onerror="this.src='./assets/avatar_default.png'"`—making fallback handling effortless.
2. **PlayCanvas 3D World-Space UI (For Board Feedback):**
   * Keep floating combo popups (`+250!`, `2x STREAK!`) and the `1.5s` radial memorization border attached directly to the 3D board entity in PlayCanvas so they move and shake naturally with the 3D camera.