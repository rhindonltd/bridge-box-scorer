"use client";

import { useParams, useRouter } from "next/navigation";
import { ShowTablesPage } from "@/app/game/[gameId]/create/ShowTablesPage";
import { StartedGuard } from "@/app/game/[gameId]/manage/StateGuards";

/**
 * "Manage Tables" — the director's mid-game view of the seated tables (used for
 * withdrawals, late arrivals, and stand-in handovers once the game has
 * started). It reuses the setup Tables screen, which already adapts to a
 * started game, but lives on its own route: the setup flow at `/create` is
 * gated to a NOT-started game, so a post-start entry needs a route that is
 * allowed once the game has started (hence StartedGuard). The back arrow
 * returns to the manage menu rather than the setup flow.
 */
export default function ManageTablesRoute() {
  const params = useParams<{ gameId: string }>();
  const router = useRouter();
  const gameId = params.gameId;

  return (
    <StartedGuard gameId={gameId}>
      <ShowTablesPage
        backAction={() => router.push(`/game/${gameId}/manage`)}
      />
    </StartedGuard>
  );
}
