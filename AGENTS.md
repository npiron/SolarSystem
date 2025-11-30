# AGENT Instructions

These instructions apply to the entire repository.

## Development guardrails
- Follow the existing code style and formatting found in the `src/` directory (ES modules, descriptive names, early returns, no lint-ignore clutter).
- Keep the project 100% client-side: avoid adding server/back-end dependencies; persist data through `localStorage` (see `STORAGE_KEY` in `src/config/constants.ts`).
- Place new balance/data tables under `src/config/`; gameplay/state updates under `src/systems/`; rendering utilities under `src/renderer/`; shared helpers or types under `src/types/`.
- When adding tests or examples, mirror the current patterns (Vitest under `tests/`, lightweight static demos under `examples/`).

## Tooling and commands
- Run available tests with `npm test` before requesting review when JavaScript/TypeScript code is changed.
- Run `npm run typecheck` whenever TypeScript files or types are touched, and `npm run build` if you modify Vite config, entry HTML, or release assets.
- For manual QA, `npm run dev -- --host` serves the game via Vite; `index.html` at the repo root also runs standalone for quick checks.

## Documentation, commits, and PRs
- Keep documentation updates concise and focused on user-facing behavior.
- Prefer descriptive commit messages summarizing the change.
- Add meaningful PR summaries highlighting key modifications and tests executed.

## Coding details and quality bar
- Prefer TypeScript over JavaScript for new logic; keep types narrow and avoid `any` except as a last resort.
- Stick to functional, deterministic systems: avoid hidden global state; gate side effects behind explicit functions.
- Keep the project well-organized and modular: no file should exceed 400 lines. If a file grows beyond this limit, split it into smaller, focused modules.
- Keep rendering helpers pure (input → output) and push DOM access through `renderer` utilities rather than scattering `document` calls.
- Maintain consistent naming: `systems/*` files focus on state transitions, `config/*` files hold data/constants, and `renderer/*` files handle presentation.
- When touching math/physics helpers, add a small Vitest unit test in `tests/` to document edge cases.

## PR messaging and review readiness
- In PR summaries, include a short “Behavior” bullet (what the player sees) and a “Tech” bullet (key implementation detail) when applicable.
- List every test command you ran under a separate “Testing” section, even if only `npm test`.
- If a change alters user input, balance, or persistence (`localStorage`), call that out explicitly in the PR body.
