"use client";

import { useState } from "react";
import { Spinner } from "@/components/common/Spinner";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { getAdminToken, clearAdminToken } from "@/lib/admin-token";
import { swrKeys } from "@/swr/swr-keys";
import type { BridgewebsStatus } from "@/db/system/queries/bridgewebs-credentials";

export default function BridgewebsSettingsPage() {
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
    <div className="min-h-dvh flex flex-col bg-white">
      <div className="bg-gray-200 text-gray-800 py-3 text-center font-bold text-lg shrink-0">
        BridgeWebs
      </div>

      <form
        onSubmit={handleSave}
        className="flex-1 flex flex-col px-6 pt-6 pb-8 max-w-sm w-full mx-auto"
      >
        <div className="space-y-4 flex-1">
          <p className="text-sm text-gray-600">
            Connect your club&apos;s BridgeWebs account to list the day&apos;s
            events when creating a game and upload results.
          </p>

          <div>
            <label
              htmlFor="bw-club"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              BridgeWebs Club Code
            </label>
            <input
              id="bw-club"
              type="text"
              value={club}
              onChange={(e) => setClubEdit(e.target.value)}
              placeholder="e.g. anytownbc"
              className="w-full p-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="bw-password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              BridgeWebs Password
            </label>
            <input
              id="bw-password"
              type="password"
              value={password}
              autoComplete="new-password"
              onChange={(e) => setPassword(e.target.value)}
              placeholder={
                configured ? "•••••••• (leave blank to keep)" : "Enter password"
              }
              className="w-full p-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {configured && (
              <p className="mt-1 text-xs text-green-700">
                A password is saved. Leave blank to keep it.
              </p>
            )}
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
            {saving ? "Saving..." : "Save"}
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
