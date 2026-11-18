# nova-mobile: Platform Specification

**Status:** Draft 1 (18 November 2026). Nothing is built yet. This describes what we intend to build; change it in the
same commit as the code once code exists.
**Name:** nova-mobile (written **NOVA MOBILE** in the logo).
**Family:** one of the NOVA platforms, beside NOVA-16 (`orlando008/fanstasy-console`). The website follows
`docs/BRAND.md`; the games do not.

---

## 1. Overview

nova-mobile is a website that hosts **touch games made to be played on a phone or a tablet**: match-3, merge, base
building, idle, card and puzzle games. They run in the browser, full screen, with nothing to install (they can be
installed as an app if the player wants).

Unlike NOVA-16 it is **not a retro console**. Its games should look **polished and sleek**: smooth vector shapes or
painted pictures at the phone's full sharpness, soft light, lots of motion and lots of sprites. What it keeps from
NOVA-16 is the way games are made: a small fixed API, one file per game, deterministic frames, and tools that let an
agent build, test and look at a game without a person holding the phone.

## 2. Design principles

1. **Touch first.** Every game plays with one thumb in portrait, with taps, drags and swipes. No on-screen d-pads.
   Other inputs (a mouse, a second finger) are extras.
2. **Polish is the product.** The platform gives games what makes a phone game feel good for free: easing, squash
   and stretch, particles, glows, haptics, sound layered on every touch.
3. **Deterministic core.** The same game, the same seed and the same recorded inputs (touches and the clock) give
   the same game state, tick for tick (10.1). This is what makes bots, sweeps, replays and screenshot tests possible.
4. **Budgets, not limits.** NOVA-16's limits were the product. Here the limits are wide and **soft**: the console warns
   in development when a game goes over a budget, it does not refuse to run.
5. **Pure JavaScript, no build step.** ES modules served as static files; no frameworks, bundlers or transpilers;
   no runtime dependencies. The repo root deploys to GitHub Pages.
6. **No backend, no money.** No accounts, no servers, no ads, no purchases, no energy you can buy. A game may use
   timers and daily rewards as design, never as a paywall.
7. **Games live in the repository.** There are no editors in the browser. Every game is source code and files in this
   GitHub repository, and it reaches the site only through a reviewed pull request (13.1). The site plays only the games
   it hosts.

## 3. The device

nova-mobile describes an imaginary phone, generous by today's standards, so a game can rely on it.

| Part | Budget |
|---|---|
| Screen | Portrait, designed at **720 x 1280 points** (9:16), rendered at the device's real pixel density (up to 3x) |
| Frame rate | 60 Hz fixed timestep (logic); rendering follows the display, up to 120 Hz, interpolated |
| Renderer | WebGL 2, with a Canvas 2D fallback (5.8) |
| Sprites | **10 000 per frame** on WebGL (soft budget; the reference phone holds 60 fps); 2 000 on Canvas 2D |
| Texture memory | 128 MB of decoded images and drawn vector art |
| Touches | Up to 5 at once |
| Audio | 32 voices; a synth and sampled sounds; music and effects buses (7) |
| Code | 512 KB of JavaScript source |
| Cart size | 32 MB in all (code, pictures, sounds, fonts) |
| Saves | 1 MB of JSON per game |
| Reference phone | A mid-range phone from 2021 (proposal: an iPhone 12 or a Pixel 5a; chosen in milestone 1): the budgets are what it holds at 60 fps |

## 4. The screen

### 4.1 Points, pixels and the safe area

- A game works in **points**. The design canvas is 720 points wide; its height depends on the phone (4.2), and section 4.3 maps it to the screen.
  720 x 1280 is a common design size for portrait phone games, and 720 points is about twice the width a phone's
  browser reports (360 to 430 CSS pixels). A point is 1.0 to 1.8 real pixels: about 1.0 on an iPhone SE (750 px),
  1.5 on a Pixel 7 (1080 px), 1.6 on an iPhone 15 (1179 px) and 1.8 on an iPhone 15 Pro Max (1290 px).
