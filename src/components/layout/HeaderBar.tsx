"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useBackNavigation } from "@/hooks/useBackNavigation";

type Props = {
  /** Primary header text (e.g., event name, "Manage Games", "Settings") */
  headerTitle: string;
  /**
   * URL to navigate to when the back arrow is tapped. Takes precedence over the
   * default "pop the stack" behaviour, but not over `backAction`.
   */
  backHref?: string;
  /**
   * Custom back handler. Highest precedence — when set, neither `backHref` nor
   * the default behaviour is used.
   */
  backAction?: () => void;
  /**
   * Hide the back arrow entirely. Use for root/landing screens and transient
   * states that have no meaningful "back".
   */
  hideBack?: boolean;
  /**
   * Where the default back behaviour navigates when there is no in-app history
   * to return to. Defaults to `/`. Only used when neither `backAction` nor
   * `backHref` is set.
   */
  backFallbackHref?: string;
  /** Secondary line below the title (e.g., session/section info) */
  headerSubtitle?: string;
  /** Secondary line below the title (e.g., session/section info) */
  headerSubtitle2?: string;
  /** Right-aligned content in the header (e.g., "Pair 3") */
  headerRight?: React.ReactNode;
};

const BACK_BUTTON_CLASS =
  "p-2 -ml-2 rounded-lg hover:bg-gray-300 transition";

export function HeaderBar({
  headerTitle,
  backHref,
  backAction,
  hideBack = false,
  backFallbackHref = "/",
  headerSubtitle,
  headerSubtitle2,
  headerRight,
}: Props) {
  const { onBack } = useBackNavigation(backFallbackHref);

  // Exactly one back control is rendered, with precedence:
  //   backAction  >  backHref  >  default (pop the stack)
  // `hideBack` suppresses only the default; an explicit backAction/backHref
  // still renders (a caller asking for both is contradictory, so the explicit
  // intent wins).
  function renderBack() {
    if (backAction) {
      return (
        <button
          onClick={backAction}
          className={BACK_BUTTON_CLASS}
          aria-label="Go back"
          type="button"
        >
          <ArrowLeft size={20} />
        </button>
      );
    }
    if (backHref) {
      return (
        <Link href={backHref} className={BACK_BUTTON_CLASS} aria-label="Go back">
          <ArrowLeft size={20} />
        </Link>
      );
    }
    if (hideBack) {
      return null;
    }
    return (
      <button
        onClick={onBack}
        className={BACK_BUTTON_CLASS}
        aria-label="Go back"
        type="button"
      >
        <ArrowLeft size={20} />
      </button>
    );
  }

  return (
    <div className="shrink-0">
      <div className="bg-gray-200 text-gray-800 px-3 py-2 flex items-center gap-2">
        {renderBack()}
        <div className="flex-1 flex items-start justify-between min-w-0">
          <div className="truncate">
            <div className="font-semibold">{headerTitle}</div>
            {headerSubtitle && (
              <div className="text-sm text-gray-600">{headerSubtitle}</div>
            )}
            {headerSubtitle2 && (
              <div className="text-sm text-gray-600">{headerSubtitle2}</div>
            )}
          </div>
          {headerRight && (
            <span className="font-semibold whitespace-nowrap ml-2">
              {headerRight}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
