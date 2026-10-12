"use client";

import { useState } from "react";
import { Spinner } from "@/components/common/Spinner";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { getAdminToken, clearAdminToken } from "@/lib/admin-token";
import { swrKeys } from "@/swr/swr-keys";
import type { EbuStatus } from "@/db/system/queries/ebu-credentials";
import { EbuSettingsForm } from "@/app/settings/ebu/EbuSettingsForm";

/**
 * Data container for the EBU settings screen: loads the configured status over
 * SWR, owns the edit/save state machine (including the admin-token 401 handling
 * and the first-configuration password rule), and delegates rendering to
 * {@link EbuSettingsForm}.
 */
export function EbuSettingsPage() {
  const router = useRouter();
  // Edited values are null until the user types; the displayed number falls
  // back to the fetched status. The password field is always edit-only: we
  // never receive the stored password from the server, and leaving it blank
  // keeps the existing one.
  const [ebuNumberEdit, setEbuNumberEdit] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const {
    data: status,
    isLoading: loading,
    mutate,
  } = useSWR<EbuStatus>(swrKeys.ebu(), fetcher);

  const ebuNumber = ebuNumberEdit ?? status?.ebuNumber ?? "";
  const configured = status?.configured ?? false;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!ebuNumber.trim()) {
      setMessage("EBU number is required");
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
      const res = await fetch(swrKeys.ebu(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": getAdminToken() ?? "",
        },
        body: JSON.stringify({ ebuNumber: ebuNumber.trim(), password }),
      });

      if (res.ok) {
        setPassword("");
        await mutate();
        setMessage("✅ EBU settings saved");
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
    <EbuSettingsForm
      ebuNumber={ebuNumber}
      password={password}
      configured={configured}
      saving={saving}
      message={message}
      onEbuNumberChange={setEbuNumberEdit}
      onPasswordChange={setPassword}
      onSave={handleSave}
      onBack={() => router.back()}
    />
  );
}