- A finger needs a target of at least **44 x 44 CSS pixels** (Apple's guideline). The minimum is set in CSS pixels,
  not points, because that is what a finger measures: it is 84 points on the narrowest supported phone (375 CSS px
  wide) and 74 on a 430 px one, so a game that keeps its targets at **84 points or more** meets it everywhere.
  `tools/verify.js` cannot check this; the diagnostic fixture's target grid (section 14, milestone 1) shows it on a phone.
- The console renders at the screen's real pixels (`devicePixelRatio`, capped at 3), so lines and text are sharp.
  A game never deals with pixels unless it asks (`screen().dpr`).
- The **safe area** (notches, rounded corners, the home bar) is reported to the game as insets in points. The game's
  background fills the whole screen; its buttons and text stay inside the safe area.

### 4.2 Shapes of screen

- **Portrait is the default.** The width is always 720 points; the height is what the screen's shape gives: about
  1280 on a 16:9 phone, about 1560 on a tall modern phone, about 960 on an iPad. A game lays out from the top and the
  bottom (a header, a board in the middle, a bar at the bottom) and lets the middle grow.
- **Landscape and tablets are opt-in.** A game lists the orientations it supports in its manifest (9.2):
  `"orientations": ["portrait"]` (the default) or `["portrait", "landscape"]`. In landscape the height is 720 points
  and the width grows instead. A portrait-only game on a landscape screen is shown centered in a portrait column, with
  the brand's dark background around it, and a "turn your phone" hint on phones.
- On a desktop the game runs in a phone-shaped column in the middle of the page, played with the mouse.
- `resize()` is called when the shape changes (a rotation, a desktop window).

### 4.3 Mapping the screen to points

The console works out one **scale** from the page's CSS pixels to points, and keeps it until the next `resize`:

- **Portrait:** `scale = 720 / viewportWidthCss`; the screen's height in points is `viewportHeightCss x scale`.
  On a 375 x 667 CSS viewport (iPhone SE) that is 1.92 points per CSS pixel and 720 x 1281 points.
- **Landscape (opt-in):** the same with the height: `scale = 720 / viewportHeightCss`.
- **Portrait-only on a landscape screen, and the desktop:** a portrait column of 9:16 or taller, as high as the
  viewport, centered; the scale comes from the column's width.
- A touch at CSS position `(cx, cy)` relative to the game's canvas is at `(cx x scale, cy x scale)` points. The main
  thread does this conversion, so the game, the recording and the replay only ever see points.
- The **safe area** comes from CSS `env(safe-area-inset-*)`, multiplied by the scale and given to the game in points
  (`screen().safe = {top, right, bottom, left}`).
- The canvas's backing store is `viewportCss x min(devicePixelRatio, 3)` real pixels; the renderer maps points to
  them. Neither the scale nor the pixel ratio is visible to gameplay except through `screen()`.
- **Touch thresholds are in CSS pixels** (6.2), converted to points with the scale, so a gesture feels the same on
  every phone whatever its size.

### 4.4 Layers and the camera

A frame is drawn as a list of **layers**, back to front. A game makes as many as it needs (`layer(name)`), and each
has its own camera (position, zoom, rotation), opacity, blend mode and effects (5.6). A typical game has a world layer
that pans and zooms (a village, a board) and a UI layer that does not.

## 5. Drawing

`draw()` is immediate mode: each frame the game calls drawing functions, the console collects them into a draw list
and renders the whole list at once. Nothing persists between frames except the assets and the layers' settings.

### 5.1 Two kinds of art

A game can use either kind, or both, whichever suits it.

- **Pictures**: PNG or WebP files in the game (painted art, photos of clay models, generated art, pixel art scaled
  up). At load the console packs them into texture atlases in the browser.
- **Vector art**: shapes described in code with the **vector kit** (5.2). At load, the console draws each vector asset
  once into an atlas **at the screen's real resolution**, so it is as sharp as on a native app and as fast to draw as a
  picture. A vector asset can be re-rendered at a new size (a zoom) on request.

Both kinds are drawn with the same `spr()` call, so a game can mix them freely.

### 5.2 The vector kit

A vector asset is a function that draws into a `ShapeContext` (a subset of the Canvas 2D path API plus helpers):
paths, rectangles, rounded rectangles, octagons, circles, stars and polygons; fills with solid colors, linear and
radial gradients; strokes; soft shadows; inner shadow and highlight (**gloss**) helpers; and boolean helpers
(union, cut). Recipes in `docs/art-recipes/` (to write) show candies, gems, coins, buttons, panels, fruit, buildings and
characters made from them, with a picture of each.

### 5.3 Sprites

`spr(asset, x, y, opts)` draws an asset. Options: `scale` (or `sx`, `sy`), `rot`, `anchor` (0..1, 0..1), `alpha`,
`tint`, `flash` (mixes toward a color, for hits and pops), `blend` (normal, add, multiply, screen), `flipX`, `flipY`,
`frame` (for an animation strip) and `z` (order within a layer). The WebGL renderer batches sprites by atlas.

### 5.4 Shapes

For UI and effects drawn live: `rect`, `rrect`, `oct`, `circ`, `line`, `poly`, `ring` (a progress ring), each with a
fill (color or gradient), a stroke and an alpha. These are tessellated on the GPU path, not drawn through Canvas 2D.

### 5.5 Text

- A game ships its own fonts (TTF, WOFF2; open licenses), or uses the console's two built-in faces (a rounded display
  face and a clean UI face).
