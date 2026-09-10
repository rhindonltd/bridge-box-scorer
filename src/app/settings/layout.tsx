"use client";

import { useEffect, useRef, useState } from "react";
import {
  subscribeAdminToken,
  verifyAdminTokenWithServer,
} from "@/lib/admin-token";
import { AdminKeyEntry } from "@/app/settings/AdminKeyEntry";

type AuthState = "checking" | "authorized" | "unauthorized";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Authorization is decided by the SERVER, not by the mere presence of a token
  // in localStorage. A stale/bogus token must not unlock settings, so we verify
  // the stored token against the server before rendering any settings page.
  const [state, setState] = useState<AuthState>("checking");

  // Bump to trigger a (re)validation. Changing this re-runs the effect below.
  const [checkId, setCheckId] = useState(0);

  // Track the latest run so a slow earlier check can't overwrite a newer result.
  const latestCheck = useRef(0);

  useEffect(() => {
    const thisCheck = ++latestCheck.current;

    verifyAdminTokenWithServer().then((valid) => {
      if (thisCheck !== latestCheck.current) return;
      setState(valid ? "authorized" : "unauthorized");
    });
  }, [checkId]);

  // Re-validate whenever the admin token changes (another tab unlocks/clears,
  // or this tab clears a stale token). Handlers may call setState — that's a
  // callback from an external system, not a synchronous effect body. We drop
  // back to "checking" so protected content is never shown to a user whose
  // token was just cleared, while the fresh check runs.
  useEffect(
    () =>
      subscribeAdminToken(() => {
        setState("checking");
        setCheckId((n) => n + 1);
      }),
    [],
  );

  if (state === "checking") {
    // Avoid flashing either the prompt or the protected content while the
    // server check is in flight.
    return null;
  }

  if (state === "unauthorized") {
    // A correct key mints a fresh token; re-validate to unlock.
    return (
      <AdminKeyEntry
        onSuccess={() => {
          setState("checking");
          setCheckId((n) => n + 1);
        }}
      />
    );
  }

  return <>{children}</>;
}
