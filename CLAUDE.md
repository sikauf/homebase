# Home Base

Personal dashboard app. React + Vite client, Express + node:sqlite server.

## After every change

Run the test suite before considering a task done:

```
npm test
```

All 13 tests must pass. If any fail, fix them before finishing.

## Dev server

```
npm run dev
```

- Client: http://localhost:5173
- Server: http://localhost:3001

## Project structure

- `client/` — React + TypeScript + Vite + Tailwind
- `server/` — Express + TypeScript + node:sqlite (built-in, no native deps)
- `server/src/tests/` — test suite using node:test + tsx
- `data/homebase.db` — SQLite database (created on first run)

## Key env vars (root `.env`)

- `DB_PATH` — path to SQLite file (defaults to `data/homebase.db`; set to `:memory:` during tests)
- `STS2_SAVE_PATH` — path to Slay the Spire 2 `progress.save` file

## Adding a new module

1. Add server routes in `server/src/routes/<name>.ts`
2. Register them in `server/src/app.ts`
3. Add tests in `server/src/tests/<name>.test.ts`
4. Add client types/api/hooks/page under `client/src/modules/<name>/`
5. Add route in `client/src/App.tsx` and nav item in `client/src/components/layout/Sidebar.tsx`
