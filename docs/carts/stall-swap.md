# Stall Swap

Stall Swap is an original match-three game about filling orders for a produce stall. The first release has one 8-by-8 board, six produce sprites, two orders, and 18 moves.

- Tap neighboring pieces or swipe one toward a neighbor to swap them. An accepted swap creates a row or column of at least three identical pieces and spends one move. A rejected swap returns the pieces to their slots.
- Matches count toward the two orders. After each clear, produce falls and new pieces enter from above. Cascades keep counting toward the orders.
- Packing both orders wins the level. If the last move ends without packing both, the player can retry. If a settled board has no matching swaps, it is reshuffled without spending a move.
- The starting board and refill seed are fixed. Record and Replay use the shared console so the same input reproduces the same state at every tick.

Open Stall Swap from the Build shelf in the Library or at `play/stall-swap/`.
