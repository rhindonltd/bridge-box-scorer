"use client";

import { useState } from "react";
import { logoutAdmin } from "@/lib/admin-token";

/**
 * Logs out of the admin session. Clearing the admin token fires a change event
 * that the settings layout listens to, which re-validates and falls back to the
 * admin-key prompt — so no explicit navigation is needed here.
 */
export function LogoutButton() {
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      await logoutAdmin();
    } finally {
      // The layout swaps in the key prompt once the token is cleared; if it
      // somehow doesn't, re-enable so the user can retry.
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
