"use client";

import { useRouter } from "next/navigation";
import useSWR from "swr";
import { ExportDirectorSection } from "@/app/game/[gameId]/export/ExportDirectorSection";
import { ExportGamePage } from "@/app/game/[gameId]/export/ExportGamePage";
import { useIsDirector } from "@/hooks/use-is-director";
import { fetcher } from "@/lib/fetcher";
import { swrKeys } from "@/swr/swr-keys";
import type { Club } from "@/db/system/schema";

/**
 * Container for the export page of a finalised game: routes each download to
 * its page, and shows the club-details warning on a director's device.
 */
export function ExportGame({ gameId }: { gameId: string }) {
  const router = useRouter();
  const isDirector = useIsDirector(gameId);

  const { data: clubData } = useSWR<{ club: Club | null }>(
    swrKeys.club(),
    fetcher,
  );
  const club = clubData?.club ?? null;
  const clubKnown = clubData !== undefined;
  const clubConfigured = !!club?.name?.trim() && !!club?.clubNumber?.trim();

  return (
    <ExportGamePage
      onDownloadUsebioClick={() =>
        router.push(`/game/${gameId}/export/download-usebio`)
      }
      onDownloadPbnClick={() =>
        router.push(`/game/${gameId}/export/download-pbn`)
      }
      showClubWarning={isDirector && clubKnown && !clubConfigured}
      directorSection={
        isDirector ? <ExportDirectorSection gameId={gameId} /> : undefined
      }
    />
  );
}
