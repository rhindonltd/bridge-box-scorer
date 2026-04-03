"use client";

import { MainMenuPage } from "../components/pages/mainmenu/MainMenuPage";

export default function PlayerLobbyPage() {
  function createNewGame() {}

  function joinGame() {}

  function managePastGames() {}

  function openSettings() {}

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
