# Space Swarm Defender

Space Swarm Defender is a portrait tower-defense game. Protect an orbital reactor through eight waves in each defense zone. Routes, starting credits, and swarm strength change across the campaign.

## Campaign

The Constellation map connects Kepler, Vesper, Caldera, and Nacre. Each planet has three zones. The first zone of Kepler starts unlocked. A clear unlocks the next zone, and earning all nine stars on a planet unlocks the next planet.

Stars depend on core integrity when the final wave ends.

| Stars | Integrity |
| --- | ---: |
| 1 | 1–9 |
| 2 | 10–12 |
| 3 | 13–15 |

Replaying a zone keeps its best rating. Preview saves from before the campaign retain one star for each previously cleared Kepler zone because those saves did not store core integrity.

## Controls

- Pick a tower and tap an empty hex pad to build. You can construct and change defenses during a wave.
- Tap an installed tower to see its range. Upgrade raises damage and range through level 3. Salvage returns 65% of all credits spent on that tower, rounded down.
- Launch the next wave when you are ready. The speed button switches between normal and double speed.
- Pause to return to the planet map, restart the zone, mute effects, or use the shared replay tools.

## Defenses and enemies

| Tower | Cost | Role |
| --- | ---: | --- |
| Pulse | 55 | Fast single-target fire |
| Nova | 85 | Explosive shots that damage nearby enemies |
| Cryo | 65 | Slows enemies so they spend longer in range |

Towers automatically target the enemy closest to the core within range. Destroy enemies and finish waves to earn credits. Scouts, runners, armored guards, and the final queen deal damage if they reach the core. Finish wave eight with at least one point of core integrity to secure the zone. Best ratings and sound settings are saved on the device.

The simulation uses the shared fixed-tick worker and player, with deterministic wave schedules and input replay. Both the WebGL and Canvas 2D renderers use the same drawing commands.
