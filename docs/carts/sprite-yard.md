# Sprite Yard

Sprite Yard is a small make-your-own-board cart. It gives players a place to try NOVA Mobile's touch controls with the existing shared sprite art.

- The board has twenty slots. A tray offers eight reusable sprites. Some board slots start filled so movement is available immediately.
- Drag a tray sprite to an empty board slot to place a copy. Tap a tray sprite and then an empty slot for the same result. Drag a placed piece to an empty slot to move it.
- Releasing over an occupied slot or outside the board restores the original arrangement. A canceled drag leaves the board in place. Reset restores the starting arrangement.
- Record starts from the starting board. Stop saves the session in memory and Replay compares the cart state at every tick. Reset opens a fresh live board and keeps the last completed recording.

Open **Sprite Yard** from the NOVA Mobile Library. The cart uses the shared gesture recognizer, sprite draw list, and console player.
