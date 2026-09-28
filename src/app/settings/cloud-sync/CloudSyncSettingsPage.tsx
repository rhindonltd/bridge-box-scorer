"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Spinner } from "@/components/common/Spinner";
import { fetcher } from "@/lib/fetcher";
import { getAdminToken, clearAdminToken } from "@/lib/admin-token";
import { swrKeys } from "@/swr/swr-keys";
import type { CloudSyncStatus } from "@/lib/system/cloud-sync";
import { CloudSyncSettingsView } from "@/app/settings/cloud-sync/CloudSyncSettingsView";

/** How long the "Back up now" button stays disabled after a press (debounce). */
const DEBOUNCE_MS = 5000;

/** How often the status is re-polled while this screen is open. */
const POLL_MS = 5000;

/**
 * Data container for the cloud-backup settings screen. Polls the last-sync
 * status over SWR (so "last backed up" updates as the box completes a run),
 * fires the fire-and-forget "back up now" trigger, and refreshes the status
 * afterwards. The trigger is debounced so a director can't hammer it (the sync
 * is fire-and-forget: a 200 means "started", not "finished").
 */
export function CloudSyncSettingsPage() {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    data: status,
    isLoading: loading,
    mutate,
  } = useSWR<CloudSyncStatus>(swrKeys.cloudSyncStatus(), fetcher, {
    refreshInterval: POLL_MS,
  });

  async function handleBackUpNow() {
    setSyncing(true);
    setMessage(null);

    try {
      const res = await fetch(swrKeys.cloudSync(), {
        method: "POST",
        headers: { "x-admin-token": getAdminToken() ?? "" },
      });

      if (res.ok) {
        setMessage("✅ Backup started");
        // The sync runs asynchronously on the box; re-read the status so the
        // "last backed up" line updates once the run lands.
        await mutate();
      } else if (res.status === 401) {
        clearAdminToken();
        setMessage("Session expired. Please re-enter the admin key.");
      } else {
        const body = await res.json().catch(() => null);
        setMessage(body?.error ?? "Failed to start backup");
      }
    } catch {
      setMessage("Network error");
    } finally {
      // Keep the button disabled briefly so repeated presses don't spam the
      // trigger (the box coalesces runs anyway, but this is friendlier).
      debounceRef.current = setTimeout(() => setSyncing(false), DEBOUNCE_MS);
    }
  }

  if (loading || !status) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-white">
        <Spinner />
      </div>
    );
  }

  return (
    <CloudSyncSettingsView
      status={status}
      syncing={syncing}
      message={message}
      onBackUpNow={handleBackUpNow}
      onBack={() => router.back()}
    />
  );
}
