# Bubble Mania

Bubble Mania is a portrait score-attack puzzle set in a glassblower's workshop. Launch a bead of molten glass and cover as much of the playfield as possible with stained-glass bubbles.

## Controls

Press anywhere in the launcher area and hold to charge. Drag left or right to turn the blowpipe, then release to fire. The glowing blowpipe muzzle shows the angle, and the far-left gauge shows the charge. The player judges the bead's path and landing point by feel. A canceled touch or a pause clears the charge.

## Rules

- The bead travels along the blowpipe's angle and ricochets off the frame and the square firebricks. The charge held at release sets the travel distance, including any distance after a bounce.
- The landing point becomes the center of a circle. Its centered radius readout counts up as it expands. Growth stops at the closest edge of the frame, a square firebrick, or another bubble.
- A bead that lands with too little room to grow is spent. A bead that hits an existing bubble shatters it and ends the run.
- The score is the sum of the bubble areas divided by the playfield's full area. The final score uses the coverage at the instant before the shatter. The best score is stored locally.
- Retry board reuses the firebrick pattern. New board selects a new seed. Colors cycle through five distinct hues, and the bead takes on the next bubble's hue.

## Presentation

Backlit sapphire, amethyst, emerald, ruby, and gold stained glass sits in a bronze-framed kiln. The launcher is a brass-mounted blowpipe with a molten-glass charge column. An expanding glass swell rises in pitch, finished glass rings softly, and a shatter breaks into the tinkle of falling shards. Sound effects can be muted from the workshop menu.

The cart uses the shared worker, fixed ticks, pointer input, and WebGL and Canvas renderers. A recording includes the starting board seed and reproduces the shot, growth, score, and shatter state tick for tick. The browser presents the radius labels, launcher angle, audio cues, and controls from the worker's reported state.
