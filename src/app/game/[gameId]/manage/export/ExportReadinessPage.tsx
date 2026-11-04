"use client";

import { ReactNode, useId, useState } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  ChevronDown,
} from "lucide-react";
import { GamePageLayout } from "@/components/layout/GamePageLayout";

/**
 * How ready a single prerequisite is:
 *  - `ready`   — satisfied (green tick);
 *  - `blocker` — stops the core USEBIO file being generated (red);
 *  - `warning` — the file can be made, but some results are still outstanding
 *    so publishing now would be incomplete (amber);
 *  - `info`    — an optional publisher is not configured, so only that upload
 *    is unavailable (neutral).
 */
export type ReadinessLevel = "ready" | "blocker" | "warning" | "info";

/** One card in an item's optional detail sub-list (e.g. an outstanding board). */
export interface ReadinessSubItem {
  id: string;
  /** Card title, e.g. "Round 3 · Table 2 · Board 7". */
  title: string;
  /** Who is seated, e.g. "Alice Smith & Bob Jones vs Carol May & Dan Fox". */
  players: string;
}

export interface ReadinessItem {
  /** Stable key for list rendering. */
  id: string;
  /** Short label, e.g. "Results entered". */
  title: string;
  /** One-line detail, e.g. "3 of 24 boards still need a result". */
  detail: string;
  level: ReadinessLevel;
  /**
   * An optional breakdown shown beneath the item — e.g. the specific
   * outstanding boards when few enough to list. Omitted when there is nothing
   * to break down (or too many to be useful).
   */
  boards?: ReadinessSubItem[];
}

export interface ExportReadinessPageProps {
  /** Header right-hand content — the play⇄manage switch on a director device. */
  headerRight?: ReactNode;
  /** Back to the main manage menu. */
  onBack: () => void;
  /** Continue to the export / publish options. */
  onContinue: () => void;
  items: ReadinessItem[];
}

const ICON_BY_LEVEL: Record<ReadinessLevel, ReactNode> = {
  ready: <CheckCircle2 className="h-5 w-5 text-green-600" aria-hidden />,
  blocker: <XCircle className="h-5 w-5 text-red-600" aria-hidden />,
  warning: <AlertTriangle className="h-5 w-5 text-amber-600" aria-hidden />,
  info: <Info className="h-5 w-5 text-gray-400" aria-hidden />,
};

const STATUS_WORD: Record<ReadinessLevel, string> = {
  ready: "Ready",
  blocker: "Not ready",
  warning: "Warning",
  info: "Optional",
};

/**
 * The export "readiness" screen shown when the director opens Export & Publish.
 * It lists what is (and isn't) in place for generating the results files —
 * outstanding results, club information, and the optional BridgeWebs / EBU
 * publishers — so a director can see at a glance why an export might be
 * unavailable or incomplete before continuing to the options.
 *
 * It never blocks: the director can always continue (e.g. to download a PBN,
 * which needs no results), and the options screen still gates each individual
 * action. This page only explains the state.
 */
export function ExportReadinessPage({
  headerRight,
  onBack,
  onContinue,
  items,
}: ExportReadinessPageProps) {
  // Whether any hard blocker is present — used only to colour the summary line;
  // the Continue button is always enabled.
  const hasBlocker = items.some((i) => i.level === "blocker");
  const hasWarning = items.some((i) => i.level === "warning");

  const summary = hasBlocker
    ? "Some results files can't be generated yet."
    : hasWarning
      ? "You can export now, but some results are still outstanding."
      : "Everything is ready to export.";

  return (
    <GamePageLayout
      headerTitle="Export & Publish"
      contentMode="scroll"
      backAction={onBack}
      headerRight={headerRight}
      actions={
        <button
          type="button"
          onClick={onContinue}
          className="w-full py-3.5 text-lg font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          Continue to Export Options
        </button>
      }
    >
      <div className="flex flex-col gap-4 px-6 pb-8 pt-6 max-w-sm w-full mx-auto">
        <p
          className={`text-sm font-medium ${
            hasBlocker
              ? "text-red-700"
              : hasWarning
                ? "text-amber-700"
                : "text-green-700"
          }`}
        >
          {summary}
        </p>

        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <ReadinessRow key={item.id} item={item} />
          ))}
        </ul>
      </div>
    </GamePageLayout>
  );
}

/**
 * One checklist row. A row whose item carries a `boards` breakdown is an
 * expand/collapse toggle (collapsed by default) — the director taps it to
 * reveal the specific boards; a row with no breakdown is a plain, static entry.
 */
function ReadinessRow({ item }: { item: ReadinessItem }) {
  const [expanded, setExpanded] = useState(false);
  const detailsId = useId();

  const hasBreakdown = !!item.boards && item.boards.length > 0;

  const body = (
    <>
      <span className="mt-0.5 shrink-0">{ICON_BY_LEVEL[item.level]}</span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-sm font-semibold text-gray-800">
          {item.title}
          <span className="sr-only">— {STATUS_WORD[item.level]}</span>
        </p>
        <p className="text-sm text-gray-600">{item.detail}</p>

        {hasBreakdown && !expanded && (
          <p className="mt-1 text-xs font-medium text-blue-600">
            Tap to see which
          </p>
        )}

        {hasBreakdown && expanded && (
          <ul
            id={detailsId}
            className="mt-2 flex flex-col gap-2 border-t border-gray-100 pt-2"
          >
            {item.boards!.map((b) => (
              <li
                key={b.id}
                className="rounded-lg bg-gray-50 px-3 py-2 break-words"
              >
                <p className="text-sm font-semibold text-gray-800">
                  {b.title}
                </p>
                <p className="text-sm text-gray-600">{b.players}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {hasBreakdown && (
        <ChevronDown
          className={`mt-0.5 h-5 w-5 shrink-0 text-gray-400 transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
          aria-hidden
        />
      )}
    </>
  );

  if (!hasBreakdown) {
    return (
      <li className="flex items-start gap-3 rounded-xl border border-gray-200 p-3">
        {body}
      </li>
    );
  }

  return (
    <li>
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        aria-controls={expanded ? detailsId : undefined}
        className="flex w-full items-start gap-3 rounded-xl border border-gray-200 p-3 text-left transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        {body}
      </button>
    </li>
  );
}
