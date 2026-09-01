"use client";

import { useEffect, useState } from "react";
import { hasAdminToken } from "@/lib/admin-token";
import { AdminKeyEntry } from "@/app/settings/AdminKeyEntry";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // `null` until we've checked localStorage on the client, to avoid a
  // hydration mismatch (server can't read the token).
  const [unlocked, setUnlocked] = useState<boolean | null>(null);

  useEffect(() => {
    setUnlocked(hasAdminToken());
  }, []);

  if (unlocked === null) {
    return null;
  }

  if (!unlocked) {
    return <AdminKeyEntry onSuccess={() => setUnlocked(true)} />;
  }

  return <>{children}</>;
}
