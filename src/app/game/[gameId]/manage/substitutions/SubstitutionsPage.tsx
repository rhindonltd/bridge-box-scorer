"use client";

import { ReactNode, useState } from "react";
import { GamePageLayout } from "@/components/layout/GamePageLayout";
import { Toggle } from "@/components/common/Toggle";
import { PillToggle } from "@/components/common/PillToggle";
import type {
  SubstitutionSeat,
  SubstitutionOccupant,
} from "@/db/games/queries/find-substitution-seats";
import type { OccupantEligibilityInput } from "@/lib/game-service";

export interface SubstitutionSaveOptions {
  /** Score the seat as two separate lines (true) or one merged line (false). */
  split: boolean;
  /** Per-occupant eligibility for the local ranking. */
  eligibility: OccupantEligibilityInput[];
}

export interface SubstitutionsPageProps {
  /** Header right-hand content — the play⇄manage switch on a director device. */
  headerRight?: ReactNode;
  /** Back to the manage menu. */
  onBack: () => void;
  /** The substituted seats to configure. */
  substitutions: SubstitutionSeat[];
  /**
   * Whether this is a PAIRS game. Gates the split=no NGS/Masterpoint warning:
   * only a pairs event assigns per-pair NGS/Masterpoint credit, so merging two
   * pairs onto one line costs the sub their credit. A teams event credits the
   * team, so the warning does not apply. Defaults to true (pairs).
   */
  isPairs?: boolean;
  /** Persist a seat's split + eligibility choices. Rejects to surface an error. */
  onSave: (seat: string, options: SubstitutionSaveOptions) => Promise<void>;
}

/**
 * The director's "Substitutions" screen: one card per substituted seat (EBU
 * §2.4.7), where the director sets the two choices that define how a shared
 * seat is scored:
 *   - "Split by board?" (per seat) — OFF (default) scores the seat as ONE
 *     continuous line (both pairs' names stitched locally, one anchor-only
 *     USEBIO pair); ON scores each pair as its own line over only its boards.
 *   - "Eligible for local ranking?" (per occupant) — ON (default) ranks the
 *     pair; OFF marks it "without standing" (its results still count for its
 *     opponents, but it is stripped from the ranking / prize export).
 * There is no artificial score (no AVE−/fine): a substitution is just the two
 * eligibility/split choices.
 */
export function SubstitutionsPage({
  headerRight,
  onBack,
  substitutions,
  isPairs = true,
  onSave,
}: SubstitutionsPageProps) {
  return (
    <GamePageLayout
      headerTitle="Substitutions"
      contentMode="scroll"
      backAction={onBack}
      headerRight={headerRight}
    >
      <div className="flex flex-col gap-4 px-6 pb-8 pt-6 max-w-sm w-full mx-auto">
        <p className="text-sm text-gray-600">
          A pair took over a seat part-way through. Choose whether the seat
          scores as one shared line or two, and whether each pair counts in the
          local ranking.
        </p>

        {substitutions.length === 0 ? (
          <p className="text-sm text-gray-500">No substitutions to configure.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {substitutions.map((row) => (
              <SubstitutionCard
                key={row.seat}
                row={row}
                isPairs={isPairs}
                onSave={onSave}
              />
            ))}
          </ul>
        )}
      </div>
    </GamePageLayout>
  );
}

/** "First Last & First Last — N boards" summary line for one occupant. */
function occupantSummary(o: SubstitutionOccupant): string {
  const boards = `${o.boardCount} ${o.boardCount === 1 ? "board" : "boards"}`;
  return `${o.pair} — ${boards}`;
}

