"use client";

import { PageLayout } from "@/components/layout/PageLayout";
import type {
  CloudSyncJobStatus,
  CloudSyncStatus,
} from "@/lib/system/cloud-sync";

const primaryButtonClass =
  "w-full py-3.5 text-lg font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50";

/**
 * Format an ISO-8601 UTC timestamp as a short relative time ("3 minutes ago").
 * Returns null for a null/absent/unparseable value so callers can fall back to
 * a "not yet" copy. Kept UI-local (no domain dep) since it only shapes display.
 */
export function relativeTime(iso: string | null, now: number = Date.now()): string | null {
  if (!iso) return null;
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return null;

  const seconds = Math.round((now - then) / 1000);
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds} seconds ago`;

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

/**
 * A last-result value worth surfacing as a soft warning. `ok` and
 * `skipped_not_configured` are benign; `offline`/`not_entitled`/`error` mean the
 * last attempt didn't complete and is worth a gentle heads-up (the box retries
 * on its own timer, so this is advisory, not an error state).
 */
function warningForResult(
  result: CloudSyncJobStatus["last_result"],
): string | null {
  switch (result) {
    case "offline":
      return "Last backup didn't complete (the box was offline). It will retry automatically.";
    case "not_entitled":
      return "Cloud backup isn't included in this subscription.";
    case "error":
      return "Last backup didn't complete. It will retry automatically.";
    default:
      return null;
  }
}

export interface CloudSyncSettingsViewProps {
  status: CloudSyncStatus;
  /** True while a "back up now" request is in flight or briefly debounced after. */
  syncing: boolean;
  /** Status/validation message. "✅"-prefixed renders as success, else error. */
  message: string | null;
  onBackUpNow: () => void;
  onBack: () => void;
}

/**
 * Presentational cloud-backup settings screen. Owns no data fetching — the
 * parent ({@link CloudSyncSettingsPage}) polls the status over SWR and performs
 * the trigger. Shows when game data was last backed up and a "Back up now"
 * button; the logs section is diagnostic and shown only when relevant.
 */
export function CloudSyncSettingsView({
  status,
  syncing,
  message,
  onBackUpNow,
  onBack,
}: CloudSyncSettingsViewProps) {
  const backedUp = relativeTime(status.backup.last_success);
  const warning = status.enabled ? warningForResult(status.backup.last_result) : null;

  return (
    <PageLayout
      headerTitle="Cloud Backup"
      backAction={onBack}
      actions={
        status.enabled ? (
          <button
            type="button"
            onClick={onBackUpNow}
            disabled={syncing}
            className={primaryButtonClass}
          >
            {syncing ? "Backing up..." : "Back up now"}
          </button>
        ) : undefined
      }
    >
      <div className="px-6 pt-6 max-w-sm w-full mx-auto space-y-4">
        {!status.enabled ? (
          <p className="text-base text-gray-600">
            Cloud backup is not enabled on this box. Game data is kept locally;
            enabling the cloud backup subscription lets the box back it up
            off-box automatically.
          </p>
        ) : (
          <>
            <p className="text-sm text-gray-600">
              The box backs up your game data off-box automatically. You can also
              back up now — for example right after a session, before switching
              off.
            </p>

            <div className="rounded-xl bg-gray-100 p-4">
              <p className="text-sm font-medium text-gray-600">
                Games backed up
              </p>
              <p className="text-lg font-semibold text-gray-800">
                {backedUp ?? "Not yet"}
              </p>
            </div>

            {warning && (
              <p className="text-sm text-amber-700" role="status">
                {warning}
              </p>
            )}
          </>
        )}

        {message && (
          <p
            className={`text-base text-center ${message.startsWith("✅") ? "text-green-700" : "text-red-600"}`}
            role="status"
          >
            {message}
          </p>
        )}
      </div>
    </PageLayout>
  );
}
