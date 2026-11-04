"use client";

import { useRouter } from "next/navigation";
import useSWR from "swr";
import { ExportReadinessPage } from "@/app/game/[gameId]/manage/export/ExportReadinessPage";
import { buildExportReadiness } from "@/app/game/[gameId]/manage/export/export-readiness";
import { fetcher, unwrapFetcher } from "@/lib/fetcher";
import { swrKeys } from "@/swr/swr-keys";
import type { ResultsSummary } from "@/db/games/queries/get-results-summary";
import {
  OUTSTANDING_DETAIL_LIMIT,
  type OutstandingBoard,
} from "@/db/games/queries/get-outstanding-boards";
import type { Club } from "@/db/system/schema";
import type { BridgewebsStatus } from "@/db/system/queries/bridgewebs-credentials";
import type { EbuStatus } from "@/db/system/queries/ebu-credentials";

/**
 * Container for the export readiness screen: gathers the export prerequisites
 * (how many results are in, plus whether club info / BridgeWebs / EBU are
 * configured) and hands the derived checklist to the presentational page.
 *
 * Continuing routes on to the export options; the options screen still gates
 * each individual action, so this screen is purely informative.
 */
export function ExportReadiness({ gameId }: { gameId: string }) {
  const router = useRouter();

  const { data: summary } = useSWR<ResultsSummary>(
    swrKeys.resultsSummary(gameId),
    fetcher,
  );
  const { data: clubData } = useSWR<{ club: Club | null }>(
    swrKeys.club(),
    fetcher,
  );
  const { data: bridgewebs } = useSWR<BridgewebsStatus>(
    swrKeys.bridgewebs(),
    fetcher,
  );
  const { data: ebu } = useSWR<EbuStatus>(swrKeys.ebu(), fetcher);

  const totalPlayable = summary?.totalPlayable ?? 0;
  const finalized = summary?.finalized ?? 0;
  const outstanding = Math.max(totalPlayable - finalized, 0);

  // Only fetch the per-board detail when a SMALL number are outstanding —
  // listing dozens of boards would be noise, so above the threshold the count
  // alone stands. A null SWR key skips the request entirely.
  const showOutstandingDetail =
    outstanding > 0 && outstanding <= OUTSTANDING_DETAIL_LIMIT;
  const { data: outstandingBoards } = useSWR<OutstandingBoard[]>(
    showOutstandingDetail ? swrKeys.outstandingBoards(gameId) : null,
    unwrapFetcher<OutstandingBoard[]>("boards"),
  );

  // The section count decides whether a board's section is worth showing in the
  // detail cards. Only needed alongside the detail list, so fetch it then.
  const { data: sections } = useSWR<{ section: string }[]>(
    showOutstandingDetail ? swrKeys.sections(gameId) : null,
    unwrapFetcher<{ section: string }[]>("sections"),
  );

  const club = clubData?.club ?? null;
  const clubConfigured = !!club?.name?.trim() && !!club?.clubNumber?.trim();

  const items = buildExportReadiness({
    totalPlayable,
    finalized,
    clubConfigured,
    bridgewebsConfigured: bridgewebs?.configured ?? false,
    ebuConfigured: ebu?.configured ?? false,
    outstandingBoards: showOutstandingDetail ? outstandingBoards : undefined,
    multiSection: (sections?.length ?? 0) > 1,
  });

  return (
    <ExportReadinessPage
      onBack={() => router.push(`/game/${gameId}/manage`)}
      onContinue={() => router.push(`/game/${gameId}/manage/export/options`)}
      items={items}
    />
  );
}
