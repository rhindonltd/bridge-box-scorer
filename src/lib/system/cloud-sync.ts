import "server-only";

import fs from "fs";
import { execFile } from "child_process";
import type { Logger } from "pino";

/**
 * Fixed path to the provisioning-owned privileged cloud-sync helper. Like the
 * other `/usr/local/bridgebox/bin/*.sh` helpers (wifi-ctl, restart-service,
 * reboot) this is part of the box's provisioning contract and always lives at
 * this exact path, so it is a hardcoded constant rather than env-configured.
 */
const CLOUD_SYNC_NOW = "/usr/local/bridgebox/bin/cloud-sync-now.sh";

/**
 * Path to the box-written last-sync status file. The box's own cloud-sync job
 * writes it (atomically); the app only ever reads it. Overridable via env for
 * tests / non-default installs, resolved lazily so tests can set/unset the env
 * per case without a module-registry reset.
 */
export function cloudSyncStatusPath(): string {
  return (
    process.env.CLOUD_SYNC_STATUS_PATH ?? "/home/bridgebox/cloud-sync-status.json"
  );
}

/** Outcome of the last run of a cloud-sync job (backup or logs). */
export type CloudSyncResult =
  | "ok"
  | "skipped_not_configured"
  | "not_entitled"
  | "offline"
  | "error";

/** Independent status for one cloud-sync job (backup or logs). */
export type CloudSyncJobStatus = {
  /** ISO-8601 UTC of the last successful run, or null if never succeeded. */
  last_success: string | null;
  /** ISO-8601 UTC of the last attempt (success or not). */
  last_attempt: string | null;
  /** Outcome of the last attempt. */
  last_result: CloudSyncResult | null;
};

/**
 * The box's advisory last-sync status (see cloud-sync-app-contract.md §2). The
 * `backup` and `logs` sections are independent — a club may back up data but
 * not ship logs.
 */
export type CloudSyncStatus = {
  /** Whether the box is cloud-configured. When false the rest is moot. */
  enabled: boolean;
  backup: CloudSyncJobStatus;
  logs: CloudSyncJobStatus;
};

/** The status shown when the file is absent/unreadable: feature off, nothing synced. */
const NOT_ENABLED_STATUS: CloudSyncStatus = {
  enabled: false,
  backup: { last_success: null, last_attempt: null, last_result: null },
  logs: { last_success: null, last_attempt: null, last_result: null },
};

function readJobStatus(raw: unknown): CloudSyncJobStatus {
  const job = (raw ?? {}) as Partial<CloudSyncJobStatus>;
  return {
    last_success: job.last_success ?? null,
    last_attempt: job.last_attempt ?? null,
    last_result: job.last_result ?? null,
  };
}

/**
 * Read the box's last-sync status file, if present.
 *
 * The file is advisory: it may be absent on a box that has never synced, and a
 * concurrent (atomic) write by the box should never be observed mid-write. We
 * degrade gracefully — a missing or corrupt file reads as {@link
 * NOT_ENABLED_STATUS} ("no sync yet / not enabled") rather than throwing, so
 * the UI shows "unknown"/"not yet" instead of erroring (contract §3).
 */
export function readCloudSyncStatus(): CloudSyncStatus {
  const path = cloudSyncStatusPath();
  if (!fs.existsSync(path)) return NOT_ENABLED_STATUS;
  try {
    const parsed = JSON.parse(fs.readFileSync(path, "utf-8")) as Partial<CloudSyncStatus>;
    return {
      enabled: parsed.enabled ?? false,
      backup: readJobStatus(parsed.backup),
      logs: readJobStatus(parsed.logs),
    };
  } catch {
    return NOT_ENABLED_STATUS;
  }
}

/**
 * Trigger an on-demand cloud sync ("back up now") — fire-and-forget.
 *
 * The app runs unprivileged and MUST NOT call AWS/systemctl directly, so this
 * goes through the allowlisted passwordless sudo helper. The helper starts the
 * sync service non-blocking and returns immediately: exit 0 means "started",
 * NOT "succeeded" (the outcome lands in the status file). We therefore do not
 * await it — we kick it off and return, mirroring the reboot/restart routes.
 *
 * Args are passed as an array (never a shell string) to avoid injection, and
 * `-n` keeps sudo non-interactive (fail rather than prompt). A failure to even
 * start the helper is logged so a broken/denied allowlist is diagnosable.
 */
export function triggerCloudSync(log?: Logger): void {
  execFile("sudo", ["-n", CLOUD_SYNC_NOW], (err) => {
    if (err) log?.error({ err }, "Cloud sync trigger failed to start");
  });
}
