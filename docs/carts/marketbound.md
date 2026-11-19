# Marketbound

Marketbound is an original produce match-three campaign. Open it from the Puzzle shelf in the NOVA Mobile Library or
at `play/marketbound/`. The former preview link at `play/stall-swap/` redirects to the renamed cart.

## Market route

Eight 8-by-8 levels progress from a first delivery to the Market Festival. Fill the produce quotas and clear every soil
plot before running out of moves. Winning unlocks the next level. The level picker tracks the best star rating for each
delivery. A win earns one star, at least 24 percent of the move budget left earns a second, and at least 45 percent
earns a third. Thresholds round up to whole moves. Progress and the two sound settings save in this browser.

| Level | Moves | Delivery goal |
| --- | ---: | --- |
| First Delivery | 18 | Four produce quotas and familiar opening board |
| Berry Stand | 16 | Two berry quotas and introduction to lane clears |
| Lunch Rush | 15 | Three produce quotas on a tighter budget |
| Garden Beds | 18 | Two quotas and eight central soil plots |
| Corner Plots | 20 | Two quotas and twelve soil plots at the edges |
| Orchard Route | 16 | Three quotas and eight scattered soil plots |
| Last Crates | 19 | Three quotas and sixteen soil plots |
| Market Festival | 21 | Four quotas and twenty soil plots |

## Rules and menus

Tap neighboring pieces or swipe toward a neighbor to swap them. An accepted swap makes a row or column of at least
three identical pieces and spends one move. A rejected swap returns the pieces to their slots for free. From level 2,
a line of four or more clears the entire row or column. A cleared piece also clears any soil beneath it. Soil stays
fixed while produce falls. All cascades count, including ones made on the last move. A board with no legal swaps refills
without spending a move or changing the goals.

The title screen offers the campaign, level picker, instructions, and settings. The in-game menu adds pause, resume,
restart, and recording and replay tools. End-of-level screens offer a retry or the next delivery. Music and sound effects
start after a Play gesture and have independent switches. The score and sound cues come from the deterministic worker.
The browser synthesizes the original instrumental loop and cues, and playback does not feed back into game state.
Replay records the starting level as well as input. Replaying a previous attempt leaves the campaign progress alone.
