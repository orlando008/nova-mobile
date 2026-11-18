# Shared cart assets

An optional library of artwork for bootstrapping new NOVA Mobile carts. The library lives in `shared-assets/` and covers reusable UI, objects, and effects. Each cart can choose the artwork that fits its own visual style. Website branding stays in `brand/`.

## Sheets

| Review order | Sheet | Initial contents |
|---|---|---|
| 1 | [Navigation & Menus](../shared-assets/navigation-menus/README.md) | Directions, back, home, playback, plus/minus, settings, close, and sound |
| 2 | [Interaction & Feedback](../shared-assets/interaction-feedback/README.md) | Check, warning, info, help, tap, grab, target, selection, and progress indicators |
| 3 | [Currency & Rewards](../shared-assets/currency-rewards/README.md) | Coins, coin stacks, pouch, gems, star, trophy, gift, and chest |
| 4 | [Vitals & Status](../shared-assets/vitals-status/README.md) | Full, half, and empty hearts, shield, energy, stamina, potion, and status pips |
| 5 | [Magic & Elements](../shared-assets/magic-elements/README.md) | Wand, wizard hat, spellbook, flame, water, lightning, snowflake, leaf, and sparkle |
| 6 | Food & Drink | Fruit, vegetables, ingredients, baked goods, desserts, entrées, and drinks. Split into sub-sheets as needed. |
| 7 | Items & Tools | Keys, locks, backpacks, scrolls, tools, and lanterns |
| 8 | Materials & Crafting | Wood, stone, ore, ingot, clay, cloth, rope, gears, and seeds |
| 9 | World & Board Pieces | Crates, barrels, doors, signs, flags, tile highlights, and slots |
| 10 | Effects | Pickup burst, hit flash, dust, splash, impact ring, smoke, and confetti |

## Layout and use

Each approved sheet lives in `shared-assets/<sheet>/` with a labeled preview, individual transparent PNG exports, and a short note covering the asset names, size, style, and attribution where applicable. UI icons should read at phone sizes. Pickups and other board objects can use richer shading, and variants that carry different meanings should have distinct silhouettes or details.

Copy the chosen exports into `carts/<cart>/assets/` and list them in the cart's `game.json` alongside its other assets. The cart ships its own copies and loads them through the existing manifest. Published carts keep the versions they copied until their next deliberate update.

Review each sheet individually. Add its preview and exports to this pull request after approval.
