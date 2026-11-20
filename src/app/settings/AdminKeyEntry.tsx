"use client";

import { useState } from "react";
import { heldSeats } from "@/lib/player-token";
import { newOwnSignInId } from "@/lib/director-alerts-seen";
import { setAdminToken } from "@/lib/admin-token";
import { AdminKeyEntryView } from "@/app/settings/AdminKeyEntryView";

interface Props {
  onSuccess: () => void;
}

export function AdminKeyEntry({ onSuccess }: Props) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    const key = code.trim();
    if (!key) return;

    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/system/admin-key/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Held seats let the directors' alert say who this device is; the
        // origin id lets this device skip that alert itself.
        body: JSON.stringify({
          key,
          seats: heldSeats(),
          originId: newOwnSignInId(),
        }),
      });

      const data = await res.json();

      if (res.ok && data.success && data.result?.adminToken) {
        setAdminToken(data.result.adminToken);
        onSuccess();
      } else {
        setError(data.error ?? "Incorrect admin key");
      }
    } catch {
      setError("Could not verify admin key. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AdminKeyEntryView
      code={code}
      error={error}
      loading={loading}
      onCodeChange={setCode}
      onSubmit={handleSubmit}
    />
  );
}
