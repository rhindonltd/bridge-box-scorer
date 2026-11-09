"use client";

import { useRouter } from "next/navigation";
import useSWR from "swr";
import {
  PairsRosterPage,
  type SubstitutionSaveOptions,
} from "@/app/game/[gameId]/manage/pairs/PairsRosterPage";
import { unwrapFetcher } from "@/lib/fetcher";
import {
  setAbsenceTreatment,
  setSubstitutionOptions,
  withdrawPairAsDirector,
} from "@/lib/game-service";
import { ChangeDeviceView } from "@/app/game/[gameId]/play/[initialSeat]/ChangeDeviceView";
import { swrKeys } from "@/swr/swr-keys";
import { useSocketRevalidate } from "@/hooks/use-socket-revalidate";
import { SocketEvents } from "@/socket/socket-events";
import { FullScreenSpinner } from "@/components/common/Spinner";
import type { RosterEntry } from "@/db/games/queries/find-game-roster";
import type { BridgeGame } from "@/db/game-index/schema";
import type { AbsenceTreatment } from "@/model/absence";

/**
 * Container for the director's "Pairs" roster (design §11): loads every pair's
 * status and wires the per-row actions — withdraw / reinstate, the AVE−/AVE+ vs
 * Removed choice for a late / withdrawn pair, and the split / eligibility /
 * main-pair choices for a substituted seat. Each action re-reads the roster so
 * the list reflects the change.
 */
export function PairsRoster({ gameId }: { gameId: string }) {
  const router = useRouter();
  const rosterKey = swrKeys.roster(gameId);

  const {
    data: roster,
    isLoading,
    mutate,
  } = useSWR<RosterEntry[]>(rosterKey, unwrapFetcher<RosterEntry[]>("roster"));

  // The roster is an HTTP resource, but other devices change it: a withdrawal
  // from a player's phone, a late pair seating, or a handover / reinstate
  // claimed on another device all push PARTICIPANTS. Re-read on those (and on
  // reconnect) so the director's screen never shows a stale status.
  useSocketRevalidate(rosterKey, [SocketEvents.PARTICIPANTS], [rosterKey]);

  // The game row primes the pairs/teams gate on the substitution NGS warning.
  const { data: game } = useSWR<BridgeGame>(
    swrKeys.game(gameId),
    unwrapFetcher<BridgeGame>("game"),
  );
  const isPairs = game?.gameType === "PAIRS";

  if (isLoading) {
    return <FullScreenSpinner />;
  }

  async function onSaveSubstitution(
    seat: string,
    options: SubstitutionSaveOptions,
  ): Promise<void> {
    await setSubstitutionOptions(gameId, seat, options);
    await mutate();
  }

  async function onSetAbsenceTreatment(
    seat: string,
    treatment: AbsenceTreatment,
  ): Promise<void> {
    await setAbsenceTreatment(gameId, seat, treatment);
    await mutate();
  }

  async function onWithdraw(seat: string): Promise<void> {
    await withdrawPairAsDirector(gameId, seat);
    await mutate();
  }

  return (
    <PairsRosterPage
      onBack={() => router.push(`/game/${gameId}/manage`)}
      roster={roster ?? []}
      isPairs={isPairs}
      onSaveSubstitution={onSaveSubstitution}
      onSetAbsenceTreatment={onSetAbsenceTreatment}
      onWithdraw={onWithdraw}
      // Reinstating hands a device a fresh token, so it goes through the
      // seat-transfer code flow — the returning pair's device claims a
      // REINSTATE code, which reinstates the pair with that device's token.
      renderReinstatePanel={(seat) => (
        <ChangeDeviceView gameId={gameId} seat={seat} kind="REINSTATE" />
      )}
    />
  );
}
