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
  /**
   * Hide the back arrow entirely (root/landing screens, transient play states).
   * By default every page shows a back arrow that pops the navigation stack.
   */
  hideBack?: boolean;
  /**
   * Where the default back behaviour navigates when there is no in-app history.
   * Defaults to `/`. Only used when neither `backAction` nor `backHref` is set.
   */
  backFallbackHref?: string;
  headerRight?: React.ReactNode;
  /**
   * Optional content pinned directly beneath the header, above the scrollable
   * body (e.g. section pills that should stay visible while the body scrolls).
   */
  subHeader?: React.ReactNode;
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
  hideBack,
  backFallbackHref,
  headerRight,
  subHeader,
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
        hideBack={hideBack}
        backFallbackHref={backFallbackHref}
        headerRight={headerRight}
      />

      {/* Optional pinned sub-header (stays put while the body scrolls) */}
      {subHeader && <div className="shrink-0">{subHeader}</div>}

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
