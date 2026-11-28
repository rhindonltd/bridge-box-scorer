"use client";

import { useState, type ReactNode } from "react";
import { StepperInput } from "@/components/common/StepperInput";
import { OddRoundOptionInfo } from "./OddRoundOptionInfo";
import type {
  SwissTeamsMovementSpec,
  SwissTeamsOddRound,
} from "@/model/selected-movement";

/** A per-round plan entry as the UI tracks it (group ids are derived on confirm). */
type RoundKind = "BYE" | "SHORT" | "LONG";

/** Each plan choice's column heading, also naming its radio for a round. */
const KIND_LABEL: Record<RoundKind, string> = {
  BYE: "Bye",
  SHORT: "Short",
  LONG: "Long",
};

/** What each plan choice means, shown from the info button on its heading. */
const KIND_INFO: Record<RoundKind, ReactNode> = {
  BYE: (
    <p>
      One team sits out the round: the bottom table first, then the
      lowest-ranked team that hasn&apos;t had a bye. They are credited an
      average-plus result for the round.
    </p>
  ),
  SHORT: (
    <>
      <p>
        Three teams play a three-way in this one round, so no team sits out.
        Each of the three plays both of the others, over half the round&apos;s
        boards each.
      </p>
      <p>
        The bottom three tables play it first, then the lowest-ranked three
        teams that haven&apos;t had a three-way recently.
      </p>
    </>
  ),
  LONG: (
    <>
      <p>
        Three teams play a three-way spread over two rounds, on full sets of
        boards. Each of the three plays both of the others.
      </p>
      <p>
        Because it takes two rounds, choose Long on two neighbouring rounds.
      </p>
      <p>
        The bottom three tables play it first, then the lowest-ranked three
        teams that haven&apos;t had a three-way recently.
      </p>
    </>
  ),
};

/**
 * Reduce a UI plan (`RoundKind` per round) to the persisted
 * {@link SwissTeamsOddRound}[] the spec needs, assigning each pair of adjacent
 * LONG rounds a shared group id.
 *
 * LONG rounds are paired left-to-right: a LONG immediately followed by another
 * LONG forms one long triple (a fresh `group`). A LONG that cannot be paired
 * this way (its neighbour isn't an available LONG) is INVALID — a long triple
 * must occupy two adjacent rounds — so `valid` is false and the director is
 * blocked from confirming until the plan is fixed. BYE/SHORT map straight
 * through.
 */
export function resolveTeamsOddRoundPlan(kinds: RoundKind[]): {
  plan: SwissTeamsOddRound[];
  valid: boolean;
} {
  const plan: SwissTeamsOddRound[] = [];
  let group = 0;
  let valid = true;
  let i = 0;

  while (i < kinds.length) {
    const kind = kinds[i];
    if (kind === "BYE" || kind === "SHORT") {
      plan.push(kind);
      i += 1;
      continue;
    }
    // kind === "LONG": pair with the next round if it is also LONG.
    if (kinds[i + 1] === "LONG") {
      const g = group++;
      plan.push({ kind: "LONG", group: g });
      plan.push({ kind: "LONG", group: g });
      i += 2;
    } else {
      // An unpaired LONG: keep it in the plan (so lengths stay aligned) but
      // mark the plan invalid.
      plan.push({ kind: "LONG", group: group++ });
      valid = false;
      i += 1;
    }
  }

  return { plan, valid };
}

/** The UI `RoundKind`s seeded from an existing persisted plan (group ids dropped). */
function kindsFromPlan(
  plan: SwissTeamsOddRound[] | undefined,
  rounds: number,
): RoundKind[] {
  return Array.from({ length: rounds }, (_, i) => {
    const entry = plan?.[i];
    if (entry === "BYE") return "BYE";
    if (entry === "SHORT") return "SHORT";
    if (entry && typeof entry === "object" && entry.kind === "LONG") {
      return "LONG";
    }
    // No existing entry for this round: default to a bye.
    return "BYE";
  });
}

