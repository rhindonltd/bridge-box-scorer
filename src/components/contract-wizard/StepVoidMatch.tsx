"use client";

import { VoidCause } from "@/model/teams-match-void";

type Props = {
  onSubmit: (cause: VoidCause) => void;
  /** Board-comparison teams (BAM/PAB): the void sets boards won, not VP. */
  boardComparison?: boolean;
};

/**
 * The §3.3.6 / §3.3.9 void-match scoring choice for a teams match that cannot
 * stand. Two groups, expressed relative to the table in front of the director
 * (NS vs EW):
 *
 * - Incorrect seating / whole match void (§3.3.6.1) — a flat per-team VP:
 *   `SEATING_STANDARD` → both 40%; `SEATING_TD` → both 60% (TD at fault).
 * - Less than half could be played (§3.3.9) — AVE+/AVE− on half the boards by
 *   who offended: `SHORT_OFFENDER_NS` / `SHORT_OFFENDER_EW` / `SHORT_BOTH`
 *   (both AVE−) / `SHORT_NEITHER` (both AVE+).
 *
 * Each option commits immediately on tap.
 */

type Option = { cause: VoidCause; title: string; detail: string };

const SEATING: Option[] = [
  {
    cause: "SEATING_STANDARD",
    title: "Incorrect seating / cannot replay",
    detail: "§3.3.6.1 — 40% to both teams",
  },
  {
    cause: "SEATING_TD",
    title: "Incorrect seating — TD at fault",
    detail: "§3.3.6.1 converse — 60% to both teams",
  },
];

const SHORT: Option[] = [
  {
    cause: "SHORT_OFFENDER_EW",
    title: "Opponents (EW) at fault",
    detail: "§3.3.9 — AVE+ to this table, AVE− to opponents",
  },
  {
    cause: "SHORT_OFFENDER_NS",
    title: "This table (NS) at fault",
    detail: "§3.3.9 — AVE− to this table, AVE+ to opponents",
  },
  {
    cause: "SHORT_NEITHER",
    title: "Neither side at fault",
    detail: "§3.3.9 — AVE+ to both",
  },
  {
    cause: "SHORT_BOTH",
    title: "Both sides at fault",
    detail: "§3.3.9 — AVE− to both",
  },
];

function OptionButton({
  opt,
  onSubmit,
}: {
  opt: Option;
  onSubmit: (cause: VoidCause) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSubmit(opt.cause)}
      className="py-3 px-4 rounded-xl text-left border-2 border-gray-200 bg-white hover:bg-gray-50 active:scale-[0.98] transition"
    >
      <span className="block text-base font-semibold text-gray-900">
        {opt.title}
      </span>
      <span className="block text-sm text-gray-600">{opt.detail}</span>
    </button>
  );
}

export function StepVoidMatch({ onSubmit, boardComparison = false }: Props) {
  const currency = boardComparison ? "boards won" : "Victory Points";
  return (
    <div className="flex-1 flex flex-col p-4 min-h-0 overflow-y-auto">
      <p className="text-sm text-gray-600 text-center mb-4">
        Void this whole match. Choose why — this sets each team&apos;s {currency}{" "}
        for the round.
      </p>

      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
        Whole match void (seating)
      </p>
      <div className="flex flex-col gap-2 mb-5">
        {SEATING.map((opt) => (
          <OptionButton key={opt.cause} opt={opt} onSubmit={onSubmit} />
        ))}
      </div>

      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
        Less than half played
      </p>
      <div className="flex flex-col gap-2">
        {SHORT.map((opt) => (
          <OptionButton key={opt.cause} opt={opt} onSubmit={onSubmit} />
        ))}
      </div>
    </div>
  );
}
