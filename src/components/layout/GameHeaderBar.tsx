"use client";

import { useRequiredGame } from "@/context/GameContext";
import { HeaderBar } from "./HeaderBar";

type Props = {
  headerTitle: string;
  backAction?: () => void;
  backHref?: string;
  hideBack?: boolean;
  backFallbackHref?: string;
  headerRight?: React.ReactNode;
};

export function GameHeaderBar({
  headerTitle,
  backAction,
  backHref,
  hideBack,
  backFallbackHref,
  headerRight,
}: Props) {
  const { game } = useRequiredGame();

  function headerSubtitle2(): string {
    return game!.sectionName ? `Section ${game!.sectionName}` : "";
  }

  return (
    <HeaderBar
      headerTitle={headerTitle}
      headerSubtitle={game.eventName}
      headerSubtitle2={headerSubtitle2()}
      headerRight={headerRight}
      backHref={backHref}
      backAction={backAction}
      hideBack={hideBack}
      backFallbackHref={backFallbackHref}
    />
  );
}
