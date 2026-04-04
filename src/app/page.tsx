"use client";

import { useRouter } from "next/navigation";

import { MainMenuPage } from "@/components/pages/mainmenu/MainMenuPage";

export default function PlayerLobbyPage() {
  const router = useRouter();

  function createNewGame() {
    router.push("/create");
  }

  function joinGame() {
    router.push("/game/join");
  }

  function managePastGames() {
    router.push("/manage");
  }

  function openSettings() {
    router.push("/settings/wifi");
  }

  return (
    <div style={{ margin: "0 auto" }}>
      <MainMenuPage
        onCreateNewGame={createNewGame}
        onJoinGame={joinGame}
        onManagePastGames={managePastGames}
        onOpenSettings={openSettings}
      />
    </div>
  );
}
