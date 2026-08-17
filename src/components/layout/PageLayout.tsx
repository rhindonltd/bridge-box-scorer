import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { HeaderBar } from "./HeaderBar";

interface PageLayoutProps {
  /** Primary header text (e.g., event name, "Manage Games", "Settings") */
  headerTitle: string;
  /** Secondary line below the title (e.g., session/section info, participant) */
  headerSubtitle?: string;
  /** Right-aligned content in the header (e.g., "Pair 3") */
  headerRight?: React.ReactNode;
  /** URL to navigate to when back arrow is tapped. Omit to hide back arrow. */
  backHref?: string;
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
        headerSubtitle={headerSubtitle}
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
