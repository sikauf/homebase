# Home Base

Personal dashboard. React + Vite client, Express + node:sqlite server.

## Git
Don't commit or push unless explicitly asked.

## After every change
1. If the change adds or alters an API endpoint or server-side logic, add tests in the section's `route.test.ts`.
2. Delete tests the change makes obsolete.
3. Run `npm test` from the repo root. All tests must pass before finishing.

## Dev server
`npm run dev` — client at http://localhost:5173, server at http://localhost:3001.

## Layout

- `client/` — React + TypeScript + Vite + Tailwind
- `server/` — Express + TypeScript + node:sqlite (built-in, no native deps)
- `data/homebase.db` — SQLite database (created on first run)

Each top-level section is a self-contained module.

**Client** (`client/src/modules/<section>/`):
- `manifest.ts` exports a `SectionManifest`: `path`, `label`, `icon`, `order`, optional `description` (home grid card), optional `useVisible` hook (Sidebar/HomePage visibility), and either `tabs[]` (auto-renders `TabbedSection`) or `Section` (custom layout). Optional `routesClassName` adds an inner wrapper class for tabbed sections.
- For tabbed sections, prefer the games-style nested layout: `<tab>/{Page.tsx, api.ts, data.ts}`. Older flat layouts (`<Tab>.tsx`) work but should be migrated when touching a section.
- `client/src/modules/registry.ts` auto-discovers manifests via `import.meta.glob`. Sidebar, App routes, and HomePage all read from it — never edit those to add a section.

**Server** (`server/src/modules/<section>/`):
- `route.ts` — express router. Use `defineCrud` from `shared/crud.ts` for the standard list / create / delete shape; the returned `Router` is mutable, so layer `.get/.post/.patch` on top for custom endpoints.
- `schema.ts` — exports `migrations: Migration[]`. Use `CREATE TABLE IF NOT EXISTS` for new tables; append entries for any later schema change. The runner tracks applied IDs in the `_migrations` table.
- `index.ts` — exports a `ServerModule` (`{ name, path, router }`).
- `route.test.ts` — colocated, uses `setupTestServer` from `shared/test-helpers.ts`.

Sub-tabs of a section (e.g. `games/hades2/`, `games/sts2/`) follow the same shape, mounted by the section's `route.ts`.

## Adding a new section

Client side:
1. Create `client/src/modules/<name>/manifest.ts` and the page components. Registry picks it up automatically.

Server side:
1. Create `server/src/modules/<name>/{route.ts, schema.ts, index.ts, route.test.ts}`.
2. Add 1 import + 1 entry to `server/src/modules/registry.ts` (router).
3. Add 1 import + 1 spread to `server/src/modules/schemas.ts` (migrations).

Adding a tab to an existing section: 1 entry in that section's `manifest.ts` + the new Page (and route/schema if it has its own backend tables).

## Env vars (root `.env`)
- `DB_PATH` — SQLite file path (default `data/homebase.db`; tests use `:memory:`)
- `STS2_SAVE_PATH` — path to Slay the Spire 2 `progress.save`

## UI

Dark theme by default:
- Page background: `#0c0c0c`
- Cards / surfaces: `#1a1a1a` with `border: 1px solid rgba(255,255,255,0.06)`
- Primary text: `rgba(255,255,255,0.92)` or `text-white`
- Muted text: `rgba(255,255,255,0.35)` (secondary), `rgba(255,255,255,0.25)` (tertiary)

Apply `dark` to `PageWrapper` for new pages. Never default to light backgrounds.

## Static assets

Live under `client/public/<module>/<subfolder>/` (e.g. `client/public/golf/myrtle/`), served directly by Vite at absolute paths (e.g. `/golf/myrtle/photo.jpg`). When the user provides assets from outside the repo, copy them in and delete (or ask to delete) the original. Never reference files outside the repo.

## Golf course pictures

Course images live in `client/public/golf/courses/`, registered in `client/src/modules/golf/courseImages.ts`. The registry powers both `RoundCard`'s banner and `AddRoundModal`'s autocomplete.

**Trigger phrase — "golf course cleanup" (also "golf picture cleanup"):** the user drops new image files in the repo root (e.g. `bergen_point.jpeg`).

1. Find loose image files (`.jpg`, `.jpeg`, `.png`, `.webp`) in the repo root.
2. For each, check if it duplicates an existing course (case-insensitive, punctuation-ignored match against `name` or `aliases`):
   - **Duplicate:** delete the old file in `client/public/golf/courses/`, move the new one in, update the registry entry's `image` path if the filename changed. Don't add a new entry.
   - **New:** move into `client/public/golf/courses/` with normalized filename (lowercase snake_case, single extension — e.g. `Lido Beach.JPG` → `lido_beach.jpg`). Add a registry entry:
     - `name`: canonical course name from filename (ask if ambiguous)
     - `image`: `/golf/courses/<filename>`
     - `aliases`: obvious variants (e.g. "<Name> Golf Course", abbreviations)
     - leave `objectPosition` unset unless the image clearly needs it
3. Report added courses and replaced duplicates so the user can sanity-check.
