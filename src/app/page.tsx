"use client";

import { useRouter } from "next/navigation";

import { MainMenuPage } from "@/components/pages/mainmenu/MainMenuPage";

export default function MainMenu() {
  const router = useRouter();

  function createNewGame() {
    router.push("/create");
  }

  function joinGame() {
    router.push("/join");
  }

  function managePastGames() {
    router.push("/manage");
  }

  function roomDisplay() {
    router.push("/display");
  }

  function openSettings() {
    router.push("/settings");
  }

  return (
    <MainMenuPage
      onCreateNewGame={createNewGame}
      onJoinGame={joinGame}
      onManagePastGames={managePastGames}
      onRoomDisplay={roomDisplay}
      onOpenSettings={openSettings}
    />
  );
}
