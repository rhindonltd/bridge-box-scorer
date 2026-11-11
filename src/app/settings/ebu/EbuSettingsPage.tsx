"use client";

import { useState } from "react";
import { Spinner } from "@/components/common/Spinner";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { getAdminToken, clearAdminToken } from "@/lib/admin-token";
import { swrKeys } from "@/swr/swr-keys";
import type { EbuStatus } from "@/db/system/queries/ebu-credentials";
import type { Club } from "@/db/system/schema";
import { EbuSettingsForm } from "@/app/settings/ebu/EbuSettingsForm";

/**
 * Data container for the EBU settings screen: the club's name and EBU club
 * number (which identify the club on every results file) plus the optional EBU
 * login password (only needed to submit results to the EBU). Loads the club
 * record and the EBU status over SWR, owns the edit/save state machine
 * (including the admin-token 401 handling), and delegates rendering to
 * {@link EbuSettingsForm}. One save updates both the club record and the EBU
 * login, so the number is only ever entered once.
 */
export function EbuSettingsPage() {
  const router = useRouter();
  // Edited values are null until the user types; the displayed values fall
  // back to the fetched records. The password field is always edit-only: we
  // never receive the stored password from the server, and leaving it blank
  // keeps the existing one (or, when none is stored, means "no EBU login").
  const [clubNameEdit, setClubNameEdit] = useState<string | null>(null);
  const [ebuNumberEdit, setEbuNumberEdit] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const {
    data: status,
    isLoading: statusLoading,
    mutate: mutateStatus,
  } = useSWR<EbuStatus>(swrKeys.ebu(), fetcher);
  const {
    data: clubData,
    isLoading: clubLoading,
    mutate: mutateClub,
  } = useSWR<{ club: Club | null }>(swrKeys.club(), fetcher);

  const clubName = clubNameEdit ?? clubData?.club?.name ?? "";
  // The EBU login number and the club record's number are the same EBU club
  // number. Prefer the login's copy, falling back to the club record for a
  // device that only had its club details set up.
  const ebuNumber =
    ebuNumberEdit ?? status?.ebuNumber ?? clubData?.club?.clubNumber ?? "";
  const configured = status?.configured ?? false;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!clubName.trim()) {
      setMessage("Club name is required");
      return;
    }
    if (!ebuNumber.trim()) {
      setMessage("EBU number is required");
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
        body: JSON.stringify({
          clubName: clubName.trim(),
          ebuNumber: ebuNumber.trim(),
          password,
        }),
      });

      if (res.ok) {
        setPassword("");
        // Revalidate both shared caches so other views (e.g. the export
        // screens, which read the club record) reflect the save.
        await Promise.all([mutateStatus(), mutateClub()]);
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

  if (statusLoading || clubLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-white">
        <Spinner />
      </div>
    );
  }

  return (
    <EbuSettingsForm
      clubName={clubName}
      ebuNumber={ebuNumber}
      password={password}
      configured={configured}
      saving={saving}
      message={message}
      onClubNameChange={setClubNameEdit}
      onEbuNumberChange={setEbuNumberEdit}
      onPasswordChange={setPassword}
      onSave={handleSave}
      onBack={() => router.back()}
    />
  );
}
