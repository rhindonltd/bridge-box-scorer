"use client";

import { Fragment, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { StepperInput } from "@/components/common/StepperInput";
import type {
  SwissTeamsMovementSpec,
  SwissTeamsOddHandling,
  SwissTeamsOddRound,
} from "@/model/selected-movement";

/**
 * Setup popup for a Swiss Teams movement. A team is the two pairs seated at one
 * table, so the team count equals the section's table count (shown read-only;
 * the director changes it on the Tables step). Like Swiss Pairs there is no
 * schedule to preview — round 1 is a random draw and each later round is drawn
 * from the standings as the event runs. Confirming hands back a
 * {@link SwissTeamsMovementSpec}.
 *
 * A match pits two teams across two tables, so an even count pairs cleanly.
 * With an odd count the director chooses how to handle the odd team: "Bye" (the
 * default) sits one team out each round, or "Triple" — three teams play a
 * three-way. A triple is set per round as a SHORT triple (the whole three-way
 * in one round) or a LONG triple (spread over two consecutive rounds); a long
 * triple therefore occupies two adjacent rounds. The chosen mode is carried on
 * the spec as `oddHandling` plus the per-round `oddRoundPlan`; an even count
 * omits both.
 */
export function SwissTeamsSetupDialog({
  open,
  teams,
  initial,
  saving,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  /** The section's table count = the number of teams; sized to the room. */
  teams: number;
  /** Existing spec when re-opening to edit, else sensible defaults. */
  initial?: SwissTeamsMovementSpec | null;
  saving: boolean;
  onCancel: () => void;
  onConfirm: (spec: SwissTeamsMovementSpec) => void;
}) {
  return (
    <Transition show={open} as={Fragment}>
      <Dialog onClose={onCancel} className="relative z-50">
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-150"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        </Transition.Child>

        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-150"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-100"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
              {open && (
                <SwissTeamsSetupForm
                  teams={teams}
                  initial={initial}
                  saving={saving}
                  onCancel={onCancel}
                  onConfirm={onConfirm}
                />
              )}
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}

/** A per-round plan entry as the UI tracks it (group ids are derived on confirm). */
type RoundKind = "BYE" | "SHORT" | "LONG";

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
    // No existing entry for this round: default to a short triple.
    return "SHORT";
  });
}

