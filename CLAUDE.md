# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Doing changes to the project
Whenever changes are done to the code base of the project, the test suite must be run as a last verification step and they must be passing before the verification is successful. If new functionality is added, new tests must be written.

## Commands

```bash
npm run dev       # Start Vite dev server (http://localhost:5173)
npm run build     # Build single self-contained dist/index.html (no server needed)
npm test          # Run tests once
npm run test:watch  # Run tests in watch mode
```

Run a single test file: `npx vitest run src/algorithm.test.js`
Run tests matching a name: `npx vitest run -t "partner rotation"`

## Architecture

Single-page app for running Americano/Mexicano badminton tournaments. No backend — all state lives in `localStorage`.

### Key design constraints
- **Dev**: requires `npm run dev` (Vite dev server)
- **Production**: `npm run build` produces `dist/index.html` — a fully self-contained single file via `vite-plugin-singlefile`. No production server needed.
- **Alpine.js** is loaded from CDN (not npm). Data is registered via the `alpine:init` event in `src/main.js`.

### Module structure

| File | Responsibility |
|------|---------------|
| `src/constants.js` | Named constants (`DEFAULT_ROUNDS`, `PLAYERS_PER_COURT`, etc.) |
| `src/algorithm.js` | `TournamentAlgorithm` — schedule generation logic. Returns `{ schedule, pairCount }` |
| `src/storage.js` | `StorageService` — localStorage CRUD, tournament list management, v1 migration |
| `src/tournament-app.js` | `tournamentApp` — the Alpine data object with all reactive state, computed getters, and methods |
| `src/main.js` | Entry point: imports CSS, registers `tournamentApp` with Alpine via `alpine:init` |
| `src/style.css` | All styles |
| `index.html` | HTML shell with Alpine directives; no inline CSS or JS |

### Algorithm
`TournamentAlgorithm.generateSchedule(playerCount, courts, numRounds)` generates the full schedule upfront (Americano format): each round selects the players with fewest games played, then shuffles repeatedly to minimise repeat partnerships. Returns `{ schedule, pairCount }`.

### State flow
1. User configures courts/players/rounds in Setup tab
2. `generateSchedule()` in `tournament-app.js` calls `TournamentAlgorithm.generateSchedule()` and stores the result in `this.schedule`
3. Scores are stored in `this.scores` keyed as `"${round}-${match}"`
4. `leaderboard` and `playerStatistics` are computed getters that derive from `this.schedule` + `this.scores`
5. State auto-saves to localStorage via `$watch` observers set up in `init()`

### Tests
Tests live in `src/algorithm.test.js` (Vitest). They only cover `TournamentAlgorithm` — the storage and Alpine layers have no automated tests.