- `text(str, x, y, opts)`: size, color or gradient, alignment, wrapping width, line height, an outline, a shadow, and
  `fit` (shrink to fit a box). Text is rendered through a glyph atlas at the real resolution.
- `measure(str, opts)` gives the box a text will take.
- Numbers that count up (scores, coins) have a helper: `counter(id, value)` eases the shown value toward the real one.

### 5.6 Effects

Per layer: **glow** (bloom on bright pixels), **drop shadow**, **blur**, **color grade** (brightness, saturation, a
tint), **vignette**. Per frame: **screen shake** and a **flash**. Effects run as WebGL passes; on Canvas 2D only shake,
flash and color grade are kept.

### 5.7 Motion: tweens and particles

- **Tweens**: `tween(obj, {x: 300, scale: 1.2}, {time, ease, delay, yoyo, repeat, then})` changes numbers on any object
  over frames. Easing: linear, quad, cubic, back, elastic, bounce, each in, out and in-out. Tweens run on the frame
  clock, so they are deterministic. Presets for what every game needs: `pop` (scale in with a bounce), `squash`, `wobble`,
  `float` (a number that rises and fades), `fly` (an item that flies to the score along a curve).
- **Particles**: `emit(preset or settings, x, y)`. Settings: count, lifetime, speed, angle, gravity, drag, size and
  color over life, spin, the asset. Presets: sparkle, confetti, smoke puff, coin burst, star trail. Particles count
  toward the sprite budget.

### 5.8 Renderers

- **WebGL 2** is the renderer: batched textured quads, the effects in 5.6, up to 10 000 sprites at 60 fps on the
  reference phone.
- **Canvas 2D** is the fallback when WebGL is missing or lost: the same draw list, fewer effects, a lower sprite budget.
  A game does not need code for it.
- Both renderers draw the same draw list, so a screenshot test can run either.

## 6. Input

### 6.1 Touches

Each frame the main thread samples the pointers and sends them to the game: up to 5 touches, each with an id, a
position in points (in the layer's space on request), and a phase (`down`, `move`, `up`, `cancel`). A mouse is one
touch; the wheel is a pinch. These raw touches are what a recording stores, which keeps the game deterministic.

### 6.2 Gestures

The console turns the raw touches into **gestures**, the same way on every device, so games share one feel. Distances
and speeds are in **CSS pixels** (4.3), and gestures report positions in points:

| Gesture | Recognized when | Gives |
|---|---|---|
| `tap` | Down and up within 300 ms, moving less than 10 CSS px | position |
| `doubletap` | Two taps within 300 ms and 24 CSS px | position |
| `press` | Held 450 ms without moving 10 CSS px | position (fires once while held) |
| `drag` | Moved 10 CSS px after down | start, current, delta; then `drop` on release |
| `swipe` | A drag released faster than 500 CSS px per second | direction (4 or 8), speed (points per second) |
| `pinch` | Two touches | center, scale change, rotation change |

`gesture()` returns this frame's gestures. Most games use only `tap`, `drag`/`drop` and `swipe`.

### 6.3 Hit testing and buttons

`hit(x, y, shape)` tests a point against a rectangle, circle or octagon. `button(id, box, opts)` is an immediate-mode
button: it draws nothing itself, but tracks press, release and cancel (a finger sliding off cancels), and returns
`'pressed'`, `'held'` or `'clicked'`, so a game's own drawing can squash while held.

### 6.4 Haptics

`buzz(pattern)` vibrates where the phone allows it (`'tick'`, `'tap'`, `'thud'`, `'success'`, or a list of ms). It is
an output only and never affects the game's state. A player can turn it off.

### 6.5 Back and pause

The browser's back button and the console's ☰ button open the pause menu (11.2). `pause()` is called on the game,
and when the page is hidden (the player switches apps).

## 7. Audio

- **Web Audio**, 32 voices, a **music** bus and an **effects** bus, each with a volume the player sets. Effects can
  **duck** the music.
- **Synth instruments**, richer than NOVA-16's: several oscillators per voice (sine, triangle, saw, square, noise,
  wavetable), FM, an ADSR envelope, a filter with its own envelope, vibrato, and **reverb** and **delay** sends. Presets:
  piano, electric piano, bell, marimba, pluck, pad, strings, brass, bass, kick, snare, hats.
