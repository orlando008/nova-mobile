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
   the same frames. This is what makes bots, sweeps, replays and screenshot tests possible.
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
| Game file | 32 MB in all (code, pictures, sounds, fonts) |
| Saves | 1 MB of JSON per game |
| Reference phone | A mid-range phone from 2021 (an iPhone 12 or a Pixel 5a): the budgets are what it holds at 60 fps |

## 4. The screen

### 4.1 Points, pixels and the safe area

- A game works in **points**. The design canvas is 720 points wide; its height depends on the phone (4.2).
  720 x 1280 is a common design size for portrait phone games, and 720 points is about twice the width a phone's
  browser reports (360 to 430 CSS pixels). A point is 1.0 to 1.8 real pixels: about 1.0 on an iPhone SE (750 px),
  1.5 on a Pixel 7 (1080 px), 1.6 on an iPhone 15 (1179 px) and 1.8 on an iPhone 15 Pro Max (1290 px).
- A finger needs a target of at least 44 CSS pixels (Apple's guideline), which is **80 to 90 points**: the smallest
  button or cell a game should have.
- The console renders at the screen's real pixels (`devicePixelRatio`, capped at 3), so lines and text are sharp.
  A game never deals with pixels unless it asks (`screen().dpr`).
- The **safe area** (notches, rounded corners, the home bar) is reported to the game as insets in points. The game's
  background fills the whole screen; its buttons and text stay inside the safe area.

### 4.2 Shapes of screen

- **Portrait is the default.** The width is always 720 points; the height is what the screen's shape gives: about
  1280 on a 16:9 phone, about 1560 on a tall modern phone, about 960 on an iPad. A game lays out from the top and the
  bottom (a header, a board in the middle, a bar at the bottom) and lets the middle grow.
- **Landscape and tablets are opt-in.** A game lists the orientations it supports in its manifest (9.1):
  `"orientations": ["portrait"]` (the default) or `["portrait", "landscape"]`. In landscape the height is 720 points
  and the width grows instead. A portrait-only game on a landscape screen is shown centred in a portrait column, with
  the brand's dark background around it, and a "turn your phone" hint on phones.
- On a desktop the game runs in a phone-shaped column in the middle of the page, played with the mouse.
- `resize()` is called when the shape changes (a rotation, a desktop window).

### 4.3 Layers and the camera

A frame is drawn as a list of **layers**, back to front. A game makes as many as it needs (`layer(name)`), and each
has its own camera (position, zoom, rotation), opacity, blend mode and effects (5.6). A typical game has a world layer
that pans and zooms (a village, a board) and a UI layer that does not.

## 5. Drawing

`draw()` is immediate mode: each frame the game calls drawing functions, the console collects them into a draw list
and renders the whole list at once. Nothing persists between frames except the assets and the layers' settings.

### 5.1 Two kinds of art

A game can use either kind, or both, whichever suits it.

- **Pictures**: PNG or WebP files in the game (painted art, photos of clay models, generated art, pixel art scaled
  up). The packer packs them into texture atlases.
- **Vector art**: shapes described in code with the **vector kit** (5.2). At load, the console draws each vector asset
  once into an atlas **at the screen's real resolution**, so it is as sharp as on a native app and as fast to draw as a
  picture. A vector asset can be re-rendered at a new size (a zoom) on request.

Both kinds are drawn with the same `spr()` call, so a game can mix them freely.

### 5.2 The vector kit

A vector asset is a function that draws into a `ShapeContext` (a subset of the Canvas 2D path API plus helpers):
paths, rectangles, rounded rectangles, octagons, circles, stars and polygons; fills with solid colours, linear and
radial gradients; strokes; soft shadows; inner shadow and highlight (**gloss**) helpers; and boolean helpers
(union, cut). Recipes in `docs/art-recipes/` (to write) show candies, gems, coins, buttons, panels, fruit, buildings and
characters made from them, with a picture of each.

### 5.3 Sprites

`spr(asset, x, y, opts)` draws an asset. Options: `scale` (or `sx`, `sy`), `rot`, `anchor` (0..1, 0..1), `alpha`,
`tint`, `flash` (mixes toward a colour, for hits and pops), `blend` (normal, add, multiply, screen), `flipX`, `flipY`,
`frame` (for an animation strip) and `z` (order within a layer). The WebGL renderer batches sprites by atlas.

### 5.4 Shapes

For UI and effects drawn live: `rect`, `rrect`, `oct`, `circ`, `line`, `poly`, `ring` (a progress ring), each with a
fill (colour or gradient), a stroke and an alpha. These are tessellated on the GPU path, not drawn through Canvas 2D.

### 5.5 Text

- A game ships its own fonts (TTF, WOFF2; open licences), or uses the console's two built-in faces (a rounded display
  face and a clean UI face).
