"use client";

import React from "react";

import { GameHeaderBar } from "./GameHeaderBar";
import { ScrollableContent } from "./ScrollableContent";
import { CenteredContent } from "./CenteredContent";
import { FillContent } from "./FillContent";

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
  /**
   * How the content area lays out its children:
   * - `"scroll"` (default): a scrollable region with a "more below" fade.
   * - `"center"`: children centred vertically and horizontally (menu pages).
   * - `"fill"`: a bare growing flex column with no scroll wrapper and no
   *   padding, for full-height self-sizing flows (e.g. the contract wizard);
   *   children own their own `flex-1`/`min-h-0`.
   */
  contentMode?: "scroll" | "center" | "fill";
  /**
   * @deprecated Use `contentMode="center"`. When true, maps to
   * `contentMode="center"` (kept for existing callers).
   */
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
  contentMode,
  centerContent = false,
  children,
}: Props) {
  // `centerContent` is the legacy boolean; `contentMode` supersedes it. When
  // neither is set we default to "scroll".
  const mode = contentMode ?? (centerContent ? "center" : "scroll");

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

      {mode === "center" ? (
        <CenteredContent>{children}</CenteredContent>
      ) : mode === "fill" ? (
        <FillContent>{children}</FillContent>
      ) : (
        <ScrollableContent>{children}</ScrollableContent>
      )}

      {/* Action Bar */}
      {actions && <div className="shrink-0 p-2">{actions}</div>}
    </div>
  );
}
