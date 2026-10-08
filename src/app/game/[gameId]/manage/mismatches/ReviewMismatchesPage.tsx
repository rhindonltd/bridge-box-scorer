"use client";

import { useEffect, useState } from "react";
import { GamePageLayout } from "@/components/layout/GamePageLayout";
import { Spinner } from "@/components/common/Spinner";
import { useSections } from "@/hooks/sections";
import { fetchMismatchCandidates } from "@/lib/mismatch-service";
import type { SectionMismatchCandidate } from "@/services/detect-swiss-mismatch-service";
import { emitWithAck } from "@/lib/socket";
import { SocketEvents } from "@/socket/socket-events";
import { getDirectorToken } from "@/lib/director-token";
import type { MismatchFault } from "@/model/swiss-mismatch";

/**
 * Director review screen for EBU §3.5 Swiss mismatch CANDIDATES.
 *
 * Detection (an HTTP GET per section) flags pairs whose committed opponent
 * differs by more than 5 current VP from the opponent the corrected draw would
 * have given after a retroactive score adjustment. Detection is advisory: for
 * each candidate the director decides whether it was that pair's OWN fault (so
 * §3.5.2 adjusts its VP) and applies — or dismisses it (e.g. the pair could
 * legitimately have met any of several alternatives, the §3.5 exception). The
 * apply emits the existing `traveller:markMismatch`, which stamps the ruling
 * and recomputes the mismatched side's round VP.
 */
export function ReviewMismatchesPage({ gameId }: { gameId: string }) {
  const { sections, isLoading: sectionsLoading } = useSections(gameId);

  const [candidates, setCandidates] = useState<SectionMismatchCandidate[] | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Candidates the director has acted on (applied or dismissed), keyed so the
  // row drops out of the list without a full refetch.
  const [resolved, setResolved] = useState<Set<string>>(new Set());
  const [applying, setApplying] = useState<string | null>(null);

  // Include the board: a team can be a candidate in two of a triple's three
  // comparisons in one round (each a distinct 10-VP match on its own board set),
  // so the board number is what makes those rows distinct and independently
  // resolvable.
  const candidateKey = (c: SectionMismatchCandidate) =>
    `${c.section}:${c.roundNumber}:${c.mismatchedId}:${c.boardNumber}`;

  // Fetch candidates for every section once the section list is known. The
  // async work lives inside the effect (behind an `active` guard for cleanup)
  // so no state is set synchronously during the effect body.
  const sectionLetters = sections.map((s) => s.section).join(",");
  useEffect(() => {
    if (sectionsLoading || sections.length === 0) return;
    let active = true;
    void (async () => {
      try {
        const perSection = await Promise.all(
          sections.map((s) => fetchMismatchCandidates(gameId, s.section)),
        );
        if (!active) return;
        setCandidates(perSection.flat());
      } catch (err) {
        if (!active) return;
        setError(
          err instanceof Error ? err.message : "Failed to load mismatches",
        );
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
    // `sectionLetters` is the stable identity of the section set.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, sectionsLoading, sectionLetters]);

  async function apply(c: SectionMismatchCandidate, fault: MismatchFault) {
    const key = candidateKey(c);
    setApplying(key);
    setError(null);
    try {
      await emitWithAck(SocketEvents.MISMATCH_TRAVELLER, {
        gameId,
        directorToken: getDirectorToken(gameId),
        boardNumber: c.boardNumber,
        roundNumber: c.roundNumber,
        tableNumber: c.tableNumber,
        side: c.side,
        direction: c.direction,
        fault,
      });
      setResolved((prev) => new Set(prev).add(key));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to apply ruling");
    } finally {
      setApplying(null);
    }
  }

  function dismiss(c: SectionMismatchCandidate) {
    setResolved((prev) => new Set(prev).add(candidateKey(c)));
  }

  const visible = (candidates ?? []).filter(
    (c) => !resolved.has(candidateKey(c)),
  );

  return (
    <GamePageLayout headerTitle="Review Mismatches" centerContent>
      <div className="flex flex-col gap-4 px-6 pb-8 pt-6 max-w-xl w-full mx-auto">
        {error && (
          <div className="bg-red-100 text-red-700 px-4 py-2 rounded text-sm text-center">
            {error}
          </div>
        )}

        {(loading || sectionsLoading) && (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        )}

        {!loading && !sectionsLoading && visible.length === 0 && (
          <p className="text-center text-gray-600 py-8">
            No mismatches to review. A §3.5 mismatch is flagged when a
            retroactive score adjustment means a pair played opponents more than
            5 VP away from the ones the corrected draw would have given.
          </p>
        )}

        {visible.map((c) => (
          <MismatchCard
            key={candidateKey(c)}
            candidate={c}
            applying={applying === candidateKey(c)}
            onApply={(fault) => apply(c, fault)}
            onDismiss={() => dismiss(c)}
          />
        ))}
      </div>
    </GamePageLayout>
  );
}

function MismatchCard({
  candidate: c,
  applying,
  onApply,
  onDismiss,
}: {
  candidate: SectionMismatchCandidate;
  applying: boolean;
  onApply: (fault: MismatchFault) => void;
  onDismiss: () => void;
}) {
  const strongerOrWeaker = c.direction === "HIGHER" ? "stronger" : "weaker";
  const noun = c.participantKind === "TEAM" ? "Team" : "Pair";
  const nounLower = c.participantKind === "TEAM" ? "team" : "pair";
  const nounPlural = c.participantKind === "TEAM" ? "teams" : "pairs";

  return (
    <div className="border-2 border-gray-200 rounded-xl p-4 flex flex-col gap-3">
      <div className="text-sm text-gray-900">
        <span className="font-semibold">
          Section {c.section}, round {c.roundNumber}, table {c.tableNumber}
        </span>
      </div>
      <div className="text-sm text-gray-700">
        {noun} {c.mismatchedId} played {nounLower} {c.actualOpponent} (
        {c.actualOpponentVp} VP) but the corrected draw gives {nounLower}{" "}
        {c.correctOpponent} ({c.correctOpponentVp} VP) — a {strongerOrWeaker}{" "}
        opponent by {Math.abs(c.actualOpponentVp - c.correctOpponentVp)} VP.
      </div>

      <div className="text-xs text-gray-500">
        Apply the §3.5.2 adjustment only if this was a genuine mismatch. If{" "}
        {nounLower} {c.mismatchedId} could legitimately have been drawn against
        several {nounPlural}, dismiss it (not a mismatch).
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={applying}
          onClick={() => onApply("NOT")}
          className="flex-1 min-w-[9rem] py-2.5 rounded-lg text-sm font-semibold border-2 border-sky-300 bg-sky-50 text-sky-800 hover:bg-sky-100 active:scale-[0.98] transition disabled:opacity-50"
        >
          Apply — not their fault
        </button>
        <button
          type="button"
          disabled={applying}
          onClick={() => onApply("OWN")}
          className="flex-1 min-w-[9rem] py-2.5 rounded-lg text-sm font-semibold border-2 border-sky-300 bg-sky-50 text-sky-800 hover:bg-sky-100 active:scale-[0.98] transition disabled:opacity-50"
        >
          Apply — their own fault
        </button>
        <button
          type="button"
          disabled={applying}
          onClick={onDismiss}
          className="py-2.5 px-4 rounded-lg text-sm font-semibold border-2 border-gray-200 bg-white text-gray-700 hover:bg-gray-50 active:scale-[0.98] transition disabled:opacity-50"
        >
          Not a mismatch
        </button>
      </div>
    </div>
  );
}
