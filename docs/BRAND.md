# The NOVA brand

**Status:** Draft 1 (18 November 2026). Applies to the websites of every NOVA platform (NOVA-16, nova-mobile,
nova-64 and later ones). It lives here until a `nova` umbrella repo exists, then moves there.

**Scope:** the brand is the **platform**: the website, the Library, menus, loading and error screens, icons and logos.
It is **not** the games. Every game has its own art, palette and style, and nothing here limits them.

The source pictures are in `brand/`: the NOVA-16 console (`nova-16-console.webp`), its controller
(`nova-16-controller.webp`) and Bit's character sheet (`bit-sheet.webp`).

The [NOVA Mobile visual brand guide](../brand/nova-mobile-brand-guide.png) shows the website palette, wordmark,
components, and concepts for the phone mark and Bit.

---

## 1. Colors

Four families: **black, purple, cyan and cream**. The values were sampled from the source pictures and rounded; tune
them once, here, and every platform follows.

| Token | Hex | Role |
|---|---|---|
| `--void` | `#08080C` | Outlines, the page's deepest background, letterboxing around a game |
| `--panel` | `#181828` | Panels and cards: a navy black, the console's body |
| `--panel-2` | `#202034` | A raised panel or a hovered card (a step up from `--panel`) |
| `--slate` | `#384068` | Bevels, dividers, disabled controls, the console's trim |
| `--purple-deep` | `#581090` | Shaded sides, pressed buttons, the lower half of a gradient |
| `--purple` | `#9020E8` | The main brand color: big shapes, primary buttons, the console's sides |
| `--purple-muted` | `#8028A8` | Secondary shapes, the controller's trim, Bit's backpack |
| `--purple-light` | `#B070F8` | Purple **text** and small purple icons (purple itself is too dark for them) |
| `--cyan` | `#28F8F8` | Light: glow lines, focus rings, active states, links, the logotype, Bit's eyes |
| `--cream` | `#F8E8C8` | Body text and Bit's body |
| `--cream-shade` | `#D8B8A8` | Secondary text, Bit's shading |

**Text contrast** (WCAG, against `--panel` / `--void`; WCAG uses the unrounded ratio, so 2.96 fails 3:1):

| Text color | On panel | On void | Use for text? |
|---|---|---|---|
| cream | 14.5 | 16.5 | Yes: body text |
| cyan | 13.2 | 15.1 | Yes: links, headings, numbers |
| cream-shade | 9.5 | 10.8 | Yes: secondary text |
| purple-light | 5.43 | 6.21 | Yes: purple headings, labels and icons (4.95 on panel-2) |
| purple | 2.96 | 3.39 | No: fills only. It misses 3:1 on panel, even for large text |
| purple-muted, slate | under 3 | under 3 | Never for text |

Purple is for **shapes**, cyan is for **light**, cream is for **words**. When words must be purple, use purple-light.

**On purple:** cream on `--purple` is 4.88:1, so the primary button's cream label passes for normal text.

**Proportions.** Mostly dark (void and panel), a lot of purple, a little cyan. Cyan is the accent: if a screen has more
cyan than purple, it has too much.

**Light mode.** None. The NOVA sites are dark, like the console. (A game can be as bright as it likes.)

## 2. The octagon

The console and the controller are both **octagons**: rectangles with their corners cut off at 45°. That chamfer is
the brand's shape, the way a rounded corner is someone else's.

- **Panels, cards, buttons and tiles** have chamfered corners, not rounded ones. A chamfer is about 12% of the shorter
  side, at least 4 px. In CSS: `clip-path: polygon(...)` with the eight points, or the `oct()` helper in the site's CSS.
- **Edge light.** A panel can carry a 2 px **cyan line** along its top edge and down the chamfers, as on the console's top.
  Use it for the one thing on a screen that is active or chosen (the focused tile, the play button), not for everything.
- **Bevels.** A slate line inside the top edge and a purple-deep line along the bottom give a panel its depth, as the
  console has.
- **The play button** is an octagon with a cyan triangle in it.
- **Icons** that sit in a shape (the app icon, the menu button, avatars) sit in an octagon.
- **Never** combine chamfers and rounded corners on the same element.

## 3. Bit

Bit is the mascot of every NOVA platform: a small robot with a cream body, a **black screen for a face with cyan eyes**,
a purple cartridge backpack, a cable tail with a plug, and cyan soles.

