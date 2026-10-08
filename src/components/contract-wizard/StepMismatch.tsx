"use client";

import { useState } from "react";
import {
  MismatchSide,
  MismatchDirection,
  MismatchFault,
} from "@/model/swiss-mismatch";

type Props = {
  /**
   * Whether this is a teams game, so the side labels read "team" rather than
   * "pair". Either way the sides are home-relative: NS = this table / home
   * team, EW = the opponents.
   */
  teams?: boolean;
  onSubmit: (ruling: {
    side: MismatchSide;
    direction: MismatchDirection;
    fault: MismatchFault;
  }) => void;
};

/**
 * The §3.5 Swiss mismatch ruling. A mismatch is when a contestant was drawn
 * against the wrong opponents; only ONE side is adjusted, and only its VP (the
 * opponent is untouched, and the result of the match itself stands).
 *
 * The director declares the mismatched side, then the §3.5.2 treatment — which
 * depends on whether the actual opponent was HIGHER- or LOWER-ranked than the
 * correct opponent, and whose fault the mismatch was:
 *
 * - higher opponent, not their fault → `5 + ¾ × actual` (compensated up);
 * - lower opponent, their own fault  → `actual − ¼ × (actual − 5)` (docked);
 * - the other two combinations leave the VP unchanged (recorded for the audit
 *   trail, but no adjustment).
 */

type Treatment = {
  direction: MismatchDirection;
  fault: MismatchFault;
  title: string;
  detail: string;
};

const TREATMENTS: Treatment[] = [
  {
    direction: "HIGHER",
    fault: "NOT",
    title: "Stronger opponent — not their fault",
    detail: "Compensated up: 5 + ¾ × actual VP",
  },
  {
    direction: "LOWER",
    fault: "OWN",
    title: "Weaker opponent — their own fault",
    detail: "Docked: actual − ¼ of the VP above 5",
  },
  {
    direction: "HIGHER",
    fault: "OWN",
    title: "Stronger opponent — their own fault",
    detail: "No VP change (keeps the actual score)",
  },
  {
    direction: "LOWER",
    fault: "NOT",
    title: "Weaker opponent — not their fault",
    detail: "No VP change (keeps the actual score)",
  },
];

export function StepMismatch({ teams = false, onSubmit }: Props) {
  const [side, setSide] = useState<MismatchSide | null>(null);

  const thisLabel = teams ? "This team (NS)" : "This table (NS)";
  const oppLabel = "Opponents (EW)";

  if (side === null) {
    return (
      <div className="flex-1 flex flex-col p-4 min-h-0">
        <p className="text-sm text-gray-600 text-center mb-4">
          Mark this match a mismatch (§3.5). Which side was drawn against the
          wrong opponents? Only that side&apos;s VP is adjusted.
        </p>
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => setSide("NS")}
            className="py-4 px-4 rounded-xl text-left border-2 border-gray-200 bg-white hover:bg-gray-50 active:scale-[0.98] transition text-base font-semibold text-gray-900"
          >
            {thisLabel}
          </button>
          <button
            type="button"
            onClick={() => setSide("EW")}
            className="py-4 px-4 rounded-xl text-left border-2 border-gray-200 bg-white hover:bg-gray-50 active:scale-[0.98] transition text-base font-semibold text-gray-900"
          >
            {oppLabel}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-4 min-h-0">
      <p className="text-sm text-gray-600 text-center mb-4">
        Mismatched side: <span className="font-semibold">{side === "NS" ? thisLabel : oppLabel}</span>. How
        does §3.5.2 adjust its VP?
      </p>
      <div className="flex flex-col gap-3">
        {TREATMENTS.map((t) => (
          <button
            key={`${t.direction}:${t.fault}`}
            type="button"
            onClick={() => onSubmit({ side, direction: t.direction, fault: t.fault })}
            className="py-4 px-4 rounded-xl text-left border-2 border-gray-200 bg-white hover:bg-gray-50 active:scale-[0.98] transition"
          >
            <span className="block text-base font-semibold text-gray-900">
              {t.title}
            </span>
            <span className="block text-sm text-gray-600">{t.detail}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
