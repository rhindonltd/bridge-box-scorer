"use client";

import { useState } from "react";
import { Spinner } from "@/components/common/Spinner";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { getAdminToken, clearAdminToken } from "@/lib/admin-token";
import { swrKeys } from "@/swr/swr-keys";
import type { BridgewebsStatus } from "@/db/system/queries/bridgewebs-credentials";
import { BridgewebsSettingsForm } from "@/app/settings/bridgewebs/BridgewebsSettingsForm";

/**
 * Data container for the BridgeWebs settings screen: loads the configured
 * status over SWR, owns the edit/save state machine (including the admin-token
 * 401 handling and the first-configuration password rule), and delegates
 * rendering to {@link BridgewebsSettingsForm}.
 */
export function BridgewebsSettingsPage() {
  const router = useRouter();
  // Edited values are null until the user types; the displayed club falls back
  // to the fetched status. The password field is always edit-only: we never
  // receive the stored password from the server, and leaving it blank keeps the
  // existing one.
  const [clubEdit, setClubEdit] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const {
    data: status,
    isLoading: loading,
    mutate,
  } = useSWR<BridgewebsStatus>(swrKeys.bridgewebs(), fetcher);

  const club = clubEdit ?? status?.club ?? "";
  const configured = status?.configured ?? false;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!club.trim()) {
      setMessage("Club code is required");
      return;
    }
    // Require a password on first configuration; afterwards a blank password
    // keeps the stored one.
    if (!configured && !password) {
      setMessage("Password is required");
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch(swrKeys.bridgewebs(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": getAdminToken() ?? "",
        },
        body: JSON.stringify({ club: club.trim(), password }),
      });

      if (res.ok) {
        setPassword("");
        await mutate();
        setMessage("✅ BridgeWebs settings saved");
      } else if (res.status === 401) {
        clearAdminToken();
        setMessage("Session expired. Please re-enter the admin key.");
      } else {
        const body = await res.json().catch(() => null);
        setMessage(body?.error ?? "Failed to save");
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
    <BridgewebsSettingsForm
      club={club}
      password={password}
      configured={configured}
      saving={saving}
      message={message}
      onClubChange={setClubEdit}
      onPasswordChange={setPassword}
      onSave={handleSave}
      onBack={() => router.back()}
    />
  );
}
