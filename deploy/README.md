# Deploying homebase to Fly.io

One-time setup; afterwards every deploy is `npm run deploy` from the repo root.

## 1. One-time setup

```bash
brew install flyctl
fly auth signup            # or `fly auth login` (account needs a card on file)

fly apps create sam-homebase          # must match `app` in fly.toml
fly volumes create homebase_data --region ewr --size 1 -a sam-homebase

fly secrets set -a sam-homebase \
  AUTH_PASSWORD='<pick a strong password>' \
  HARDCOVER_API_TOKEN='<from local .env>' \
  YOUTUBE_API_KEY='<from local .env>'
```

Do NOT set `STS2_SAVE_PATH` / `SHOVEL_KNIGHT_SAVE_PATH` as secrets — leaving
them unset is what makes the game tabs serve pushed snapshots.

On the Mac, add to the root `.env`:

```
HOMEBASE_URL=https://sam-homebase.fly.dev
AUTH_PASSWORD=<same password as the secret>
```

## 2. First deploy + seed the DB

```bash
npm run deploy
# NB: the live local DB is server/data/homebase.db (relative DB_PATH + server cwd)
sqlite3 server/data/homebase.db "PRAGMA wal_checkpoint(TRUNCATE);"
echo "put server/data/homebase.db /data/seed.db" | fly ssh sftp shell -a sam-homebase
fly ssh console -a sam-homebase -C "sh -c 'mv /data/seed.db /data/homebase.db && rm -f /data/homebase.db-wal /data/homebase.db-shm'"
fly apps restart sam-homebase
```

## 3. Verify

- Phone browser → `https://sam-homebase.fly.dev` → password prompt → dashboard.
- Mac: `npm run push-saves` → StS2 / Shovel Knight tabs show "From save synced …".

## Ongoing

- Deploy code changes: `npm run deploy`
- Push game saves: `npm run push-saves`
- Logs: `fly logs -a sam-homebase`

The machine auto-stops when idle (`min_machines_running = 0`), so the first
request after a quiet period takes a couple of seconds while it boots.
