import { notFound } from "next/navigation";
import { GameProvider } from "@/context/GameContext";
import { findGameById } from "@/db/game-index/queries/find-game-by-id";
import GameGate from "./GameGate";

export default async function GameLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;

  const game = await findGameById(gameId);

  // No such game (e.g. it was deleted): show the "page not found" screen. This
  // is the right universal answer for every game screen — including a public
  // room display, which has nowhere to be redirected to — and matches the live
  // behaviour when a GAME_DELETED event arrives (GameContext clears the game,
  // and GameGate renders notFound()). The director's Manage list avoids landing
  // here on its back arrow via an explicit backHref, so this isn't a dead end
  // for them either.
  if (!game) {
    notFound();
  }

  return (
    <GameProvider initialGame={game}>
      <GameGate>{children}</GameGate>
    </GameProvider>
  );
}
