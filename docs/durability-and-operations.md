# Durability & Operations

Notes for anyone running or provisioning the Bridge Box appliance. This
describes the app-side robustness behaviour that pairs with the device/OS work
in the `bridge-box` provisioning repo.

## Databases

The app uses multiple SQLite databases under the data directory
(`DATABASE_URL`, e.g. `/home/bridgebox/data`), plus per-game databases under
`DATABASE_GAMES_URL` (e.g. `/home/bridgebox/data/games`):

- `game-index.db` — the index of all games
- `players.db` — the player database
- `system.db` — settings, login sessions, admin key
- `movements.db` — movement library
- `games/<gameId>.db` — one database per game, created at runtime

All files use the `.db` extension and live under the data directory, so the
provisioning backup (which recursively finds `*.sqlite`/`*.sqlite3`/`*.db`)
discovers every database, including per-game ones created after startup. Per-game
filenames are the game's id (a 32-char lowercase hex string), so they are stable
and filesystem-safe.

### Resilient open settings

Every database — including per-game ones opened at runtime — is opened through a
single shared helper (`src/db/open-database.ts`) that applies:

- `journal_mode = WAL` — write-ahead logging, resilient to power loss
- `synchronous = NORMAL` — safe with WAL, far fewer fsyncs than `FULL`
- `busy_timeout = 5000` — wait up to 5s for a lock rather than erroring

Because the helper is the only open path, any new database inherits these
settings automatically.

## Backups (safe while running)

With WAL enabled, taking an online backup of any database while the app is
serving is safe and produces a consistent, openable copy:

```bash
sqlite3 /home/bridgebox/data/game-index.db ".backup '/path/to/backup.db'"
```

This holds for a per-game database that is actively in use as well. No app
downtime or coordination is needed. The provisioning repo runs this on an hourly
timer across every discovered database; the app's only responsibilities are to
keep the files discoverable under the data directory (above) and to not do
anything that would make a live `.backup` unsafe (WAL ensures it is).

## Graceful shutdown

On `SIGINT`/`SIGTERM` (`pm2 reload`, reboot, power-down) the server stops
accepting new connections, closes Socket.IO, then checkpoints the WAL
(`wal_checkpoint(TRUNCATE)`) and closes **every** open database — the always-open
ones and any per-game databases open at the time. This leaves no dangling
`-wal`/`-shm` growth and avoids "database is locked" on the next start. A 10s
watchdog forces exit if a close hangs, so a reload can never wedge.

## Health check

`GET /healthz` returns `200` only when the app can serve requests and reach its
always-open core databases (`game-index`, `players`, `system`) via a cheap
`SELECT 1`; otherwise it returns `503`. The device watchdog polls it every ~2
minutes to catch the "process alive but HTTP dead" case that PM2's crash-restart
does not cover. The JSON body also reports the running version/commit:

```json
{ "status": "ok", "version": "0.1.0", "commit": null, "checks": { "game-index": "ok", "players": "ok", "system": "ok" } }
```

## Version visibility

The running version/commit is surfaced two ways so an operator can confirm a
deploy/rollback took effect without SSHing in:

- in the `/healthz` JSON (`version`, `commit`)
- in the UI footer on the main menu

The commit is read at build/deploy time from `APP_COMMIT` (or `GIT_COMMIT` /
`SOURCE_COMMIT` / `VERCEL_GIT_COMMIT_SHA`); if none is set it falls back to the
`package.json` version.

## Networking

The server binds `0.0.0.0` so it is reachable over the appliance's WiFi hotspot,
not just localhost. The port defaults to `3000` and is configurable via `PORT`
(matching what PM2 passes); the bind host is overridable via `HOST`.

## Offline builds

The appliance has a single WiFi radio, so it is either running its hotspot **or**
connected to the internet — never both. Provisioning fetches dependencies in a
short online window (`npm ci`) and then runs `npm run build` **with no network**
while the hotspot is back up. `npm run build` must therefore make **no network
calls**; only `npm ci` is allowed to use the network.

To keep this true:

- **Fonts are self-hosted.** Inter is loaded via `next/font/local` from committed
  woff2 files in `src/app/fonts/` (variable font, normal + italic; licensed under
  the SIL OFL, see `src/app/fonts/OFL.txt`). We do **not** use `next/font/google`,
  which fetches from Google Fonts at build time and fails offline with
  `Failed to fetch \`Inter\` from Google Fonts`.
- **No other build-time fetches.** Avoid introducing `next/font/google`, remote
  `next/image` sources optimised at build, or any `fetch`/network call that runs
  during `next build` (server components, `generateStaticParams`, etc.). The
  `prebuild` migration step only touches the local databases, which is fine.
- The `sync:ebu-players` script does reach the network, but it is a manual,
  on-demand tool — it is **not** part of `build`/`prebuild` and must stay that way.

Verify offline-safety from a clean checkout with networking cut off after the
install step:

```bash
rm -rf node_modules .next
npm ci            # network allowed here (deps only)
# now disconnect the network, then:
npm run build     # must succeed with no internet
```
