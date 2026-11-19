# NOVA Mobile Input Diagnostic

The diagnostic cart exercises the shared console controls. The cart is an indexed fixture and stays off the public Library. Open `play/diag/` and select **Play**.

- Tap, double-tap, hold, drag, release, swipe, or pinch on the grid. The readout reports the last recognized gesture and its position in game points.
- The squares are 88 points wide. The readout reports the playfield size, points per CSS pixel, device pixel ratio, and safe-area insets.
- Tap the cyan plus to increment **Button clicks**. Hold it, slide off, and release to check cancellation. Move the [crate sprite](../../shared-assets/world-board-pieces/sprites/crate.png) to the other outlined slot to increment **Valid drops**. Release outside the destination to check snap-back.
- Select **Record**, use a few controls, and select **Stop**. A recording starts with a fresh cart and captures up to 60 seconds of input. **Replay** recreates the cart in the worker and compares its state against the recorded run on every tick. **Live** starts a fresh live session.

Run `node tools/verify.js` with Node 22 or newer to check the cart and run its input, runtime, and renderer tests. Serve the repository root over localhost or HTTPS to open the page in a browser. The readout identifies the active renderer. WebGL 2 and its Canvas 2D fallback draw the same crate and grid.