- `text(str, x, y, opts)`: size, colour or gradient, alignment, wrapping width, line height, an outline, a shadow, and
  `fit` (shrink to fit a box). Text is rendered through a glyph atlas at the real resolution.
- `measure(str, opts)` gives the box a text will take.
- Numbers that count up (scores, coins) have a helper: `counter(id, value)` eases the shown value toward the real one.

### 5.6 Effects

Per layer: **glow** (bloom on bright pixels), **drop shadow**, **blur**, **colour grade** (brightness, saturation, a
tint), **vignette**. Per frame: **screen shake** and a **flash**. Effects run as WebGL passes; on Canvas 2D only shake,
flash and colour grade are kept.

### 5.7 Motion: tweens and particles

- **Tweens**: `tween(obj, {x: 300, scale: 1.2}, {time, ease, delay, yoyo, repeat, then})` changes numbers on any object
  over frames. Easing: linear, quad, cubic, back, elastic, bounce, each in, out and in-out. Tweens run on the frame
  clock, so they are deterministic. Presets for what every game needs: `pop` (scale in with a bounce), `squash`, `wobble`,
  `float` (a number that rises and fades), `fly` (an item that flies to the score along a curve).
- **Particles**: `emit(preset or settings, x, y)`. Settings: count, lifetime, speed, angle, gravity, drag, size and
  colour over life, spin, the asset. Presets: sparkle, confetti, smoke puff, coin burst, star trail. Particles count
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

The console turns the raw touches into **gestures**, the same way on every device, so games share one feel:

| Gesture | Recognised when | Gives |
|---|---|---|
| `tap` | Down and up within 300 ms, moving less than 12 points | position |
| `doubletap` | Two taps within 300 ms and 30 points | position |
| `press` | Held 450 ms without moving 12 points | position (fires once while held) |
| `drag` | Moved 12 points after down | start, current, delta; then `drop` on release |
| `swipe` | A drag released faster than 800 points per second | direction (4 or 8), speed |
| `pinch` | Two touches | centre, scale change, rotation change |

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

## 9. Games and files

### 9.1 Source

A game is a folder, `carts/src/<name>/`:

```
game.json      the manifest: name, title, version, orientations, shelf, colours for the splash, credits
code.js        the game
art.js         vector assets (functions drawing with the vector kit), optional
assets/        pictures, sounds, music, fonts
tests/         the game's tests (rules as pure functions, a bot, screens to photograph)
```

### 9.2 The game file: `.novam`

`node tools/pack.js carts/src/<name> carts/<name>.novam` packs the folder into one file: a small binary container
with the manifest, the code, the atlases (pictures packed; vector code kept as code, drawn at load) and the sounds. The
site loads a game from its `.novam` file only, and only the games in the repository: there is no way to open a file
from elsewhere.

### 9.3 Sharing

A game is shared by its **link** (`/play/<name>`), with a poster picture and a title for link previews. (NOVA-16's
cart-as-PNG does not fit games of tens of megabytes, so there is none here.)

## 10. Programming model

