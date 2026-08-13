import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface PageLayoutProps {
  /** Primary header text (e.g., event name, "Manage Games", "Settings") */
  headerTitle?: string;
  /** Secondary line below the title (e.g., session/section info, participant) */
  headerSubtitle?: string;
  /** Right-aligned content in the header (e.g., "Pair 3") */
  headerRight?: React.ReactNode;
  /** URL to navigate to when back arrow is tapped. Omit to hide back arrow. */
  backHref?: string;
  /** Additional sub-header element rendered below the grey bar (e.g., blue detail bar) */
  subHeader?: React.ReactNode;
  /** Fixed-bottom action buttons. Omit to hide the action bar. */
  actions?: React.ReactNode;
  /** When true, content area centres children vertically and horizontally (for menu-only pages). */
  centerContent?: boolean;
  /** Page content */
  children: React.ReactNode;
}

export function PageLayout2({
  headerTitle,
  headerSubtitle,
  headerRight,
  backHref,
  subHeader,
  actions,
  centerContent = false,
  children,
}: PageLayoutProps) {
  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header Bar */}
      {headerTitle && (
        <div className="shrink-0">
          <div className="bg-gray-200 text-gray-800 px-3 py-2 flex items-center gap-2">
            {backHref && (
              <Link
                href={backHref}
                className="p-2 -ml-2 rounded-lg hover:bg-gray-300 transition"
                aria-label="Go back"
              >
                <ArrowLeft size={20} />
              </Link>
            )}
            <div className="flex-1 flex items-start justify-between min-w-0">
              <div className="truncate">
                <div className="font-semibold">{headerTitle}</div>
                {headerSubtitle && (
                  <div className="text-sm text-gray-600">{headerSubtitle}</div>
                )}
              </div>
              {headerRight && (
                <span className="font-semibold whitespace-nowrap ml-2">
                  {headerRight}
                </span>
              )}
            </div>
          </div>

          {/* Sub-header (e.g., blue detail bar) */}
          {subHeader}
        </div>
      )}

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
