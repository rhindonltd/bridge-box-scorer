"use client";

import { usePathname } from "next/navigation";
import { useRequiredGame } from "@/context/GameContext";
import { ManageHeaderSwitch } from "@/components/game/ManageHeaderSwitch";
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
  const pathname = usePathname();

  function headerSubtitle2(): string {
    return game!.sectionName ? `Section ${game!.sectionName}` : "";
  }

  // Every manage screen gets the play⇄manage switch in its header-right slot,
  // so a director can flip back to their table from anywhere in the manage
  // area — not just the menu. The manage routes are all director-gated, so no
  // director check is needed here. A page that sets its own `headerRight` keeps
  // it (the explicit value wins); otherwise, on a manage route, default to the
  // switch. Non-manage game screens (play/display/settings) are unaffected.
  const onManageRoute = /\/game\/[^/]+\/manage(\/|$)/.test(pathname ?? "");
  const resolvedHeaderRight =
    headerRight ??
    (onManageRoute ? <ManageHeaderSwitch gameId={game.gameId} /> : undefined);

  return (
    <HeaderBar
      headerTitle={headerTitle}
      headerSubtitle={game.eventName}
      headerSubtitle2={headerSubtitle2()}
      headerRight={resolvedHeaderRight}
      backHref={backHref}
      backAction={backAction}
      hideBack={hideBack}
      backFallbackHref={backFallbackHref}
    />
  );
}
