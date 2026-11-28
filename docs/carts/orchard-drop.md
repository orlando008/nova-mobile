# Orchard Drop

Orchard Drop is a portrait score-attack puzzle set in a wooden harvest crate against a sunny orchard backdrop. Each fruit has a distinct face and silhouette. Aim a fruit along the drop guide, release it, and let it roll into a matching fruit.

## Controls

Press and move horizontally anywhere in the crate to aim. Release to drop. A canceled pointer, pause, or resize clears the held drop. The scorecard previews the next fruit, and the row below the crate shows the fruit order and highlights the largest fruit reached.

## Rules

- Identical touching fruit merge automatically. The order is blueberry, cherry, peach, lime, fig, orange, banana, apple, pomegranate, coconut, golden pear, and watermelon.
- The first bag contains two of each of the first four fruits. Later bags also contain two figs and two oranges. A brief interval separates drops.
- Off-center hits spin fruit, and the collision outline rotates with each piece. Heavy fruit transfer more momentum on impact. A growing fruit can push neighbors outward when it merges.
- A merge into the second fruit is worth 3 points. Later tiers earn successively larger values through 78 points for a watermelon. Two watermelons clear both fruit and earn 100 points before any multiplier. The JUICY!! banner and voice celebrate the harvest.
- Merges within 48 ticks of each other, with no new drop between them, increase the multiplier up to four times the base value.
- A fruit that has made contact can start an overflow warning. If fruit stays above the dashed fill line for 90 ticks, the run ends. Merge or settle the pile below the line before the meter fills to continue.
- Best score and sound preference are saved locally. A new game chooses a new seed.

## Runtime

The game uses the shared cart worker, pointer input, and both renderers. Fruit collide along their illustrated outlines. Collisions, the shuffled fruit sequence, and scoring advance at fixed ticks. The pause menu's replay tools record the seed, inputs, and state so a run can be checked tick for tick.

## Audio credit

The harvest voice is Phil Chenevert reading “Little Bo-Peep” from [Mother Goose in Prose, version 2](https://librivox.org/mother-goose-in-prose-by-l-frank-baum-2/), a LibriVox public-domain recording. The word was excerpted and adjusted in pitch, timing, and level for the game.
