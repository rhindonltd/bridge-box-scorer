"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useRequiredGame } from "@/context/GameContext";
import { SelectSeatPage } from "@/app/game/[gameId]/join/SelectSeatPage";
import { getPlayerToken, clearPlayerToken } from "@/lib/player-token";
import { verifySeatHeld } from "@/lib/game-service";
import { FullScreenSpinner } from "@/components/common/Spinner";

// The stored token never changes while this screen is mounted (only this
// component clears it), so there is nothing to subscribe to.
const subscribeNever = () => () => {};

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
  // Until that check resolves we show a spinner.
  // localStorage only exists in the browser, so whether a token is held is read
  // through useSyncExternalStore: the server snapshot is `null` ("unknown"), so
  // the server and the client's first render agree (no hydration mismatch), and
  // the client then switches to the real answer straight away.
  const holdsToken = useSyncExternalStore(
    subscribeNever,
    () => getPlayerToken(game.gameId) !== null,
    () => null,
  );
  // Set once the server says the stored seat is no longer ours.
  const [seatLost, setSeatLost] = useState(false);

  useEffect(() => {
    if (!holdsToken || seatLost) return;
    const stored = getPlayerToken(game.gameId);
    if (!stored) return;
    let cancelled = false;
    void verifySeatHeld(game.gameId, stored.startingPosition).then((held) => {
      if (cancelled) return;
      if (held) {
        router.replace(`/game/${game.gameId}/play/${stored.startingPosition}`);
      } else {
        // The seat is no longer ours — drop the dead token and let the player
        // pick a seat again.
        clearPlayerToken(game.gameId);
        setSeatLost(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [holdsToken, seatLost, game.gameId, router]);

  // Spinner while we don't yet know (server render) or are verifying a held
  // seat; a fresh device (or one whose seat was lost) goes straight to the
  // picker.
  if (holdsToken === null || (holdsToken && !seatLost)) {
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