- **Samples**: short sounds as WAV, MP3 or M4A files (formats every phone's browser decodes).
- **Music**: either a song written in the console's pattern format (tracks of notes for the synth and samples, like
  NOVA-16's but with more channels and the new instruments), or an audio file streamed and looped.
- `sfx(name, opts)` plays a sound with pitch, volume and pan, and **variation** (a little random pitch so repeated pops do
  not sound the same). `music(name, {fade})` changes the song.
- Phones only start audio after a touch: the console unlocks it on the first touch, and sounds asked for before that
  are dropped, not queued.

## 8. Time, saves and the clock

- `t()` is frames since the game started.
- **The wall clock** is an input like a touch: the main thread sends the real time each frame, and recordings store it.
  `now()` returns it (ms since 1970). A game uses it for "the bakery finishes in 2 hours" or "a new daily special
  tomorrow", and a bot can move it forward to test them.
- **Saves**: `save(obj)` stores any JSON-able object (up to 1 MB) for the game; `load()` gives it back or `null`. The
  console keeps them in IndexedDB, and the pause menu can **export** a save as a file and import it again.
- `Math.random` is a seeded generator; `rnd`, `rndi` and `srand` as on NOVA-16.

## 9. Carts and the repository

A game is called a **cart**, as on NOVA-16. Every cart lives in this repository and is played straight from its folder:
there is no packed file and no pack step.

### 9.1 The cart folder

```
carts/<name>/
  game.json      the manifest (9.2)
  code.js        the game: the lifecycle functions of section 10
  art.js         vector assets (functions drawing with the vector kit), optional
  assets/        pictures, sounds, music, fonts, in any sub-folders
  tests/         the cart's tests: rules as pure functions, a bot, recordings to replay, screens to photograph
play/<name>/index.html   the cart's link page (9.6)
docs/carts/<name>.md     the cart's spec
```

`<name>` is lower-case letters, digits and hyphens, 2 to 32 characters, starting with a letter, and is the cart's id
everywhere (its folder, its link, its save, its cache).

### 9.2 The manifest: `game.json`

| Field | Required | Meaning |
|---|---|---|
| `format` | yes | The manifest format, `1` |
| `name` | yes | The cart's id: the same as its folder |
| `title` | yes | Its title as shown, up to 40 characters |
| `version` | yes | `major.minor.patch`; raise it with every change a player would notice |
| `console` | yes | The lowest console API version it needs, `major.minor` |
| `description` | yes | One or two sentences, for the Library and link previews (up to 200 characters) |
| `shelf` | yes | One of the Library's shelves (11.1) |
| `orientations` | no | `["portrait"]` (the default), or `["portrait", "landscape"]` |
| `poster` | yes | A picture in `assets/`, 1200 x 630, for the Library tile and link previews |
| `icon` | yes | A square picture in `assets/`, 512 x 512, for an installed cart |
| `splash` | no | `{ "background": "#rrggbb", "foreground": "#rrggbb" }` for the loading screen |
| `assets` | yes | Every file in `assets/`, as `{ "path": "assets/...", "bytes": n, "sha256": "..." }`, optional ones marked `"lazy": true` (loaded on first use, such as streamed music) |
| `contentVersion` | yes | A hash of `code.js`, `art.js` and the `assets` list; names the cached version (9.5) |
| `credits` | no | Authors and the licenses of anything not made for the cart |
| `fixture` | no | `true` for a diagnostic or test cart, hidden from the Library and listed only in development |

`bytes`, `sha256` and `contentVersion` are written by `tools/verify.js --fix`, never by hand.

### 9.3 The cart index: `carts/index.json`

The list of carts the site offers, in Library order:

```json
{ "format": 1, "carts": [ { "name": "diag", "path": "carts/diag/" } ] }
```

The site plays only the carts in this index: there is no way to open a cart from anywhere else. A cart folder that is
not in the index, or an index entry with no folder, fails the checks (13.2).

### 9.4 Startup: from a link to the first tick

1. **Find.** The page (`play/<name>/` or the Library) reads `carts/index.json` and looks up `<name>`; a name not in the
   index shows "no such game" (Bit, worried).
2. **Validate.** It fetches `game.json` and checks it against 9.2: the format, the required fields, the name matching
   the folder, and `console` not newer than the running console. A failure stops here with the field that failed.
3. **Fetch.** It fetches `code.js`, `art.js` and every asset not marked lazy, checking each against its `bytes` and
   `sha256`. The loading screen shows the progress; a file that fails shows which one.
4. **Prepare.** It decodes the pictures and sounds, starts the worker, hands it the code and the assets, and the worker
   draws the vector assets and packs the atlases.
5. **Screen.** It works out the scale and the safe area (4.3) and sends them with the first frame's input.
6. **Start.** The worker loads the save (8), seeds the generator, calls `init()`, and the fixed-tick loop begins:
   tick 0 is the first `update()`.

### 9.5 Offline

A cold start offline needs more than a cart's assets: the site's shell (pages, styles, the console's modules and its
worker) and every file of steps 1 to 3 of 9.4, lazy files included. The service worker caches a cart as one
**version**, named by its `contentVersion`:
- A cart is **ready offline** only once every file of that version is cached; the Library marks it so.
- When a cart changes, the new version downloads in the background and replaces the old one only once it is complete,
  so the version already cached stays playable until then.
- The site's shell is versioned the same way, by a hash of its files.

### 9.6 Links

A cart is shared by its **link**, `play/<name>/`. GitHub Pages serves static files only and runs no server code, so:
- Each cart has a real page, `play/<name>/index.html`, committed with it. It holds the cart's title, description and
  poster in its `<title>` and Open Graph tags (for link previews), and starts the console on that cart. The checks
  (13.2) confirm it agrees with `game.json`.
- Every path the site uses is **relative to the deployment's base path**, never to the domain's root: the site is
  served under `/nova-mobile/` (`https://orlando008.github.io/nova-mobile/play/<name>/`), and later perhaps at a
  domain's root, and both must work.
- The smoke test opens each cart's link in a fresh browser (no cache, no service worker) to check it.

(NOVA-16's cart-as-PNG does not fit games of tens of megabytes, so there is none here.)

## 10. Programming model

```js
function init() {}         // once, after load and after the save is loaded
function update() {}       // 60 times per second: read gestures, change state
function draw(alpha) {}    // after each update, or more often on a 120 Hz screen; alpha is 0..1 between updates
function resize(w, h) {}   // the screen's shape changed (points)
function pause() {}        // the game was paused or hidden
```

- The game runs in a **Web Worker**. `draw()` fills a draw list (typed arrays), transferred to the main thread, which
  renders it with WebGL or Canvas 2D. This keeps a slow game from freezing the page.
- **No network for games** is a **rule for reviewed code, not a security guarantee.** A worker has no DOM, but it
  does have `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource` and `importScripts`, and GitHub Pages cannot send the
  response headers that would let a Content-Security-Policy lock a worker down. What holds the rule:
  - games reach the site only through an approved pull request (13.1), and review is the real guarantee;
  - `tools/verify.js` fails a game whose code names any of those APIs, `eval`, `Function` or `import(`;
  - before the game's code runs, the console's worker removes those names from its global scope, which stops
    accidents, not a determined author.
  The console itself loads the cart's files (9.4) and hands them to the game; a game never fetches.
- **Ticks.** The loop runs `update()` at a fixed 60 ticks a second from an accumulator: each display frame runs as
  many ticks as the time elapsed calls for, at most 4 (beyond that the backlog is dropped, so a stall never becomes a
  spiral), then one `draw(alpha)`. Each tick reads exactly one tick's input (the touches, the clock and the screen of
  10.1), sampled by the main thread and sent with it.
- **Rendering.** `draw()` fills the draw list; the main thread renders the latest list once per display frame. The game
  never waits on the renderer, and the renderer never changes the game.
- The game's code is a module evaluated with the API in scope, as on NOVA-16.
- An uncaught error stops the game and shows an error screen (Bit, worried) with the message and the line.
- `stat(key)`: `'fps'`, `'cpu'` (ms for update + draw), `'gpu'`, `'sprites'`, `'textures'` (MB), `'voices'`.
- In development the console shows a **budget bar** that turns amber over 80% of a budget and red over it.

### 10.1 Determinism and replays

**What a replay guarantees:** given the same game version, the same **starting save** and the same **recording**,
the game's state after each `update()` is identical, tick for tick, on any device and either renderer.

- **The recording** is indexed by tick (one tick = one `update()`). For each tick it stores everything the game can
  read: the touches (6.1), the wall clock (8), the screen's size and safe area (4.1), and the lifecycle events (`init`,
  `resize`, `pause`, resume). Gestures are not stored: they are worked out from the touches, the same way every time.
  It also stores the seed and the starting save.
