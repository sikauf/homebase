# Home Base

Personal dashboard app. React + Vite client, Express + node:sqlite server.

## Git
Do NOT commit or push to the repository unless the user explicitly asks you to.

## After every change

1. **Determine if new tests are needed.** Ask: does this change add a new API endpoint, alter existing endpoint behavior, or introduce new server-side logic? If yes, add tests for it in `server/src/tests/`.
2. **Remove tests that are no longer needed.** If a change removes a feature or makes an existing test irrelevant, delete that test.
3. **Run the full suite.** All tests must pass before the task is done:

```
npm test
```

If any tests fail, fix them before finishing. Update the test count in this file when tests are added.

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
