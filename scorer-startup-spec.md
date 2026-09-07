# Spec for `bridge-box-scorer`: compile the server to plain JS for production start

This is a work brief for the **`bridge-box-scorer`** app repo. It is written to be handed to that
repo's Kiro; it has the context needed without access to the provisioning repo.

## Problem

On the BridgeBox appliance (a Raspberry Pi), the app is started at boot by a process manager (PM2)
running as a systemd service. Production start currently is:

```
npm start   ->   NODE_ENV=production exec tsx --require ./scripts/allow-server-only.cjs server.ts
```

This runs TypeScript **directly at runtime via `tsx`**, through `npm`. On the appliance's minimal,
non-interactive systemd environment this is fragile:
- it depends on `npm` resolving and on `tsx` (a dev-oriented on-the-fly TS runner) being on PATH;
- the `exec` inside the npm script replaces the process PM2 launched, so PM2 loses track of it and
  the app fails to stay registered — it "starts" but isn't actually supervised or reachable.

An appliance should boot with the fewest possible moving parts. The runtime should be **plain
`node` executing compiled JavaScript**, with no `npm` and no `tsx` on the boot path.

> Note: a fully self-contained single binary (Node SEA / `pkg`) was considered and rejected — it
> does not play well with Next.js's runtime file loading or the native `better-sqlite3` module on
> ARM. Compiling to JS and running with the system `node` is the right target.

## Goal

Production startup becomes:

```
node <server entry>.js
```

using the system Node (already installed), with `NODE_ENV=production` supplied by the environment,
no `tsx`, no `npm`, and native modules (`better-sqlite3`, etc.) left as normal `node_modules` (do
NOT try to bundle native `.node` binaries).

## Tasks

### 1. Add a build step that compiles the server to JS
- Compile `server.ts` and everything it imports into runnable JavaScript, output to a stable path
  (suggest `dist/server.js`).
- Use `esbuild` (fast, single-step) or `tsc`. `esbuild` is recommended:
  - target the installed Node version (currently Node 24; target e.g. `node22`+ is fine),
  - `--platform=node`, `--format=cjs` (or esm to match the project),
  - **mark native/externally-resolved deps as external** so they load from `node_modules` at
    runtime rather than being bundled — at minimum `better-sqlite3`, and generally all
    `dependencies` (e.g. esbuild `--packages=external`). Bundling native modules will break on ARM.
- Preserve whatever `--require ./scripts/allow-server-only.cjs` does. If it's a guard that must run
  before server code, either keep requiring it at runtime (`node -r ./scripts/allow-server-only.cjs
  dist/server.js`) or fold its effect into the build. Document which.
- Hook this into the existing `build` script so the appliance's `npm run build` produces
  `dist/server.js` alongside the Next.js build.

### 2. Change the production start to plain node
- Update the `start` script to:
  ```
  node dist/server.js
  ```
  (or `node -r ./scripts/allow-server-only.cjs dist/server.js` if the require must stay).
- Do **not** set `NODE_ENV` inline via a shell `exec` trick; rely on `NODE_ENV=production` from the
  environment (the appliance sets it). Keep `start` a plain, single command with no `exec`.
- Keep reading `PORT` (default 3000) and `HOST` (default `0.0.0.0`) from the environment as today.

### 3. Keep the runtime dependency-light but correct
- `node_modules` will still be present in the deployed release (the appliance runs `npm ci` at
  build time), so runtime `require`s of native modules resolve normally. That's expected — the goal
  is removing `tsx`/`npm` from the *start command*, not eliminating `node_modules`.
- Ensure `dist/server.js` resolves the databases from the environment (`DATABASE_URL`,
  `DATABASE_GAMES_URL`) exactly as `server.ts` does now.

## Provisioning contract (so both repos agree)

The appliance will start the app with something equivalent to:
```
NODE_ENV=production node <release>/dist/server.js
```
run from the release directory as cwd. For this to work, the app must guarantee:
- **Entry point:** the built server is at a **stable, known path** in the release — please use
  `dist/server.js`. If you choose another path, tell the provisioning side so it can match.
- **cwd-independent paths:** the server must work when launched with the release dir as cwd (it is
  today). Relative DB paths still come from env vars, which are absolute on the box.
- **No interactive/login-shell assumptions:** it must start under a bare environment (only
  `PATH`, `HOME`, `NODE_ENV`, `PORT`, `HOST`, `DATABASE_URL`, `DATABASE_GAMES_URL`, `APP_COMMIT`).
- **`APP_COMMIT`:** continue to read `process.env.APP_COMMIT` for the version shown in `/healthz`.
- **`.env`:** still fine to read at build time; runtime authoritative values come from the process
  environment (which wins).

Once `dist/server.js` exists and `start` is plain node, the provisioning repo will switch the boot
launch to `node dist/server.js` (removing the interim direct-`tsx` workaround).

## Acceptance criteria
- `npm run build` from a clean checkout produces `dist/server.js` (and the Next build).
- `NODE_ENV=production node dist/server.js` starts the server with **no `tsx` and no `npm`
  involved**, serves on `0.0.0.0:3000`, and `GET /healthz` returns 200.
- Native modules (`better-sqlite3`) load correctly at runtime (not bundled).
- Works launched from the release directory with only the bare env vars listed above set.
- `NODE_ENV`/`PORT`/`HOST`/`DATABASE_URL`/`DATABASE_GAMES_URL`/`APP_COMMIT` all still honoured.

## Interim (already handled on the appliance)
Until this lands, the provisioning repo starts the app by invoking `tsx` directly by absolute path
(bypassing `npm`), which works but still relies on `tsx`. Landing this spec lets that be replaced
with plain `node dist/server.js`.