- **`update()` owns the game's state.** `draw()` may read the state and keep purely visual things (an animation's
  frame, a particle's position), but it must not change gameplay state or call the gameplay random generator: it runs
  a different number of times on a 60 Hz and a 120 Hz screen, and with a different `alpha`. A second generator,
  `vrnd()`, is for visual randomness in `draw()`; it never affects a replay. In development the console checks this
  by snapshotting the state before and after `draw()`.
- Tweens and particles (5.7) that matter to gameplay run in `update()`; purely decorative ones may run in `draw()`.
- **Comparing runs:** tests compare a hash of the game's state (`state()`, which the game returns) at fixed ticks, not
  pixels. Screenshots, for the gallery and the renderer comparison, are taken at a fixed tick with `alpha = 0`, so
  both renderers draw the same frame.

## 11. The website

### 11.1 Library

The home page: games as octagonal tiles (docs/BRAND.md), on shelves by kind (Puzzle, Merge, Build, Cards, Arcade).
A tile shows the game's poster; tapping it opens the game's page (a short description, screenshots, Play).

### 11.2 Playing

A game plays full screen. The only platform control on screen is a small ☰ octagon in a corner the game chooses
(top left by default) which opens the pause menu: Resume, Sound (music and effects volume), Haptics, Export or import the
save, Restart, Quit to the Library.

