"use client";

import { useSyncExternalStore } from "react";
import { hasAdminToken, subscribeAdminToken } from "@/lib/admin-token";
import { AdminKeyEntry } from "@/app/settings/AdminKeyEntry";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Read the client-only admin-token state via an external store. The server
  // snapshot is `null` so nothing renders until the client has checked
  // localStorage, avoiding a hydration mismatch. Unlocking after a successful
  // key entry notifies subscribers through the admin-token store.
  const unlocked = useSyncExternalStore(
    subscribeAdminToken,
    () => hasAdminToken(),
    () => null,
  );

  if (unlocked === null) {
    return null;
  }

  if (!unlocked) {
    return <AdminKeyEntry onSuccess={() => {}} />;
  }

  return <>{children}</>;
}
