# Axolotl Attack

Axolotl Attack is a portrait arcade cart. The player leads the pink axolotls through Sandcastle Bay in a 60-second match against three computer-controlled schools.

Drag anywhere in the arena to steer. The joystick centers on the initial touch and the leader stops when the touch ends. The same control works with a mouse drag. Each school starts with one swimmer.

Solo axolotls join the nearest school when a member swims within range. Larger schools recruit members from smaller schools on contact. Equal-sized schools cannot recruit from each other. A leader can be caught after losing its last follower. The match ends when time expires, the player's leader is caught, or all rivals are caught. The largest surviving school wins, with tied first places allowed.

All swimmers move on the same plane. Coral and castle walls block movement. The open courtyard has entrances through the north and south walls and a breach on the east side. Rival leaders use the same routes as the player to recruit, pursue, and escape.

The NOVA runtime records inputs at 60 ticks per second. The opening arrangement is generated from the match seed, which is recorded with the run. Sound effects and the device-local best school size are managed by the play page.