function SwissTeamsSetupForm({
  teams,
  initial,
  saving,
  onCancel,
  onConfirm,
}: {
  teams: number;
  initial?: SwissTeamsMovementSpec | null;
  saving: boolean;
  onCancel: () => void;
  onConfirm: (spec: SwissTeamsMovementSpec) => void;
}) {
  const [rounds, setRounds] = useState(initial?.rounds ?? 7);
  const [boardsPerRound, setBoardsPerRound] = useState(
    initial?.boardsPerRound ?? 6,
  );
  const [oddHandling, setOddHandling] = useState<SwissTeamsOddHandling>(
    initial?.oddHandling ?? "BYE",
  );
  // The per-round plan (one entry per round), used only under "Triple". Each
  // round is a BYE / SHORT / LONG; group ids for long triples are derived on
  // confirm (see resolveTeamsOddRoundPlan). Kept length-synced to `rounds`.
  const [plan, setPlan] = useState<RoundKind[]>(() =>
    kindsFromPlan(initial?.oddRoundPlan, initial?.rounds ?? 7),
  );

  // Resize the plan to match the round count, padding new rounds with a short
  // triple and truncating removed ones.
  const changeRounds = (next: number) => {
    setRounds(next);
    setPlan((current) =>
      Array.from({ length: next }, (_, i) => current[i] ?? "SHORT"),
    );
  };

  const setRoundKind = (index: number, value: RoundKind) => {
    setPlan((current) => {
      const next = Array.from(
        { length: rounds },
        (_, i) => current[i] ?? "SHORT",
      );
      next[index] = value;
      return next;
    });
  };

  const oddTeams = teams % 2 !== 0;
  // A triple needs at least three teams to form the three-way; if fewer are
  // present, that choice would be rejected at start, so confirming is blocked.
  const tooFewForTriple = oddTeams && oddHandling === "TRIPLE" && teams < 3;

  // Validate the plan only when it will actually be sent (odd field + triple).
  const resolved = resolveTeamsOddRoundPlan(
    Array.from({ length: rounds }, (_, i) => plan[i] ?? "SHORT"),
  );
  const planInvalid =
    oddTeams && oddHandling === "TRIPLE" && !resolved.valid;

  const blocked = tooFewForTriple || planInvalid;

  const confirm = () => {
    const spec: SwissTeamsMovementSpec = { teams, rounds, boardsPerRound };
    // Only carry the odd handling for an odd field; an even field ignores it.
    if (oddTeams) {
      spec.oddHandling = oddHandling;
      if (oddHandling === "TRIPLE") {
        spec.oddRoundPlan = resolved.plan;
      }
    }
    onConfirm(spec);
  };

  return (
    <>
      <Dialog.Title className="shrink-0 rounded-t-2xl bg-gray-300 p-4 text-md font-bold text-gray-800">
        Swiss Teams
      </Dialog.Title>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
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
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-gray-700">
              You have an odd number of teams ({teams}). How should the odd team
              be handled each round?
            </legend>

            <label className="flex items-start gap-2 text-sm text-gray-700">
              <input
                type="radio"
                name="oddHandling"
                value="BYE"
                checked={oddHandling === "BYE"}
                onChange={() => setOddHandling("BYE")}
                className="mt-0.5"
              />
              <span>
                <span className="font-medium">Bye</span> — one team sits out each
                round (the bottom table first, then the lowest-ranked team that
                hasn&apos;t had a bye) and is credited an average-plus result.
              </span>
            </label>

            <label className="flex items-start gap-2 text-sm text-gray-700">
              <input
                type="radio"
                name="oddHandling"
                value="TRIPLE"
                checked={oddHandling === "TRIPLE"}
                onChange={() => setOddHandling("TRIPLE")}
                className="mt-0.5"
              />
              <span>
                <span className="font-medium">Triple</span> — three teams play a
                three-way (the bottom three tables first, then the lowest-ranked
                three without a recent triple). Set each round below as a short
                triple (one round) or a long triple (two rounds).
              </span>
            </label>

            {tooFewForTriple && (
              <p role="alert" className="text-sm font-medium text-red-600">
                A triple needs at least three teams — choose Bye, or add a
                table.
              </p>
            )}

            {oddHandling === "TRIPLE" && (
              <div
                className="mt-2 rounded-lg border border-gray-200 p-3"
                data-testid="teams-odd-round-plan"
              >
                <p className="mb-2 text-xs text-gray-500">
                  Choose how each round resolves the odd team. A long triple
                  takes two rounds, so pick <span className="font-medium">Long</span>{" "}
                  on two neighbouring rounds. This only applies if your field is
                  odd.
                </p>
                <table className="w-full table-fixed text-sm">
                  <thead>
                    <tr className="bg-gray-100 text-xs font-medium uppercase tracking-wide text-gray-600">
                      <th className="w-14 px-2 py-1.5 text-left font-medium">
                        Round
                      </th>
                      <th className="px-2 py-1.5 text-center font-medium">
                        Bye
                      </th>
                      <th className="px-2 py-1.5 text-center font-medium">
                        Short
                      </th>
                      <th className="px-2 py-1.5 text-center font-medium">
                        Long
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: rounds }, (_, i) => {
                      const value = plan[i] ?? "SHORT";
                      return (
                        <tr key={i} className="border-t border-gray-100">
                          <td className="px-2 py-1.5 text-gray-700">
                            {i + 1}
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            <input
                              type="radio"
                              aria-label={`Bye for round ${i + 1}`}
                              name={`teamsOddRound-${i}`}
                              value="BYE"
                              checked={value === "BYE"}
                              onChange={() => setRoundKind(i, "BYE")}
                            />
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            <input
                              type="radio"
                              aria-label={`Short for round ${i + 1}`}
                              name={`teamsOddRound-${i}`}
                              value="SHORT"
                              checked={value === "SHORT"}
                              onChange={() => setRoundKind(i, "SHORT")}
                            />
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            <input
                              type="radio"
                              aria-label={`Long for round ${i + 1}`}
                              name={`teamsOddRound-${i}`}
                              value="LONG"
                              checked={value === "LONG"}
                              onChange={() => setRoundKind(i, "LONG")}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {planInvalid && (
                  <p
                    role="alert"
                    className="mt-2 text-sm font-medium text-red-600"
                  >
                    A long triple takes two rounds — pair each{" "}
                    <span className="font-medium">Long</span> round with a{" "}
                    <span className="font-medium">Long</span> on the next round.
                  </p>
                )}
              </div>
            )}
          </fieldset>
        )}
      </div>

      <div className="flex shrink-0 justify-end gap-2 border-t border-gray-200 p-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={confirm}
          disabled={saving || blocked}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Select Movement"}
        </button>
      </div>
    </>
  );
}