### 11.3 Installing and offline

The site is a PWA: it can be added to the home screen, and every game played once works offline. Each game can also be
installed on its own, opening straight into it.

## 12. Tools

The NOVA-16 workflow, carried over and changed for touch:

| Tool | Does |
|---|---|
| `tools/new-cart.js` | A new game from a template: a working frame, tests, a bot, art and audio scripts, a spec |
| `tools/verify.js` | Checks a game: `game.json` lists every asset and nothing missing, its tests pass, a soak run, its budgets, its docs |
| `tools/devkit/smoke.mjs` | Runs the game in Chromium with a phone's screen and touch, and taps through it |
| `tools/devkit/sweep.mjs` | The game's bot over many seeds |
| `tools/devkit/shots.mjs` | Screenshots on a set of devices (a small phone, a tall phone, an iPad in both orientations) |
| `tools/devkit/gallery.mjs` | Every screen the game lists, on contact sheets |
| `tools/devkit/art/` | Renders vector assets and atlases to PNG to look at |
| `tools/devkit/music/` | Renders songs and sounds to WAV and measures them |

## 13. The repository, review and publishing

### 13.0 Layout

```
index.html, style.css, sw.js, manifest.webmanifest   the site's shell and the Library
play/<name>/index.html   one link page for each cart (9.6)
src/            the console: the loader, the worker, the renderers (webgl/, canvas/), input, audio, the site's UI
carts/          index.json (9.3) and one folder for each cart (9.1)
docs/           SPEC.md, BRAND.md, carts/<name>.md (one spec for each cart), dev/ (the playbook)
brand/          the brand pictures
tools/          the tools of section 12
tests/          the console's own tests, and the recordings they replay
.github/workflows/   the checks (13.2) and the publishing (13.3)
```

### 13.1 Adding a game

- A cart is written on a branch of this repository, in `carts/<name>/` with its spec in `docs/carts/<name>.md` and its
  link page in `play/<name>/`, and added to `carts/index.json`.
- It joins the site when its pull request is **approved and merged** by the repository's owner. Anyone who wants to
  write a game asks to join the repository. A new cart's first pull request should be its spec alone, so the idea is
  agreed before the work.

