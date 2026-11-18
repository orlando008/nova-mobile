# NOVA MOBILE

A mobile gaming platform in the NOVA universe: polished touch games for phones and tablets, played in the browser.
Merge, match-3, base building, cards and puzzles, made to play with one thumb.

Part of the NOVA family, beside [NOVA-16](https://github.com/orlando008/fanstasy-console), the 16-bit fantasy console.

**Status:** The static Library and About pages are available in this repository. The game runtime is planned.

- [`docs/SPEC.md`](docs/SPEC.md): the platform's specification (draft)
- [`docs/BRAND.md`](docs/BRAND.md): the NOVA brand for the website (colors, the octagon, Bit)
- [Shared cart assets](docs/SHARED_ASSETS.md) for reusable icons, sprites, and effects.

## Preview the website locally

Run `python3 -m http.server 8000` from the repository root, then open `http://localhost:8000/`.

## Adding a game

Games are code in this repository; there are no editors in the browser. To add one, ask to join the repository,
build it on a branch and open a pull request: it goes live when it is approved and merged. See `docs/SPEC.md`,
section 13.1.
