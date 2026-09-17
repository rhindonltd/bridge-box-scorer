"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getAdminToken } from "@/lib/admin-token";
import { UpdateAdminKeyForm } from "@/app/settings/admin-key/UpdateAdminKeyForm";

/**
 * Container for the "update admin key" screen: owns the field state, the
 * length/match validation, and the save POST, delegating rendering to
 * {@link UpdateAdminKeyForm}.
 */
export function UpdateAdminKeyPage() {
  const router = useRouter();
  const [newKey, setNewKey] = useState("");
  const [confirmKey, setConfirmKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    const key = newKey.trim();

    if (key.length < 4) {
      setMessage("Admin key must be at least 4 characters");
      return;
    }
    if (key !== confirmKey.trim()) {
      setMessage("Keys do not match");
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/system/admin-key", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": getAdminToken() ?? "",
        },
        body: JSON.stringify({ key }),
      });

      if (res.ok) {
        setMessage("✅ Admin key updated");
        setNewKey("");
        setConfirmKey("");
      } else {
        const body = await res.json();
        setMessage(body.error ?? "Failed to update admin key");
      }
    } catch {
      setMessage("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <UpdateAdminKeyForm
      newKey={newKey}
      confirmKey={confirmKey}
      saving={saving}
      message={message}
      onNewKeyChange={setNewKey}
      onConfirmKeyChange={setConfirmKey}
      onSave={handleSave}
      onBack={() => router.back()}
    />
  );
}
