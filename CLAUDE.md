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

## UI color style

All pages use a dark color scheme by default:
- **Page background:** `#0c0c0c` (near-black)
- **Cards / accent surfaces:** `#1a1a1a` with `border: 1px solid rgba(255,255,255,0.06)`
- **Muted text:** `rgba(255,255,255,0.35)` for secondary labels, `rgba(255,255,255,0.25)` for tertiary
- **Primary text:** `rgba(255,255,255,0.92)` or `text-white`

Apply `dark` prop to `PageWrapper` for any new page. Never default to light (`bg-gray-50`) backgrounds for new modules.

## Managing static assets

Image and other static assets always live inside the repo at `client/public/<module>/<subfolder>/` (e.g. `client/public/games/sts2/`, `client/public/golf/myrtle/`). They are served directly by Vite's static file server and referenced in code as absolute paths (e.g. `/golf/myrtle/photo.jpg`). When a user provides an asset folder from outside the repo, copy it into the appropriate `client/public/` subdirectory and delete (or ask to delete) the original. Never reference files outside the repo.

## Golf course pictures

Course images for the Golf module live in `client/public/golf/courses/` and are registered in `client/src/modules/golf/courseImages.ts`. Each registry entry maps a canonical course `name` (plus optional `aliases`) to an image path. The registry powers both the image banner on `RoundCard` and the autocomplete dropdown in `AddRoundModal`.

**Trigger phrase — "golf course cleanup" (also accepts "golf picture cleanup"):** the user drops new image files directly in the repo root (e.g. `homebase/bergen_point.jpeg`). When the user says the trigger phrase:

1. Find all loose image files (`.jpg`, `.jpeg`, `.png`, `.webp`) in the repo root.
2. For each loose file, check if it is a **duplicate** of an existing registered course. A loose image is a duplicate if the course name inferred from its filename matches an existing registry entry's `name` or any of its `aliases` (case-insensitive, punctuation-ignored). If so:
   - Delete the old image file from `client/public/golf/courses/`.
   - Move the new file in (replacing the old).
   - Update the registry entry's `image` path if the extension or filename changed.
   - Do NOT create a new registry entry — the old one is being refreshed in place.
3. For each non-duplicate, move the file into `client/public/golf/courses/` and add a new entry to `courseImages.ts`. Normalize the filename when moving: lowercase, snake_case, no spaces or punctuation other than underscores and a single extension (e.g. `Lido Beach.JPG` → `lido_beach.jpg`). The registry entry should use:
   - `name`: canonical course name inferred from the filename (e.g. `bergen_point.jpeg` → "Bergen Point"). If ambiguous, ask before adding.
   - `image`: the `/golf/courses/<filename>` path.
   - `aliases`: any obvious variants (e.g. "<Name> Golf Course", "<Name> Country Club", abbreviations).
   - Leave `objectPosition` unset unless the image clearly needs adjustment.
4. This registration is what puts the course into the `AddRoundModal` autocomplete — do not skip it.
5. Report back with the list of courses added and any duplicates replaced so the user can sanity-check.

## Adding a new module

1. Add server routes in `server/src/routes/<name>.ts`
2. Register them in `server/src/app.ts`
3. Add tests in `server/src/tests/<name>.test.ts`
4. Add client types/api/hooks/page under `client/src/modules/<name>/`
5. Add route in `client/src/App.tsx` and nav item in `client/src/components/layout/Sidebar.tsx`
