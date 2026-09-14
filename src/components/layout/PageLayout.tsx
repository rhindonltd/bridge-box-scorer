import React from "react";
import { HeaderBar } from "./HeaderBar";
import { CenteredContent } from "./CenteredContent";
import { ScrollableContent } from "./ScrollableContent";

interface PageLayoutProps {
  /** Primary header text (e.g., event name, "Manage Games", "Settings") */
  headerTitle: string;
  /** Secondary line below the title (e.g., session/section info, participant) */
  headerSubtitle?: string;
  /** Right-aligned content in the header (e.g., "Pair 3") */
  headerRight?: React.ReactNode;
  /**
   * URL to navigate to when the back arrow is tapped. Takes precedence over the
   * default "pop the stack" behaviour, but not over `backAction`.
   */
  backHref?: string;
  /** Custom back handler. Highest precedence for the back arrow. */
  backAction?: () => void;
  /**
   * Hide the back arrow entirely (root/landing screens, transient states). By
   * default every page shows a back arrow that pops the navigation stack.
   */
  hideBack?: boolean;
  /**
   * Where the default back behaviour navigates when there is no in-app history.
   * Defaults to `/`. Only used when neither `backAction` nor `backHref` is set.
   */
  backFallbackHref?: string;
  /** Fixed-bottom action buttons. Omit to hide the action bar. */
  actions?: React.ReactNode;
  /** When true, content area centres children vertically and horizontally (for menu-only pages). */
  centerContent?: boolean;
  /** Page content */
  children: React.ReactNode;
}

export function PageLayout({
  headerTitle,
  headerSubtitle,
  headerRight,
  backHref,
  backAction,
  hideBack,
  backFallbackHref,
  actions,
  centerContent = false,
  children,
}: PageLayoutProps) {
  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header Bar */}
      <HeaderBar
        headerTitle={headerTitle}
        backHref={backHref}
        backAction={backAction}
        hideBack={hideBack}
        backFallbackHref={backFallbackHref}
        headerSubtitle={headerSubtitle}
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
