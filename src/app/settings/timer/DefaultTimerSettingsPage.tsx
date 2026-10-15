"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";

import { Spinner } from "@/components/common/Spinner";
import { fetcher } from "@/lib/fetcher";
import { getAdminToken, clearAdminToken } from "@/lib/admin-token";
import { swrKeys } from "@/swr/swr-keys";
import { DefaultTimerSettings } from "@/timer/timer-state";
import { DefaultTimerSettingsForm } from "@/app/settings/timer/DefaultTimerSettingsForm";

/**
 * Data container for the club-wide default-timer screen: loads the stored
 * settings over SWR, owns the edit/save state machine (including the admin-token
 * 401 handling), and delegates rendering to {@link DefaultTimerSettingsForm}.
 *
 * Durations are edited as minutes + seconds and recombined to whole seconds on
 * save, mirroring the per-game Timer tab.
 */
export function DefaultTimerSettingsPage() {
  const router = useRouter();

  // Edited values are null until the user touches a field; the displayed value
  // falls back to the fetched settings. This avoids mirroring fetched data into
  // state via an effect (same pattern as the club settings page).
  const [playMinutesEdit, setPlayMinutesEdit] = useState<number | null>(null);
  const [playSecondsEdit, setPlaySecondsEdit] = useState<number | null>(null);
  const [moveMinutesEdit, setMoveMinutesEdit] = useState<number | null>(null);
  const [moveSecondsEdit, setMoveSecondsEdit] = useState<number | null>(null);
  const [warningSecondsEdit, setWarningSecondsEdit] = useState<number | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const {
    data,
    isLoading: loading,
    mutate,
  } = useSWR<{ settings: DefaultTimerSettings }>(
    swrKeys.defaultTimer(),
    fetcher,
  );

  const settings = data?.settings;
  const playFromServer = settings?.playSecondsPerBoard ?? 0;
  const moveFromServer = settings?.moveSeconds ?? 0;
  const warningFromServer = settings?.warningSeconds ?? 0;

  const playMinutes = playMinutesEdit ?? Math.floor(playFromServer / 60);
  const playSeconds = playSecondsEdit ?? playFromServer % 60;
  const moveMinutes = moveMinutesEdit ?? Math.floor(moveFromServer / 60);
  const moveSeconds = moveSecondsEdit ?? moveFromServer % 60;
  const warningSeconds = warningSecondsEdit ?? warningFromServer;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    const playSecondsPerBoard = playMinutes * 60 + playSeconds;
    const moveTotalSeconds = moveMinutes * 60 + moveSeconds;

    if (playSecondsPerBoard <= 0 || moveTotalSeconds <= 0) {
      setMessage("Play and changeover times must be greater than zero");
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch(swrKeys.defaultTimer(), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": getAdminToken() ?? "",
        },
        body: JSON.stringify({
          playSecondsPerBoard,
          moveSeconds: moveTotalSeconds,
          warningSeconds,
        }),
      });

      if (res.ok) {
        // Revalidate so this screen (and any new game's Timer tab) reflects the
        // save, and drop the local edits so they fall back to the fresh values.
        await mutate();
        setPlayMinutesEdit(null);
        setPlaySecondsEdit(null);
        setMoveMinutesEdit(null);
        setMoveSecondsEdit(null);
        setWarningSecondsEdit(null);
        setMessage("✅ Default timer saved");
      } else if (res.status === 401) {
        // Stale/invalid admin token: clear it so the settings gate re-prompts
        // for the admin key rather than leaving saves silently failing.
        clearAdminToken();
        setMessage("Session expired. Please re-enter the admin key.");
      } else {
        const body = await res.json().catch(() => ({}));
        setMessage(body.error ?? "Failed to save");
      }
    } catch {
      setMessage("Network error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-white">
        <Spinner />
      </div>
    );
  }

  return (
    <DefaultTimerSettingsForm
      playMinutes={playMinutes}
      playSeconds={playSeconds}
      moveMinutes={moveMinutes}
      moveSeconds={moveSeconds}
      warningSeconds={warningSeconds}
      saving={saving}
      message={message}
      onPlayMinutesChange={setPlayMinutesEdit}
      onPlaySecondsChange={setPlaySecondsEdit}
      onMoveMinutesChange={setMoveMinutesEdit}
      onMoveSecondsChange={setMoveSecondsEdit}
      onWarningSecondsChange={setWarningSecondsEdit}
      onSave={handleSave}
      onBack={() => router.back()}
    />
  );
}
