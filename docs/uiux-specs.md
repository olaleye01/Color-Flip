# UI/UX Design Specification: Color Flip (9:16 Vertical Web Lens)

## 1. Viewport, Safe Zones & Ergonomics
Because **Color Flip** runs inside the Snapchat mobile webview, the native Snapchat chrome (Close `X` button, Lens Info pill, and bottom system bar) overlaps the extreme edges of the screen. All UI elements must respect the following **1080×1920 reference resolution** safe zones:

* **Top Safe Inset (`0px – 140px`):** Reserved for Snapchat’s native top-left Close/Back button and camera/header pills. **Never place interactive buttons here.**
* **Active Top HUD Zone (`140px – 420px`):** Displays the Player Bitmoji, 60.0s Countdown Timer, Flip Counter, and Solid Mode badge.
* **Center 3D Viewport / Thumb Zone (`420px – 1500px`):** Reserved for the 3D camera rendering the 4x4 board. Kept completely clear of permanent UI overlays during active play.
* **Bottom Action Zone (`1500px – 1800px`):** Houses the Streak Meter, Primary Action CTA, and Quick Restart controls right under the player's resting thumb.
* **Bottom Safe Inset (`1800px – 1920px`):** Reserved for the iOS/Android home indicator bar.

---

## 2. Visual Language & Design System

### A. Glassmorphic Adaptive UI
The game utilizes a bright, tactile **Studio Matte** 3D environment paired with dark translucent glassmorphic cards for maximum legibility and high contrast:
* **Surface Panel Fill:** `rgba(18, 20, 28, 0.78)` with `2px` border `rgba(255, 255, 255, 0.14)` and `16px` corner radius.
* **Primary CTA ("PLAY" / "PLAY AGAIN"):** Snapchat Yellow `#FFFC00` background with `#0B0C10` bold black text and a `4px` bottom lip (`#D4D100`) that depresses on tap.
* **Secondary CTA ("LEADERBOARD" / "SKINS" / "BACK TO LOBBY"):** Frosted Pill `rgba(255, 255, 255, 0.15)` with crisp `#FFFFFF` text.
* **Accent Status Colors:**
  * **Timer Normal (`60.0s – 10.1s`):** Pure White `#FFFFFF`
  * **Timer Warning (`10.0s – 0.0s`):** Pulsing Crimson `#FF1E42`
  * **Streak Active:** Electric Cyan `#00E5FF` $\rightarrow$ Hyper Magenta `#FF00A0` gradient badge.

### B. Typography
* **Display / Numbers (Timer, Score, Stats):** *Montserrat Black* or *Rubik Bold* using `tabular-nums` (monospaced numerals) so the `60.0` timer never jitters horizontally as tenths of a second tick down.
* **UI Labels & Toasts:** *Inter Bold / ExtraBold* uppercase with `0.05em` letter-spacing for instant readability at mobile scale.

---

## 3. Screen-by-Screen Wireframes & Component Specs

### Screen 1: Pre-Game Lobby (Clean Welcome State)
The 3D 4x4 board sits angled at `15°` in the center of the viewport, gently rotating in preview mode. The screen is clean and uncluttered—no category cards, arrows, or level selectors obstruct the view of the board.

```text
+---------------------------------------+
| [Snap Native X]       [Snap Info Pill]| <-- Top Safe Inset (140px)
|                                       |
|  +---------------------------------+  |
|  | [Bitmoji]  HIGH SCORE: 14,250   |  | <-- Personal Best Header Pill
|  +---------------------------------+  |
|                                       |
|              COLOR FLIP               | <-- Bold 3D Extruded Title Logo
|                                       |
|        +-----------------------+      |
|        |   [ ] [ ] [ ] [ ]     |      | <-- Live 3D 4x4 Board Preview
|        |   [ ] [ ] [ ] [ ]     |      |     (Studio Matte Aesthetic)
|        |   [ ] [ ] [ ] [ ]     |      |
|        |   [ ] [ ] [ ] [ ]     |      |
|        +-----------------------+      |
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

* **Immediate Action:** Tapping **"PLAY ▶"** immediately triggers the 2.5s color shuffle sequence.
* **Conditional Leaderboard Button:** If `snapchat.isSupported('leaderboards') === false`, the `🏆 LEADERBOARD` button automatically hides and `🎨 TILE SKIN` centers itself.

---

### Screen 2: The Shuffle & Memorization Peek Overlay (`0.0s – 4.0s`)
Triggered the instant the user clicks **"PLAY"**. Lobby UI slides out, the camera eases overhead, and a dynamic status banner guides the player:

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

* **Phase 1 (`0.0s – 2.5s`):** Banner displays `🎲 SHUFFLING COLORS...` in Cyan `#00E5FF` while the 16 face-up tiles rapidly cycle solid colors.
* **Phase 2 (`2.5s – 4.0s`):** Board snaps into its final layout with a subtle camera pulse. Banner switches to `👀 MEMORIZE! 1.5s` in Snap Yellow `#FFFC00` with a rapid depletion bar.
* **Phase 3 (`4.0s`):** Tiles wave-flip face-down, a punchy `"GO!"` text flashes over `0.3s`, and the In-Game HUD activates.

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
|              [ SOLID MODE ]           | <-- Mode Indicator Badge
|                                       |
|       +-----------------------+       |
|       |  [?]  [?]  [✓]  [?]   |       |
|       |                       |       |
|       |  [?]  [✓]  [?]  [?]   |       | <-- 3D 4x4 Grid
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

