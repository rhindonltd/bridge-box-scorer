"use client";

import { useRouter } from "next/navigation";

import { MainMenuPage } from "@/app/MainMenuPage";

export default function MainMenu() {
  const router = useRouter();

  function createNewGame() {
    router.push("/create");
  }

  function joinGame() {
    router.push("/join");
  }

  function manageGames() {
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
      onManageGames={manageGames}
      onRoomDisplay={roomDisplay}
      onOpenSettings={openSettings}
    />
  );
}