```js
function init() {}         // once, after load and after the save is loaded
function update() {}       // 60 times per second: read gestures, change state
function draw(alpha) {}    // after each update, or more often on a 120 Hz screen; alpha is 0..1 between updates
function resize(w, h) {}   // the screen's shape changed (points)
function pause() {}        // the game was paused or hidden
```

- The game runs in a **Web Worker**: no DOM, no network. `draw()` fills a draw list (typed arrays), transferred to
  the main thread, which renders it with WebGL or Canvas 2D. This keeps a slow game from freezing the page and keeps
  the game away from the page.
- The game's code is a module evaluated with the API in scope, as on NOVA-16.
- An uncaught error stops the game and shows an error screen (Bit, worried) with the message and the line.
- `stat(key)`: `'fps'`, `'cpu'` (ms for update + draw), `'gpu'`, `'sprites'`, `'textures'` (MB), `'voices'`.
- In development the console shows a **budget bar** that turns amber over 80% of a budget and red over it.

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
| `tools/pack.js` | Packs a game into its `.novam` file |
| `tools/verify.js` | Checks a game: it packs, its tests pass, a soak run, its budgets, its docs |
| `tools/devkit/smoke.mjs` | Runs the game in Chromium with a phone's screen and touch, and taps through it |
| `tools/devkit/sweep.mjs` | The game's bot over many seeds |
| `tools/devkit/shots.mjs` | Screenshots on a set of devices (a small phone, a tall phone, an iPad in both orientations) |
| `tools/devkit/gallery.mjs` | Every screen the game lists, on contact sheets |
| `tools/devkit/art/` | Renders vector assets and atlases to PNG to look at |
| `tools/devkit/music/` | Renders songs and sounds to WAV and measures them |

## 13. Repository layout (planned)

```
index.html, style.css, sw.js, manifest.webmanifest   the website
src/            the console: worker, renderer (webgl/, canvas/), input, audio, the site's UI
carts/          packed games and carts/src/ their sources
docs/           SPEC.md, BRAND.md, carts/<name>.md, dev/ (the playbook)
brand/          the brand pictures
tools/          the tools in section 12
tests/          the console's tests
```

### 13.1 Adding a game

- A game is written in a branch of this repository, in `carts/src/<name>/` with its spec in `docs/carts/<name>.md`,
  and joins the site when its pull request is **approved and merged** by the repository's owner. Anyone who wants to
  write a game asks to join the repository.
- A pull request's checks run `tools/verify.js` on the games it changes; its preview link shows the site with the
  change, to try on a phone before approving.
- The packed `.novam` files are built from the sources and committed with them, so the site stays static.

## 14. Milestones

| # | Milestone | Done when |
|---|---|---|
| 1 | The frame | The site opens a game folder; worker, fixed timestep, draw list, WebGL sprites and shapes, Canvas 2D fallback; a test game draws 10 000 sprites at 60 fps on the reference phone |
| 2 | Touch | Raw touches, gestures, `hit`, `button`, haptics; a test game for each gesture; recordings replay exactly |
| 3 | Polish | Text with fonts, tweens and presets, particles, layer effects, camera |
| 4 | Assets | The vector kit and its recipes; pictures in atlases; the packer and `.novam` |
| 5 | Sound | The synth, samples, music, buses; the music and sound tools |
| 6 | Saves and time | `save`/`load`, export, the wall clock, `pause` |
| 7 | The website | Library, game pages, pause menu, PWA and offline, the brand |
| 8 | The workbench | new-cart, verify, smoke, sweep, shots, gallery, the playbook |
| 9 | First game | Merge Café (`docs/carts/merge-cafe.md`) released |
| 10 | Second game | A match-3, to prove the kit on a different kind of game |

## 15. Open questions

- The reference phone and its budgets, to measure once milestone 1 runs.
- The game file's name (`.novam`).

**Decided:**
- The design width is **720 points** (the user, 18 November 2026; section 4.1).
- No editors in the browser, and no loading of games from outside the repository (the user, 18 November 2026): every
  game is code in this repository, added through an approved pull request (principle 7, section 13.1).
