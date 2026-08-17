"use client";

import { useGame } from "@/context/GameContext";
import { HeaderBar } from "./HeaderBar";

type Props = {
  headerTitle: string;
};

export function GameHeaderBar({ headerTitle }: Props) {
  const { game } = useGame();

  if (!game) return null;

  function headerSubtitle2(): string {
    let subTitle: string = "";
    if (game!.sessionName) {
      subTitle = `Session ${game!.sessionName}`;
      if (game!.sectionName) {
        subTitle = subTitle + `, Section ${game!.sectionName}`;
      }
    } else if (game!.sectionName) {
      subTitle = `Section ${game!.sectionName}`;
    }
    return subTitle;
  }

  return (
    <HeaderBar
      headerTitle={headerTitle}
      headerSubtitle={game.eventName}
      headerSubtitle2={headerSubtitle2()}
    />
  );
}
