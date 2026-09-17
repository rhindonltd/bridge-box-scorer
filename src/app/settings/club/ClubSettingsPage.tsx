"use client";

import { useState } from "react";
import { Spinner } from "@/components/common/Spinner";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Club } from "@/db/system/schema";
import { fetcher } from "@/lib/fetcher";
import { getAdminToken, clearAdminToken } from "@/lib/admin-token";
import { swrKeys } from "@/swr/swr-keys";
import { ClubSettingsForm } from "@/app/settings/club/ClubSettingsForm";

/**
 * Data container for the club-information screen: loads the current club record
 * over SWR, owns the edit/save state machine (including the admin-token 401
 * handling), and delegates rendering to {@link ClubSettingsForm}.
 */
export function ClubSettingsPage() {
  const router = useRouter();
  // Edited values are null until the user types; the displayed value falls
  // back to the fetched club record. This avoids mirroring fetched data into
  // state via an effect.
  const [nameEdit, setNameEdit] = useState<string | null>(null);
  const [clubNumberEdit, setClubNumberEdit] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const {
    data,
    isLoading: loading,
    mutate,
  } = useSWR<{ club: Club | null }>(swrKeys.club(), fetcher);

  const name = nameEdit ?? data?.club?.name ?? "";
  const clubNumber = clubNumberEdit ?? data?.club?.clubNumber ?? "";

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !clubNumber.trim()) {
      setMessage("Both fields are required");
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/system/club", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": getAdminToken() ?? "",
        },
        body: JSON.stringify({
          name: name.trim(),
          clubNumber: clubNumber.trim(),
        }),
      });

      if (res.ok) {
        // Revalidate the shared club cache so other views reflect the save.
        await mutate();
        setMessage("✅ Club info saved");
      } else if (res.status === 401) {
        // The admin token is stale/invalid. Clear it so the settings gate
        // re-prompts for the admin key rather than leaving the user on a page
        // whose saves silently fail.
        clearAdminToken();
        setMessage("Session expired. Please re-enter the admin key.");
      } else {
        const body = await res.json();
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
    <ClubSettingsForm
      name={name}
      clubNumber={clubNumber}
      saving={saving}
      message={message}
      onNameChange={setNameEdit}
      onClubNumberChange={setClubNumberEdit}
      onSave={handleSave}
      onBack={() => router.back()}
    />
  );
}