* **Pod 1 — Live Bitmoji Spectator (Top Left):** Displays the player's Bitmoji avatar (or fallback). Glows Cyan when `streak >= 2` and pulses Crimson when `timer <= 10.0s`.
* **Pod 2 — Precision Countdown Timer (Top Center):** `64px` tabular bold font displaying tenths of a second (`48.6`). Pulses crimson at `10.0s`.
* **Pod 3 — Flip Efficiency Counter (Top Right):** Displays total individual tile taps (`FLIPS: 12`).
* **Bottom Controls:** Dynamic streak meter and quick `↻ RESTART` pill that immediately restarts a fresh shuffle.

---

### Screen 4: Tile Skin Drawer (Modal Bottom Sheet)
Opened from the Lobby (`🎨 TILE SKIN`). Slides up over the bottom `45%` of the screen while keeping the 3D board visible above so tapping an emblem previews it live on the tiles:

```text
+---------------------------------------+
|       (3D Board Live Preview Above)   |
+---------------------------------------+
|           SELECT TILE EMBLEM      [X] |
|                                       |
|  +--------+ +--------+ +--------+ +--------+
|  | [Snap] | | [Prism]| | [Gold] | |[Bitmoji|
|  |Classic | | 5 Wins | |≤18 Flip| |10W/≤16F|
|  |ACTIVE ✓| | EQUIP  | |  🔒    | |  🔒    |
|  +--------+ +--------+ +--------+ +--------+
|                                       |
|  Selected: Classic Snap Emblem        |
+---------------------------------------+
```

---

### Screen 5: Post-Game "Flex Card" & Victory Receipt
When the 8th pair is matched (or time expires), an arcade receipt card animates into the center:

```text
+---------------------------------------+
|                                       |
|    +-----------------------------+    |
|    |    ★ BOARD CLEARED! ★       |    |
|    |                             |    |
|    |      [Bitmoji Victory]      |    | <-- Large 2D Bitmoji Pose
|    |                             |    |
|    |        FINAL SCORE          |    |
|    |          7,620              |    | <-- Animated Count-Up
|    |     🏆 NEW PERSONAL BEST!   |    | <-- Shown if > highScore
|    |                             |    |
|    |  -------------------------  |    |
|    |  ⏱ TIME LEFT (34.2s) +3,420 |    |
|    |  🎯 FLIPS (18 Flips) +2,200 |    |
|    |  🔥 STREAK BONUS     +2,000 |    |
|    |  -------------------------  |    |
|    |  🔓 UNLOCKED: 24K GOLD FOIL!|    | <-- Milestone Toast (if earned)
|    +-----------------------------+    |
|                                       |
|    +-----------------------------+    |
|    |      P L A Y  A G A I N     |    | <-- Primary Snap Yellow CTA
|    +-----------------------------+    |
|    |  🏆 VIEW FRIEND LEADERBOARD |    | <-- Calls leaderboards.show()
|    +-----------------------------+    |
|    |       BACK TO LOBBY         |    | <-- Returns to welcome screen
|    +-----------------------------+    |
+---------------------------------------+
```

---

## 4. UI Implementation Architecture
* **HTML/CSS Overlay Layer:** Built on top of the 3D canvas with CSS `backdrop-filter: blur(12px)` for fast responsive layout and zero texture memory overhead.
* **Direct 3D World Interaction:** Raycasted taps on the 3D tiles with floating 3D particle bursts and spring animations on match.