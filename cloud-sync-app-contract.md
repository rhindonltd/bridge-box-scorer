# Contract — Scorer App ↔ BridgeBox Cloud Sync

> Audience: the **`bridge-box-scorer`** app (Next.js). This is the interface the app uses to (a)
> trigger an on-demand cloud sync ("back up now") and (b) show the director when the box last synced
> its data/logs off-box. The box side (this repo, `bridge-box`) provides both; the app consumes them.
> Nothing here requires the app to know anything about S3, AWS, or the entitlement endpoint.

## Background (what "cloud sync" is)

When a club has the optional **cloud backup** feature enabled, the box periodically pushes its game
data (and, separately, app logs) off-box to S3 for disaster recovery — automatically ~every 15 min
while the box is on, and at boot. A director may also want to trigger it **now** (e.g. right after a
big session, before switching off). This contract covers that manual trigger plus a status file the
app can display.

Everything is a **no-op on a box that isn't cloud-configured + entitled**, so the app can expose the
button/status unconditionally; on a non-cloud box it simply shows "not enabled" and the trigger does
nothing.

---

## 1. Trigger a sync now

The app runs as the `bridgebox` user and MUST NOT call AWS or systemctl directly. To trigger a sync,
invoke the fixed-path sudo helper (allowlisted in `/etc/sudoers.d/bridgebox`, no password):

```
sudo -n /usr/local/bridgebox/bin/cloud-sync-now.sh
```

- This starts the `bridge-box-cloud-sync.service` oneshot **non-blocking** (`--no-block`) — it
  returns immediately, it does NOT wait for the upload to finish.
- The service runs the game-data backup then the log-ship job, using the box's client radio (the
  guest hotspot is never affected).
- Exit code 0 means "the sync was started" (not "the sync succeeded"). To learn the outcome, read the
  status file (§2) — do not block on the helper.
- Safe to call at any time, including mid-session. Calling it repeatedly is harmless (a run in
  progress just means the next trigger coalesces at the systemd level).

**App guidance:** treat the button as fire-and-forget. After calling it, poll the status file (§2)
to update the "last synced" display. Debounce so a director can't hammer it (e.g. disable for a few
seconds after a press).

Do **not** shell out to `aws`, `systemctl`, or the job scripts directly, and do not read/write the
S3 bucket — the helper is the only supported trigger (mirrors how the app already uses
`wifi-ctl.sh` / `restart-app.sh`).

---

## 2. Read the last-sync status

The box maintains a small JSON status file the app can read (read-only) to show the director when
data and logs were last pushed off-box:

```
/home/bridgebox/cloud-sync-status.json
```

- World-readable (`chmod 644`), written **atomically** (temp + rename), so a read never sees a
  partial file. Poll it (e.g. every few seconds while a status panel is open, or on demand).
- It lives **outside** `data/` on purpose (so it isn't itself swept into the backup).
- It may be **absent** on a box that has never run a sync — treat "file missing" as "no sync yet".

### Shape

```json
{
  "enabled": true,
  "backup": {
    "last_success": "2026-09-28T14:32:10Z",
    "last_attempt": "2026-09-28T14:32:10Z",
    "last_result":  "ok"
  },
  "logs": {
    "last_success": "2026-09-28T14:32:12Z",
    "last_attempt": "2026-09-28T14:47:00Z",
    "last_result":  "not_entitled"
  }
}
```

Fields:
- `enabled` (bool) — whether the box is cloud-configured (`cloud-backup.conf` complete). If `false`,
  the feature is off; show "Cloud backup not enabled" and ignore the rest.
- `backup` and `logs` are **independent** sections (a club may back up data but not ship logs):
  - `last_success` (ISO-8601 UTC string, or `null`) — the last time THIS job completed successfully.
    This is the value to surface as "Last backed up at …". `null` = never succeeded yet.
  - `last_attempt` (ISO-8601 UTC string) — the last time the job ran, success or not.
  - `last_result` (string enum) — the outcome of the last attempt:
    - `ok` — succeeded (uploaded, or nothing changed to upload — either way, safe).
    - `skipped_not_configured` — cloud not configured on this box.
    - `not_entitled` — endpoint reached but this box isn't entitled for that job (backup vs logs are
      separately entitled).
    - `offline` — couldn't reach the entitlement endpoint / no internet this run.
    - `error` — configured + entitled but the run failed (see box logs). Rare; worth surfacing.

### Suggested UI

- Primary line for the director: **"Games backed up: <relative time from `backup.last_success`>"**
  (e.g. "3 minutes ago"). If `backup.last_success` is `null` and `enabled` is true, show "not yet".
- If `enabled` is `false`: "Cloud backup not enabled" (and hide/disable the button, or let the
  button do nothing — it's harmless).
- Logs status is secondary/diagnostic — most directors only care about game data. Optionally show it
  in an admin/advanced view.
- `last_result` values other than `ok`/`skipped_not_configured` (i.e. `offline`, `not_entitled`,
  `error`) can drive a subtle warning ("last backup didn't complete — will retry automatically").

---

## 3. Boundaries / invariants (please preserve)

- The app is **unprivileged** (`bridgebox`). Its only cloud touchpoints are: call
  `cloud-sync-now.sh` via `sudo -n`, and read `cloud-sync-status.json`. It never handles AWS creds,
  tokens, buckets, or the entitlement endpoint — the box owns all of that.
- The trigger is **fire-and-forget**; never block a request/UI on the sync completing.
- Cloud sync covers **data durability only**. It does NOT update or restart the app. (App updates
  are a separate flow tied to switch-on.) So a "back up now" press will never restart the scorer or
  change the running version.
- The status file is **advisory** — if it's missing or stale, the box still backs up on its own
  timer; the app should degrade gracefully (show "unknown"/"not yet") rather than error.

---

## 4. Quick reference

| Need | How |
|---|---|
| Trigger a sync now | `sudo -n /usr/local/bridgebox/bin/cloud-sync-now.sh` (non-blocking) |
| Last-sync status | read `/home/bridgebox/cloud-sync-status.json` (JSON, may be absent) |
| "Last backed up" time | `backup.last_success` (ISO-8601 UTC, or `null`) |
| Is the feature on? | `enabled` (bool) |
| Never do | call `aws`/`systemctl`/job scripts directly, or touch S3/tokens |

The box-side implementation lives in `bridge-box`: `bridge-box-cloud-sync.{service,timer}` (the job),
`cloud-sync-now.sh` (the sudo helper), and `bb_cloud_write_status` in `bridge-box-cloud-lib.sh` (writes
the status file). The cloud backup/entitlement design is in `cloud-backup-endpoint-requirements.md`.
