"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useRequiredGame } from "@/context/GameContext";
import { SelectSeatPage } from "@/app/game/[gameId]/join/SelectSeatPage";
import { getPlayerToken, clearPlayerToken } from "@/lib/player-token";
import { verifySeatHeld } from "@/lib/game-service";
import { FullScreenSpinner } from "@/components/common/Spinner";

type JoinState = "checking" | "pick";

export default function JoinGameAsPlayer() {
  const { game } = useRequiredGame();
  const router = useRouter();

  // If this device already holds a seat in this game (a player token was stored
  // when it seated), rejoining from the main menu should go straight back to
  // that seat's play screen — which shows the "waiting for the director to
  // start" state pre-start — rather than asking the player to pick a seat
  // again.
  //
  // The stored seat can be STALE, though: the director may have evicted the
  // pair, or the seat may have been re-seated on another device. So we first
  // verify with the server that this device still holds the seat. If it does,
  // redirect; if not, clear the dead token and fall through to seat selection.
  // Until that check resolves we show a spinner (starting from "checking" only
  // when a token exists, so a fresh device skips straight to the picker).
  const [state, setState] = useState<JoinState>(() =>
    getPlayerToken(game.gameId) ? "checking" : "pick",
  );

  useEffect(() => {
    if (state !== "checking") return;

    // The "checking" state is only entered when a token exists (see the lazy
    // initialiser above), so a token is present here.
    const stored = getPlayerToken(game.gameId);
    if (!stored) return;

    let cancelled = false;
    void verifySeatHeld(game.gameId, stored.startingPosition).then((held) => {
      if (cancelled) return;
      if (held) {
        router.replace(
          `/game/${game.gameId}/play/${stored.startingPosition}`,
        );
      } else {
        // The seat is no longer ours — drop the dead token and let the player
        // pick a seat again.
        clearPlayerToken(game.gameId);
        setState("pick");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [state, game.gameId, router]);

  if (state === "checking") {
    return <FullScreenSpinner />;
  }

  return (
    <SelectSeatPage
      onSeatSelected={(seat) =>
        router.replace(`/game/${game.gameId}/play/${seat}`)
      }
    />
  );
}
