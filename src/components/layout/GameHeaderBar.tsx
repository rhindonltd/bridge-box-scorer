"use client";

import { useRequiredGame } from "@/context/GameContext";
import { HeaderBar } from "./HeaderBar";

type Props = {
  headerTitle: string;
  backAction?: () => void;
  backHref?: string;
  headerRight?: React.ReactNode;
};

export function GameHeaderBar({
  headerTitle,
  backAction,
  backHref,
  headerRight,
}: Props) {
  const { game } = useRequiredGame();

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
      headerRight={headerRight}
      backHref={backHref}
      backAction={backAction}
    />
  );
}
