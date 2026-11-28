# Orchard Drop

Orchard Drop is a portrait score-attack puzzle set in a wooden harvest crate. Aim a fruit along the drop guide, release it, and let it roll into a matching fruit.

## Controls

Press and move horizontally anywhere in the crate to aim. Release to drop. A canceled pointer, pause, or resize clears the held drop. The scorecard previews the next fruit, and the row below the crate shows the fruit order and highlights the largest fruit reached.

## Rules

- Identical touching fruit merge automatically. The order is blueberry, cherry, apricot, lime, fig, orange, apple, pomegranate, golden pear, and watermelon.
- Drops use a shuffled bag of two each of the first four fruits. A brief interval separates drops.
- A merge into the second fruit is worth 3 points. Later tiers earn successively larger values through 55 points for a watermelon. Two watermelons clear both fruit and earn 100 points before any multiplier.
- Merges within 48 ticks of each other, with no new drop between them, increase the multiplier up to four times the base value.
- A fruit that has made contact can start an overflow warning. If fruit stays above the dashed fill line for 90 ticks, the run ends. Merge or settle the pile below the line before the meter fills to continue.
- Best score and sound preference are saved locally. A new game chooses a new seed.

## Runtime

The game uses the shared cart worker, pointer input, and both renderers. Circle collisions, the shuffled fruit sequence, and scoring advance at fixed ticks. The pause menu's replay tools record the seed, inputs, and state so a run can be checked tick for tick.
