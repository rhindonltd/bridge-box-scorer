"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { logoutAdmin } from "@/lib/admin-token";

/**
 * Logs out of the admin session and returns to the home screen (main menu).
 *
 * Clearing the admin token also fires a change event that the settings layout
 * listens to, which would otherwise fall back to the admin-key prompt. Logging
 * out is a deliberate "I'm done with settings", so we leave the settings area
 * instead of showing that prompt.
 */
export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      // Always clears the local token, even if the server call fails.
      await logoutAdmin();
      router.replace("/");
    } catch {
      // Not expected (logoutAdmin swallows server errors), but re-enable so the
      // user can retry rather than being stuck on a disabled button.
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="w-full py-3.5 text-lg font-semibold bg-red-100 text-red-800 rounded-xl hover:bg-red-200 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 text-center block disabled:opacity-60"
    >
      {loading ? "Logging out…" : "Log Out"}
    </button>
  );
}
