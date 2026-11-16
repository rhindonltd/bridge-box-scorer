"use client";

import { useBackNavigation } from "@/hooks/useBackNavigation";
import useSWR from "swr";
import { TeamsRosterPage } from "@/app/game/[gameId]/manage/teams/TeamsRosterPage";
import { unwrapFetcher } from "@/lib/fetcher";
import {
  setParticipantStanding,
  type StandingChange,
} from "@/lib/standing-service";
import { ChangeDeviceView } from "@/app/game/[gameId]/play/[initialSeat]/ChangeDeviceView";
import { swrKeys } from "@/swr/swr-keys";
import { useSections } from "@/hooks/sections";
import { useSocketRevalidate } from "@/hooks/use-socket-revalidate";
import { SocketEvents } from "@/socket/socket-events";
import { FullScreenSpinner } from "@/components/common/Spinner";
import type { TeamRosterEntry } from "@/db/games/queries/find-teams-roster";

/**
 * Container for the director's "Teams" roster: loads every team's standing and
 * wires the standing change. The roster is an HTTP resource, but other devices
 * change it (a substitute joining a team, a late team seating), and those push
 * PARTICIPANTS, so it re-reads on them (and on reconnect) to never show a stale
 * status.
 */
export function TeamsRoster({ gameId }: { gameId: string }) {
  // Pop back to the menu rather than pushing it again: a push would add a
  // second menu entry, and the browser back button would then loop between the
  // menu and this screen.
  const { onBack } = useBackNavigation(`/game/${gameId}/manage`);
  const rosterKey = swrKeys.teamsRoster(gameId);

  const {
    data: roster,
    isLoading,
    mutate,
  } = useSWR<TeamRosterEntry[]>(
    rosterKey,
    unwrapFetcher<TeamRosterEntry[]>("roster"),
  );

  const { sections } = useSections(gameId);
  const sectionLabels = Object.fromEntries(
    sections.map((s) => [s.section, s.label]),
  );

  useSocketRevalidate(rosterKey, [SocketEvents.PARTICIPANTS], [rosterKey]);

  if (isLoading) {
    return <FullScreenSpinner />;
  }

  async function onChangeStanding(
    seat: string,
    change: StandingChange,
  ): Promise<void> {
    await setParticipantStanding(gameId, seat, change);
    await mutate();
  }

  return (
    <TeamsRosterPage
      onBack={onBack}
      roster={roster ?? []}
      sectionLabels={sectionLabels}
      onChangeStanding={onChangeStanding}
      // A pair whose device has died can't start "Change device" themselves, so
      // the director mints the same code for them.
      renderMoveDevicePanel={(seat) => (
        <ChangeDeviceView gameId={gameId} seat={seat} byDirector />
      )}
    />
  );
}
