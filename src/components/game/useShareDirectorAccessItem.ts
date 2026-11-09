"use client";

import { useRouter } from "next/navigation";
import type { HeaderMenuItem } from "@/components/layout/HeaderMenu";

/**
 * The "Share Director Access" entry for a director's header hamburger. Opens
 * the share-code screen; its back arrow returns to whichever page the director
 * was on beforehand (the screen uses the header's default pop-the-stack back).
 *
 * Shared by every director hamburger (play, manage, setup) so the label and
 * destination stay identical. Must be called from a client component (uses the
 * router). Gating — only adding it for a director — is the caller's job.
 */
export function useShareDirectorAccessItem(gameId: string): HeaderMenuItem {
  const router = useRouter();
  return {
    label: "Share Director Access",
    onSelect: () => router.push(`/game/${gameId}/manage/share-access`),
  };
}
