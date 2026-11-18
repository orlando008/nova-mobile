# nova-mobile: notes for agents

- nova-mobile is a website hosting **touch games for phones and tablets** (match-3, merge, base building, idle, cards,
  puzzles), one of the NOVA platforms beside NOVA-16 (`orlando008/fanstasy-console`).
- Its spec is `docs/SPEC.md`; read it before building anything. It is a **draft and nothing is built yet**: build
  in the order of its milestones (section 14) and keep the spec true to the code as you go.
- **Games are polished and sleek, not retro.** Budgets are soft (the console warns, it does not refuse). Each game may
  use vector art drawn in code, pictures, or both.
- **Shared cart assets.** Browse [the asset index](docs/SHARED_ASSETS.md) for reusable artwork. Copy the exports you use
  into your cart's `assets/` folder and list them in `game.json`.
- **Portrait first.** Landscape and tablet layouts are opt-in for each game.
- **WebGL 2 with a Canvas 2D fallback.** Many sprites and high-quality effects must be possible.
- **Keep from NOVA-16:** deterministic replays (the same seed, starting save and recording give the same game state, tick for tick; SPEC
  10.1), pure
  JavaScript with no build step and no runtime dependencies, no backend, and the agent workflow (tests, bots, sweeps,
  screenshots). NOVA-16's tools and playbook are the model; copy and change them, do not import them.
- **The brand** (`docs/BRAND.md`: black, purple, cyan and cream, the octagon, Bit the mascot) is for the **website
  only**. Games have their own art and style.
- **No money:** no ads, purchases or paid energy. Timers and daily rewards are allowed as design only.
- **No editors in the browser.** Every game is code in this repository and reaches the site only through an approved
  pull request; the site plays only the games it hosts (SPEC section 13.1).
- Each game (a **cart**) has a spec in `docs/carts/<name>.md`. Which games come first is decided in their own pull
  requests.
- **Write American English** in docs, code and comments: color, center, license, recognize, finalize.
- **Branches and pull requests.** Work on the branch you are given. Commit and push after each step. Open a pull
  request only when the user asks, and merge only when told to.
