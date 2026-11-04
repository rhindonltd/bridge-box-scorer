"use client";

import { useRouter } from "next/navigation";
import useSWR from "swr";
import { ExportMenuPage } from "@/app/game/[gameId]/manage/export/options/ExportMenuPage";
import { useGameStarted } from "@/hooks/game-started";
import { useResultsComplete } from "@/hooks/results-complete";
import { fetcher } from "@/lib/fetcher";
import { swrKeys } from "@/swr/swr-keys";
import type { BridgewebsStatus } from "@/db/system/queries/bridgewebs-credentials";
import type { EbuStatus } from "@/db/system/queries/ebu-credentials";

/**
 * Container for the "Export & Publish" submenu: resolves the same live state
 * the main manage menu used to gate the export buttons (game started, results
 * complete, and whether BridgeWebs / EBU are configured), and routes each
 * action to its existing leaf screen.
 */
export function ExportMenu({ gameId }: { gameId: string }) {
  const router = useRouter();

  const { started } = useGameStarted(gameId);
  const { allResultsIn } = useResultsComplete(gameId);

  // Whether BridgeWebs is configured (device setting) — controls whether the
  // "Upload to BridgeWebs" option appears at all.
  const { data: bridgewebs } = useSWR<BridgewebsStatus>(
    swrKeys.bridgewebs(),
    fetcher,
  );
  const bridgewebsConfigured = bridgewebs?.configured ?? false;

  // Whether EBU is configured (device setting) — controls whether the "Submit
  // to EBU" option appears at all.
  const { data: ebu } = useSWR<EbuStatus>(swrKeys.ebu(), fetcher);
  const ebuConfigured = ebu?.configured ?? false;

  return (
    <ExportMenuPage
      onBack={() => router.push(`/game/${gameId}/manage/export`)}
      onDownloadUsebioClick={() =>
        router.push(`/game/${gameId}/manage/download-usebio`)
      }
      onDownloadPbnClick={() =>
        router.push(`/game/${gameId}/manage/download-pbn`)
      }
      onUploadBridgewebsClick={() =>
        router.push(`/game/${gameId}/manage/upload-bridgewebs`)
      }
      onUploadEbuClick={() => router.push(`/game/${gameId}/manage/upload-ebu`)}
      showDownloadUsebio={started}
      downloadUsebioDisabled={!allResultsIn}
      showDownloadPbn={started}
      showUploadBridgewebs={started && bridgewebsConfigured}
      uploadBridgewebsDisabled={!allResultsIn}
      showUploadEbu={started && ebuConfigured}
      uploadEbuDisabled={!allResultsIn}
    />
  );
}