**Where Bit appears:**

| Moment | Pose (from the sheet) |
|---|---|
| Loading a game | Plugging his cable into a socket |
| Empty Library or no results | Standing, looking up, neutral eyes |
| A game finished, a high score, an install done | Cheering, arms up, happy eyes |
| The app icon and the splash screen | Hugging the console |
| Errors and the 404 page | Standing with a worried look (a pose to draw) |
| The About page | The front, three-quarter and back turnaround |

**Rules:**
- Bit is a **helper, not a decoration**: one Bit per screen at most, and only where he says something.
- His face is a screen: expressions are the cyan eyes only (open, happy arcs, worried, closed). No mouth.
- Keep his proportions: the head is as wide as the body is tall.
- On nova-mobile, Bit is drawn smooth (vector or high-resolution art) in the same colors and shapes. On NOVA-16 he
  is pixel art. He is the same character on every platform; only the drawing style follows the platform.
- Bit never appears inside a game unless the game chooses to put him there.

## 4. Type

| Use | Face | Notes |
|---|---|---|
| NOVA, NOVA-16 and NOVA-64 logotypes | Blocky pixel lettering in cyan, as on the NOVA-16 console | Logo artwork |
| NOVA MOBILE wordmark | *Space Grotesk* Bold (700), uppercase (OFL) | Cyan. Deliberately not pixel lettering (section 5) |
| Headings | *Space Grotesk* (OFL), a geometric sans with square shoulders | Cream or cyan |
| Body and UI | *Inter* (OFL), a clean sans | Cream; secondary in cream-shade |
| Numbers (scores, sizes, versions) | The heading face with tabular figures | Cyan |

Space Grotesk and Inter are **decided** (the user, 18 November 2026): the wordmark is set in Space Grotesk, so the
headings use it too, and Inter is the body face shown in the visual guide. Fonts are served from the site itself (no
outside font service), so the site works offline.

## 5. The logo

- Use the cyan pixel logotypes for **NOVA**, **NOVA-16** and **NOVA-64** on void or panel.
- Set **NOVA MOBILE** in uppercase Space Grotesk Bold (700), in cyan on void or panel. This is **deliberately different**
  from the pixel logotypes (the user's decision, 18 November 2026): NOVA-16 and NOVA-64 are retro consoles and their
  logos look it, while nova-mobile is sleek and modern, so its wordmark is too. The family stays tied together by the
  cyan on dark, the octagonal marks and Bit, not by one typeface.
- The pixel logotypes are logo artwork (images); the NOVA MOBILE wordmark is set in the font, so it can be rendered
  at any size, but keep its letter-spacing and weight as in the visual guide.
- Each platform has a small **mark**: its console or device drawn in the house colors, in an octagon (NOVA-16: the
  console from the source picture; nova-mobile: the proposed chamfered phone with a cyan play triangle in the visual guide).
- Leave clear space around the logo of at least the height of its letters.

## 6. Components

| Component | Look |
|---|---|
| Page | `--void` background; content on `--panel` |
| Game tile (Library) | An octagonal card: the game's own picture fills it, its title in cream below; the focused or hovered tile gets the cyan edge light |
| Primary button | Purple octagon, cream label; pressed: purple-deep, moved down 1 px |
| Secondary button | Panel octagon with a slate outline, cream label |
| Focus ring | 2 px cyan, following the octagon |
| Toggle or tab chosen | Cyan underline or cyan edge light |
| Menu button in a game | A small panel octagon with ☰ in cream, in a corner, never covering the game's own controls |

## 7. Motion

- Short and firm: 120 to 200 ms, ease-out.
- Light moves, shapes do not wobble: the cyan edge light can sweep along a tile when it is focused; panels slide or fade.
- Bit can bounce once when he appears.
- Respect `prefers-reduced-motion`: fades only.

## 8. Open questions

- Fix the exact hex values once a designer's file or the source vectors exist.
- Draw Bit's worried pose and finalize the proposed nova-mobile phone mark: check it still reads at 16 and 32 px
  (the browser tab icon), where the phone and its triangle may blur together.
- The visual guide is a fixed picture. When it is next redrawn, consider making it from an HTML page in the repo
  rendered to PNG, so it cannot drift from this file.
