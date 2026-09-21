"use client";

import { useEffect } from "react";
import {
  subscribeAdminToken,
  verifyAdminTokenWithServer,
} from "@/lib/admin-token";
import { AdminKeyEntry } from "@/app/settings/AdminKeyEntry";
import { useAuthGuard } from "@/hooks/use-auth-guard";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Authorization is decided by the SERVER, not by the mere presence of a token
  // in localStorage. A stale/bogus token must not unlock settings, so we verify
  // the stored token against the server before rendering any settings page.
  const { state, recheck } = useAuthGuard(verifyAdminTokenWithServer);

  // Re-validate whenever the admin token changes (another tab unlocks/clears,
  // or this tab clears a stale token), so protected content is never shown to a
  // user whose token was just cleared while the fresh check runs.
  useEffect(() => subscribeAdminToken(recheck), [recheck]);

  if (state === "checking") {
    // Avoid flashing either the prompt or the protected content while the
    // server check is in flight.
    return null;
  }

  if (state === "unauthorized") {
    // A correct key mints a fresh token; re-validate to unlock.
    return <AdminKeyEntry onSuccess={recheck} />;
  }

  return <>{children}</>;
}
