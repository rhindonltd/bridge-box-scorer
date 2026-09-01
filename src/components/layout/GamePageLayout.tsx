"use client";

import React from "react";

import { GameHeaderBar } from "./GameHeaderBar";
import { ScrollableContent } from "./ScrollableContent";
import { CenteredContent } from "./CenteredContent";

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

      {centerContent ? (
        <CenteredContent>{children}</CenteredContent>
      ) : (
        <ScrollableContent>{children}</ScrollableContent>
      )}

      {/* Action Bar */}
      {actions && <div className="shrink-0 p-2">{actions}</div>}
    </div>
  );
}
