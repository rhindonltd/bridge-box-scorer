import React from "react";

import { GameHeaderBar } from "./GameHeaderBar";

interface Props {
  /** Primary header text (e.g., event name, "Manage Games", "Settings") */
  headerTitle: string;
  backAction?: () => void;
  backHref?: string;
  headerRight?: React.ReactNode;
  /** Fixed-bottom action buttons. Omit to hide the action bar. */
  actions?: React.ReactNode;
  /** When true, content area centres children vertically and horizontally (for menu-only pages). */
  centerContent?: boolean;
  /** Page content */
  children: React.ReactNode;
}

export function GamePageLayout({
  headerTitle,
  backAction,
  backHref,
  headerRight,
  actions,
  centerContent = false,
  children,
}: Props) {
  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header Bar */}
      <GameHeaderBar
        headerTitle={headerTitle}
        backAction={backAction}
        backHref={backHref}
        headerRight={headerRight}
      />

      {/* Content Area */}
      <div
        className={`flex-1 min-h-0 ${centerContent ? "flex flex-col items-center justify-center" : "overflow-y-auto"}`}
      >
        {children}
      </div>

      {/* Action Bar */}
      {actions && <div className="shrink-0 p-2">{actions}</div>}
    </div>
  );
}
