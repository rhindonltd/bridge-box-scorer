"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getAdminToken } from "@/lib/admin-token";

export default function UpdateAdminKeyPage() {
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
        const data = await res.json();
        setMessage(data.error ?? "Failed to update admin key");
      }
    } catch {
      setMessage("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-dvh flex flex-col bg-white">
      <div className="bg-gray-200 text-gray-800 py-3 text-center font-bold text-lg shrink-0">
        Update Admin Key
      </div>

      <form
        onSubmit={handleSave}
        className="flex-1 flex flex-col px-6 pt-6 pb-8 max-w-sm w-full mx-auto"
      >
        <div className="space-y-4 flex-1">
          <p className="text-sm text-gray-600">
            The admin key controls access to this Settings section and device
            configuration. Keep it somewhere safe.
          </p>

          <div>
            <label
              htmlFor="new-key"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              New Admin Key
            </label>
            <input
              id="new-key"
              type="password"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              autoComplete="new-password"
              className="w-full p-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="confirm-key"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Confirm Admin Key
            </label>
            <input
              id="confirm-key"
              type="password"
              value={confirmKey}
              onChange={(e) => setConfirmKey(e.target.value)}
              autoComplete="new-password"
              className="w-full p-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {message && (
            <p
              className={`text-base text-center ${message.startsWith("✅") ? "text-green-700" : "text-red-600"}`}
            >
              {message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3 pt-6">
          <button
            type="submit"
            disabled={saving}
            className="w-full py-3.5 text-lg font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Update Key"}
          </button>

          <button
            type="button"
            onClick={() => router.back()}
            className="w-full py-3.5 text-lg font-semibold bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            Back
          </button>
        </div>
      </form>
    </div>
  );
}