/**
 * Swiss Teams setup, shown inline on the Movements tab when the event is a
 * Swiss Teams game. A team is the two pairs seated at one table, so the team
 * count equals the section's table count (shown read-only; the director changes
 * it on the Tables step). Like Swiss Pairs there is no schedule to preview —
 * round 1 is a random draw and each later round is drawn from the standings as
 * the event runs. Confirming hands back a {@link SwissTeamsMovementSpec}.
 *
 * A match pits two teams across two tables, so an even count pairs cleanly.
 * With an odd count the director chooses, round by round, how to handle the
 * odd team: a bye (the default) sits one team out, or a triple — three teams
 * play a three-way, as a SHORT triple (the whole three-way in one round) or a
 * LONG triple (spread over two consecutive rounds, so it occupies two adjacent
 * rounds). A bye every round is carried as `oddHandling: "BYE"`; any triple
 * round as `"TRIPLE"` plus the per-round `oddRoundPlan`. An even count omits
 * both.
 */
export function SwissTeamsSetupForm({
  teams,
  initial,
  saving,
  onConfirm,
}: {
  /** The section's table count = the number of teams; sized to the room. */
  teams: number;
  /** Existing spec when the section already has a movement, else defaults. */
  initial?: SwissTeamsMovementSpec | null;
  saving: boolean;
  onConfirm: (spec: SwissTeamsMovementSpec) => void;
}) {
  const [rounds, setRounds] = useState(initial?.rounds ?? 7);
  const [boardsPerRound, setBoardsPerRound] = useState(
    initial?.boardsPerRound ?? 6,
  );
  // How each round handles an odd team: a BYE, or a SHORT / LONG triple; group
  // ids for long triples are derived on confirm (see resolveTeamsOddRoundPlan).
  // Seeded from an existing triple plan, else a bye every round (the default).
  // Kept length-synced to `rounds`.
  const [plan, setPlan] = useState<RoundKind[]>(() =>
    kindsFromPlan(
      initial?.oddHandling === "TRIPLE" ? initial.oddRoundPlan : undefined,
      initial?.rounds ?? 7,
    ),
  );

  // Resize the plan to match the round count, padding new rounds with a bye
  // and truncating removed ones.
  const changeRounds = (next: number) => {
    setRounds(next);
    setPlan((current) =>
      Array.from({ length: next }, (_, i) => current[i] ?? "BYE"),
    );
  };

  const setRoundKind = (index: number, value: RoundKind) => {
    setPlan((current) => {
      const next = Array.from(
        { length: rounds },
        /* v8 ignore next -- unreachable fallback: `plan` is always kept length-synced to `rounds`, so current[i] is defined */
        (_, i) => current[i] ?? "BYE",
      );
      next[index] = value;
      return next;
    });
  };

  const oddTeams = teams % 2 !== 0;
  const kinds = Array.from(
    { length: rounds },
    /* v8 ignore next -- unreachable fallback: `plan` is always length-synced to `rounds` */
    (_, i) => plan[i] ?? "BYE",
  );
  // Any triple round makes this a "Triple" event; a bye every round is the
  // plain "Bye" handling.
  const triples = oddTeams && kinds.some((kind) => kind !== "BYE");
  // A triple needs at least three teams to form the three-way; if fewer are
  // present, that choice would be rejected at start, so confirming is blocked.
  const tooFewForTriple = triples && teams < 3;

  // Validate the plan only when it will actually be sent (odd field + triple).
  const resolved = resolveTeamsOddRoundPlan(kinds);
  const planInvalid = triples && !resolved.valid;

  const blocked = tooFewForTriple || planInvalid;

  const confirm = () => {
    const spec: SwissTeamsMovementSpec = { teams, rounds, boardsPerRound };
    // Only carry the odd handling for an odd field; an even field ignores it.
    if (oddTeams) {
      spec.oddHandling = triples ? "TRIPLE" : "BYE";
      if (triples) {
        spec.oddRoundPlan = resolved.plan;
      }
    }
    onConfirm(spec);
  };

  return (
    <>
      {/* The settings sit in the middle of the space when they fit, and
          scroll from the top when they don't (`my-auto` on a scrolling column
          centres without clipping the top). */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
        <div className="my-auto w-full space-y-4">
          <div className="space-y-3">
            <label className="flex items-center justify-between gap-4">
              <span className="text-sm font-medium text-gray-700">Teams</span>
              <div className="w-40">
                <StepperInput
                  label="Teams"
                  value={teams}
                  /* v8 ignore next -- readOnly StepperInput never calls onChange (the
                   team count is derived from the section's table count). */
                  onChange={() => {}}
                  readOnly
                />
              </div>
            </label>

            <label className="flex items-center justify-between gap-4">
              <span className="text-sm font-medium text-gray-700">Rounds</span>
              <div className="w-40">
                <StepperInput
                  label="Rounds"
                  value={rounds}
                  onChange={changeRounds}
                  min={1}
                  max={30}
                />
              </div>
            </label>

            <label className="flex items-center justify-between gap-4">
              <span className="text-sm font-medium text-gray-700">
                Boards per round
              </span>
              <div className="w-40">
                <StepperInput
                  label="Boards per round"
                  value={boardsPerRound}
                  onChange={setBoardsPerRound}
                  min={1}
                  max={16}
                />
              </div>
            </label>
          </div>

          {oddTeams && (
            <fieldset className="space-y-2" data-testid="teams-odd-round-plan">
              <legend className="text-sm font-medium text-gray-700">
                You have an odd number of teams ({teams}). How should each round
                handle the odd team?
              </legend>
              <table className="w-full table-fixed text-sm">
                <thead>
                  <tr className="bg-gray-100 text-xs font-medium uppercase tracking-wide text-gray-600">
                    <th className="w-14 px-2 py-1.5 text-left font-medium">
                      Round
                    </th>
                    {(["BYE", "SHORT", "LONG"] as const).map((kind) => (
                      <th
                        key={kind}
                        className="px-2 py-1.5 text-center font-medium"
                      >
                        <OddRoundOptionInfo option={KIND_LABEL[kind]}>
                          {KIND_INFO[kind]}
                        </OddRoundOptionInfo>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: rounds }, (_, i) => {
                    /* v8 ignore next -- unreachable fallback: `plan` is always length-synced to `rounds` */
                    const value = plan[i] ?? "BYE";
                    return (
                      <tr key={i} className="border-t border-gray-100">
                        <td className="px-2 py-1.5 text-gray-700">{i + 1}</td>
                        {(["BYE", "SHORT", "LONG"] as const).map((kind) => (
                          <td key={kind} className="px-2 py-1.5 text-center">
                            <input
                              type="radio"
                              aria-label={`${KIND_LABEL[kind]} for round ${i + 1}`}
                              name={`teamsOddRound-${i}`}
                              value={kind}
                              checked={value === kind}
                              onChange={() => setRoundKind(i, kind)}
                            />
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {tooFewForTriple && (
                <p role="alert" className="text-sm font-medium text-red-600">
                  A triple needs at least three teams — choose Bye for every
                  round, or add a table.
                </p>
              )}

              {planInvalid && (
                <p role="alert" className="text-sm font-medium text-red-600">
                  A long triple takes two rounds — pair each{" "}
                  <span className="font-medium">Long</span> round with a{" "}
                  <span className="font-medium">Long</span> on the next round.
                </p>
              )}
            </fieldset>
          )}
        </div>
      </div>

      <div className="shrink-0 border-t border-gray-200 p-4">
        <button
          type="button"
          onClick={confirm}
          disabled={saving || blocked}
          className="w-full rounded-xl bg-blue-600 py-3.5 text-lg font-semibold text-white transition hover:bg-blue-700 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Select Movement"}
        </button>
      </div>
    </>
  );
}