### 13.2 Checks

`node tools/verify.js` runs on every pull request (a GitHub Actions workflow) and before every commit. It needs only
Node, no browser. It fails on:

| Check | Fails when |
|---|---|
| Index | `carts/index.json` is not valid (9.3), names a missing folder, or misses a folder in `carts/` |
| Manifest | A `game.json` breaks 9.2: a missing or wrong field, a name that differs from the folder, a poster or icon of the wrong size |
| Files | An asset listed but missing, a file in `assets/` not listed, a `bytes` or `sha256` that does not match, a stale `contentVersion` |
| Link page | `play/<name>/index.html` missing, or its title, description or poster differing from `game.json` |
| Paths | A path in the site or a cart that starts with `/` (it must be relative to the base path, 9.6) |
| Network | Cart code naming `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `importScripts`, `eval`, `Function` or `import(` (10) |
| Budgets | Code over 512 KB or a cart over 32 MB (3): a warning, not a failure |
| Spec | A cart without `docs/carts/<name>.md`, or a doc naming a file or tool that does not exist |
| Tests | The cart's and the console's tests, including the recordings replayed to their state hashes (10.1) |

`--fast` skips the tests; `--fix` writes the hashes and sizes. Checks that need a browser (the smoke test, screenshots
on phone sizes) run with `tools/devkit/` on a developer's machine and are not part of CI at first.

### 13.3 Publishing

- **The site is `main`.** GitHub Pages serves the repository's `main` branch as it is (no build step), so a merged pull
  request is live as soon as Pages deploys it.
- **Previews.** Each open pull request is also deployed by a workflow to `pr/<number>/` under the site
  (`https://orlando008.github.io/nova-mobile/pr/<number>/`), to try on a phone before approving; it is removed when the
  pull request closes. Because every path is relative (9.6), the same files work there.
- **Branch protection.** `main` takes changes only through pull requests with one approval and the checks of 13.2
  passing (set by the owner in the repository's settings).

## 14. Milestones

This spec is the deliverable of the planning stage. Building starts with a **console bring-up on a real phone**: the
repository, the loader, input, the renderer and replays tested together on a minimal diagnostic fixture, before any
game. Which games come first is decided in their own pull requests (13.1).

| # | Milestone | Done when |
|---|---|---|
| 1 | Bring-up | The repository layout (13.0), `carts/index.json` and a diagnostic fixture, `carts/diag/` (`"fixture": true`). On the user's phone, its link page finds it through the index, validates and loads its manifest (9.4), starts the worker and the fixed-tick loop, and draws a shape with WebGL. The fixture shows a tap, a drag and a release where the finger is, in points; shows the screen's size in points, the scale and the safe-area insets (4.3); and draws a grid of 84-point targets to check against a finger on a small phone (4.1). A recording of that input replays at fixed ticks to the same state hashes (10.1). A first `tools/verify.js` runs the index, manifest, files, link page, paths and network checks (13.2). The reference phone is chosen |
| 2 | Touch and layout | Every gesture, `hit`, `button`, haptics; `resize`, orientations, the landscape column and the desktop column |
| 3 | Renderers | The Canvas 2D fallback; batching; the sprite benchmark measured on the reference phone (target 10 000 at 60 fps); the two renderers compared by screenshot (10.1) |
| 4 | Polish | Text with fonts, tweens and presets, particles, layer effects, camera |
| 5 | Assets | The vector kit and its recipes; lazy assets; pictures and vector art in atlases |
| 6 | Sound | The synth, samples, music, buses; the music and sound tools |
| 7 | Saves and time | `save`/`load`, export, the wall clock, `pause` |
| 8 | The website | Library, link pages (9.6), pause menu, PWA and offline versions (9.5), previews (13.3), the brand |
| 9 | The workbench | new-cart, the full verify, smoke, sweep, shots, gallery, the playbook |

## 15. Open questions

- The reference phone (chosen in milestone 1) and its budgets (measured in milestone 3).

**Decided:**
- **No packed game file:** the site plays each game straight from its folder (the user, 18 November 2026; 9.1).
- The design width is **720 points** (the user, 18 November 2026; section 4.1).
- No editors in the browser, and no loading of games from outside the repository (the user, 18 November 2026): every
  game is code in this repository, added through an approved pull request (principle 7, section 13.1).
