"use client";

import { useRouter } from "next/navigation";
import useSWR from "swr";
import {
  SubstitutionsPage,
  type SubstitutionSaveOptions,
} from "@/app/game/[gameId]/manage/substitutions/SubstitutionsPage";
import { unwrapFetcher } from "@/lib/fetcher";
import { setSubstitutionOptions } from "@/lib/game-service";
import { swrKeys } from "@/swr/swr-keys";
import { FullScreenSpinner } from "@/components/common/Spinner";
import type { SubstitutionSeat } from "@/db/games/queries/find-substitution-seats";
import type { BridgeGame } from "@/db/game-index/schema";

/**
 * Container for the "Substitutions" screen: loads the substituted seats and
 * persists each one's split + per-occupant eligibility choices. On a successful
 * save it revalidates the list so the stored choices are reflected.
 */
export function Substitutions({ gameId }: { gameId: string }) {
  const router = useRouter();
  const key = swrKeys.substitutions(gameId);

  const { data, isLoading, mutate } = useSWR<SubstitutionSeat[]>(
    key,
    unwrapFetcher<SubstitutionSeat[]>("substitutions"),
  );

  // The game row (for the pairs-vs-teams gate on the split=no warning). Reads
  // the same SWR cache GameProvider already primed, so it's effectively free.
  const { data: game } = useSWR<BridgeGame>(
    swrKeys.game(gameId),
    unwrapFetcher<BridgeGame>("game"),
  );
  // Only treat as pairs once the row CONFIRMS it — until it resolves, the
  // NGS/Masterpoint warning stays hidden rather than flashing on a seat it may
  // not apply to. (GameProvider primes this cache, so it's normally immediate.)
  const isPairs = game?.gameType === "PAIRS";

  if (isLoading) {
    return <FullScreenSpinner />;
  }

  async function handleSave(
    seat: string,
    options: SubstitutionSaveOptions,
  ): Promise<void> {
    await setSubstitutionOptions(gameId, seat, options);
    // Reflect the stored values (so a re-open pre-fills from the server).
    await mutate();
  }

  return (
    <SubstitutionsPage
      onBack={() => router.push(`/game/${gameId}/manage`)}
      substitutions={data ?? []}
      isPairs={isPairs}
      onSave={handleSave}
    />
  );
}
