"use client";

import { useBackNavigation } from "@/hooks/useBackNavigation";
import useSWR, { useSWRConfig } from "swr";
import {
  PairsRosterPage,
  type StationaryControl,
  type SubstitutionSaveOptions,
} from "@/app/game/[gameId]/manage/pairs/PairsRosterPage";
import { unwrapFetcher } from "@/lib/fetcher";
import { useSections } from "@/hooks/sections";
import { setSectionSwissMovement } from "@/lib/section-service";
import {
  setAbsenceTreatment,
  setSubstitutionOptions,
  withdrawPairAsDirector,
} from "@/lib/game-service";
import {
  setParticipantStanding,
  type StandingChange,
} from "@/lib/standing-service";
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
  // Pop back to the menu rather than pushing it again: a push would add a
  // second menu entry, and the browser back button would then loop between the
  // menu and this screen.
  const { onBack } = useBackNavigation(`/game/${gameId}/manage`);
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
  const isSwiss = game?.eventFormat === "SWISS";

  // Swiss Pairs: a pair can be marked stationary while the event runs. The flag
  // lives in its section's Swiss movement spec (a list of stable pair ids), so
  // flipping one re-saves the whole spec. The server records the list the
  // rounds already drawn were played under, so only later draws change.
  const { sections } = useSections(gameId);
  const sectionLabels = Object.fromEntries(
    sections.map((s) => [s.section, s.label]),
  );
  const { mutate: globalMutate } = useSWRConfig();

  function swissSpecFor(entry: RosterEntry) {
    const letters = entry.seat.match(/^[A-Z]+/)?.[0];
    const section = sections.find((s) => s.section === letters);
    const movement = section?.selectedMovement;
    return section && movement?.source === "SWISS"
      ? { section: section.section, spec: movement.swiss }
      : null;
  }

  // A Swiss pair's stable id is the number in its movement id ("A5" → 5).
  function swissPairId(entry: RosterEntry): number | null {
    const digits = entry.anchorId?.match(/\d+$/)?.[0];
    return digits ? Number(digits) : null;
  }

  const stationary: StationaryControl | undefined = isSwiss
    ? {
        isStationary(entry) {
          const found = swissSpecFor(entry);
          const id = swissPairId(entry);
          if (!found || id == null) return null;
          return (found.spec.stationaryPairs ?? []).includes(id);
        },
        async toggle(entry) {
          const found = swissSpecFor(entry);
          const id = swissPairId(entry);
          if (!found || id == null) return;
          const current = new Set(found.spec.stationaryPairs ?? []);
          if (current.has(id)) current.delete(id);
          else current.add(id);
          await setSectionSwissMovement(gameId, found.section, {
            ...found.spec,
            stationaryPairs: Array.from(current).sort((a, b) => a - b),
          });
          await globalMutate(swrKeys.sections(gameId));
        },
      }
    : undefined;

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

  async function onChangeStanding(
    seat: string,
    change: StandingChange,
  ): Promise<void> {
    await setParticipantStanding(gameId, seat, change);
    await mutate();
  }

  return (
    <PairsRosterPage
      onBack={onBack}
      roster={roster ?? []}
      isPairs={isPairs}
      isSwiss={isSwiss}
      sectionLabels={sectionLabels}
      stationary={stationary}
      onSaveSubstitution={onSaveSubstitution}
      onSetAbsenceTreatment={onSetAbsenceTreatment}
      onWithdraw={onWithdraw}
      onChangeStanding={onChangeStanding}
      // Reinstating hands a device a fresh token, so it goes through the
      // seat-transfer code flow — the returning pair's device claims a
      // REINSTATE code, which reinstates the pair with that device's token.
      renderReinstatePanel={(seat) => (
        <ChangeDeviceView gameId={gameId} seat={seat} kind="REINSTATE" />
      )}
      // A pair whose device has died can't start "Change device" themselves, so
      // the director mints the same code for them.
      renderMoveDevicePanel={(seat) => (
        <ChangeDeviceView gameId={gameId} seat={seat} byDirector />
      )}
    />
  );
}