function SubstitutionCard({
  row,
  isPairs,
  onSave,
}: {
  row: SubstitutionSeat;
  isPairs: boolean;
  onSave: SubstitutionsPageProps["onSave"];
}) {
  // Pre-fill from the stored seat state.
  const [split, setSplit] = useState(row.split);
  // Eligibility keyed by occupancy id — defaults to each occupant's stored
  // standing (eligible unless already marked without standing).
  const [eligibility, setEligibility] = useState<Record<number, boolean>>(() =>
    Object.fromEntries(row.occupants.map((o) => [o.id, o.eligible])),
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const seatSlug = row.seat.replace(/\W+/g, "-");

  function setOccupantEligible(id: number, eligible: boolean) {
    setEligibility((prev) => ({ ...prev, [id]: eligible }));
    setSaved(false);
  }

  // The MAIN pair (merged-line identity, split=no only): whose name + EBU
  // record represents the one line. Defaults to the stored main pair (the
  // arrival anchor until the director picks otherwise).
  const anchor =
    row.occupants.find((o) => o.isArrivalAnchor) ?? row.occupants[0];
  const [mainId, setMainId] = useState<number>(
    () => (row.occupants.find((o) => o.isMainPair) ?? anchor).id,
  );
  const mainOccupant =
    row.occupants.find((o) => o.id === mainId) ?? anchor;
  // The folded-in "(Sub)" pair on a merged line — the occupant that is NOT the
  // main pair. It reacts live to the Main pair toggle.
  const subOccupant = row.occupants.find((o) => o.id !== mainOccupant.id);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      // For a merged line, both occupants share the MAIN pair's eligibility
      // (they are one contestant); for a split seat, each occupant keeps its
      // own.
      const resolved: OccupantEligibilityInput[] = row.occupants.map((o) => ({
        id: o.id,
        eligible: split ? eligibility[o.id] : eligibility[mainOccupant.id],
      }));
      await onSave(row.seat, {
        split,
        eligibility: resolved,
        // The main-pair choice only applies to a merged (one-line) seat.
        ...(split ? {} : { mainOccupancyId: mainOccupant.id }),
      });
      setSaved(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not save. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <li className="flex flex-col gap-3 rounded-xl border border-gray-200 p-3">
      <div>
        <p className="text-sm font-semibold text-gray-800">{row.seat}</p>
        <p className="text-sm text-gray-600">
          {row.occupants.map((o) => occupantSummary(o)).join("  •  ")}
        </p>
      </div>

      <div className="flex items-center justify-between gap-3">
        <span
          id={`split-label-${seatSlug}`}
          className="text-sm font-medium text-gray-700"
        >
          Split by board?
        </span>
        <Toggle
          value={split}
          onChange={(v) => {
            setSplit(v);
            setSaved(false);
          }}
          offLabel="One line"
          onLabel="Two lines"
          labelledBy={`split-label-${seatSlug}`}
        />
      </div>

      {split ? (
        // Two lines: one eligibility toggle per occupant.
        <div className="flex flex-col gap-2">
          {row.occupants.map((o) => (
            <div
              key={o.id}
              className="flex items-center justify-between gap-3"
            >
              <span
                id={`elig-label-${seatSlug}-${o.id}`}
                className="text-sm font-medium text-gray-700"
              >
                {o.pair} ranked?
              </span>
              <Toggle
                value={eligibility[o.id]}
                onChange={(v) => setOccupantEligible(o.id, v)}
                offLabel="No"
                onLabel="Yes"
                labelledBy={`elig-label-${seatSlug}-${o.id}`}
              />
            </div>
          ))}
        </div>
      ) : (
        // One merged line: pick the MAIN pair (whose name + EBU record is the
        // line), then a single eligibility for the whole shared line.
        <>
          <div className="flex flex-col gap-1">
            <span
              id={`main-label-${seatSlug}`}
              className="text-sm font-medium text-gray-700"
            >
              Main pair
            </span>
            <PillToggle<string>
              name={`main-pair-${seatSlug}`}
              legend={`Main pair for ${row.seat}`}
              options={row.occupants.map((o) => ({
                value: String(o.id),
                label: o.pair,
              }))}
              value={String(mainOccupant.id)}
              onChange={(v) => {
                setMainId(Number(v));
                setSaved(false);
              }}
            />
            <span className="text-xs text-gray-500">
              Whose result and EBU record represent this seat. The other pair
              shows as the stand-in.
            </span>
          </div>

          {/*
           * One shared line costs the sub their NGS / Masterpoint credit — it
           * all lands on the main pair. Only a PAIRS event assigns per-pair
           * NGS/Masterpoint, so this warning is pairs-only; it names the live
           * main / sub pick so it updates as the director toggles.
           */}
          {isPairs && subOccupant && (
            <p
              role="note"
              className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800"
            >
              One shared line: <strong>{subOccupant.pair}</strong> gets no
              NGS/Masterpoint credit — it all goes to{" "}
              <strong>{mainOccupant.pair}</strong>.
            </p>
          )}

          <div className="flex items-center justify-between gap-3">
            <span
              id={`elig-label-${seatSlug}-merged`}
              className="text-sm font-medium text-gray-700"
            >
              Eligible for local ranking?
            </span>
            <Toggle
              value={eligibility[mainOccupant.id]}
              onChange={(v) => setOccupantEligible(mainOccupant.id, v)}
              offLabel="No"
              onLabel="Yes"
              labelledBy={`elig-label-${seatSlug}-merged`}
            />
          </div>
        </>
      )}

      {error && (
        <p role="alert" className="text-sm font-medium text-red-600">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={() => void handleSave()}
        disabled={saving}
        className="w-full rounded-lg border border-blue-600 bg-blue-600 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:border-gray-300 disabled:bg-gray-300"
      >
        {saving ? "Saving..." : saved ? "Saved" : "Save"}
      </button>
    </li>
  );
}
