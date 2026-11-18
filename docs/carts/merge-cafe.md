# Merge Café (nova-mobile): Outline

**Status:** Outline, 18 November 2026. Not a spec yet: the kickoff questions (section 5) come first.
**Source:** a remake of NOVA-16's Merge Café (`orlando008/fanstasy-console`, `docs/carts/merge-cafe.md`), not a port.
The rules carry over; the controls, the layout, the art and the sound are made again for a phone.

---

## 1. What carries over

The design the user already agreed for NOVA-16, as a starting point:

- **Merge-2 in the spirit of Merge Mansion:** generators make ingredients, two identical items merge into the next tier,
  customers' orders turn items into coins and stars.
- **5 lines of 6 tiers** (bakery, coffee, dairy, fruit, tableware) and their generators.
- **No energy limit:** the board's space is the only limit. No game over: a full board is a puzzle.
- **Crates** that cover the board and open for coins; **selling** items for coins.
- **Three customers** with orders of 1 or 2 items; the tiers wanted grow with the café; a free **swap** of an order.
- **Five regulars** with story lines (Marion, James, Benny, Gina, Mr. Fisk) and the **daily special**.
- **Six areas of four tasks** that restore the café, each with styles to choose (**decorating**), and the **grand
  reopening** as the ending, then free play.
- **The encyclopedia** of items found and regulars met.
- **A long saved campaign.**
- The rules were pure functions with tests on NOVA-16; the same functions are the place to start here.

## 2. What changes

| | NOVA-16 | nova-mobile |
|---|---|---|
| Controls | A d-pad cursor, A to pick up and drop, SELECT to sell | **Tap** a generator; **drag** an item onto another to merge, onto a bubble to serve, onto a bin to sell; **press** an item for its card |
| Screen | 256 x 224, café above, a 7 x 5 board below | Portrait, full screen: the café on top, a bigger board in the thumb's reach below, a bar of buttons at the bottom |
| Art | Pixel art, 24 px items | Smooth and polished: glossy items, a café that comes alive (to choose: section 5) |
| Feel | Sprites and a chime | Items pop in with a bounce, merges burst into sparkles and rise, coins fly to the counter, haptics on every merge |
| Sound | Café jazz on a chip | Café jazz on real-sounding instruments (piano, upright bass, brushes) |
| Time | Frames only | Can use the wall clock (a daily special that is really daily), if the user wants |

## 3. The screen (a first sketch, 720 points wide)

```
+-----------------------------+
| coins          stars    [=] |  header, in the safe area
|                             |
|   THE CAFE (about 40%)      |  the room, customers at the counter,
|   o      o      o           |  order bubbles over them
|  [bubble][bubble][bubble]   |
+-----------------------------+
|                             |
|   THE BOARD (about 50%)     |  7 x 9 cells of about 96 points:
|                             |  big enough for a thumb, room to grow
|                             |
+-----------------------------+
|  cafe   recipes   bin       |  the bar: tasks, encyclopedia, sell
+-----------------------------+
```

A taller phone gives the café more height; the board stays the same size.

## 4. A first plan

1. Kickoff questions (section 5), then this file becomes the full spec, in the NOVA-16 spec's shape.
2. Move the rules over as pure functions with their tests, changed for the bigger board.
3. The board with placeholder art: tap, drag, merge, serve, sell, with the motion and haptics.
4. The art proof: three items, a generator and the café's corner in the chosen style, shown to the user.
5. The rest of the art, the café's restoration, the regulars, the encyclopedia.
6. Sound and music.
7. Tuning with the bot (sweeps over seeds), then release.

It needs nova-mobile's milestones 1 to 8 (`docs/SPEC.md` section 14) first, or at least enough of them: the frame,
touch, polish, assets and saves.

## 5. Questions for the kickoff

- **Art style:** glossy vector (bright, clean, like a match-3), soft painted pictures (warm, storybook), or vector items
  on a painted café?
- **The board:** 7 x 9, or keep 7 x 5 with bigger cells?
- **Time:** stay timer-free, or use the real clock for the daily special and for regulars' visits?
- **What else changes:** the setting, the regulars, the lines of items, or the title?
