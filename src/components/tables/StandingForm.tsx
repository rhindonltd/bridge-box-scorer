"use client";

import { useState } from "react";

import { PillToggle } from "@/components/common/PillToggle";
import { NumberStepper } from "@/components/common/NumberStepper";
import type { ParticipantStanding } from "@/model/participants";
import type { StandingChange } from "@/lib/standing-service";

type StandingValue = ParticipantStanding["standing"];

/**
 * The inline standing editor for a single pair or team (shared by the Pairs and
 * Teams rosters). Local state only;
 * emits a {@link StandingChange} via `onSave`. Offers Active / Withdrawn / Late
 * / Without standing, and — for Withdrawn / Late — a round number, a REMOVE vs
 * PENALISED treatment, and (when PENALISED) a 0..40 fine percentage.
 */
export function StandingForm({
  label,
  current,
  onSave,
  onCancel,
}: {
  label: string;
  current: StandingValue;
  onSave: (change: StandingChange) => void;
  onCancel: () => void;
}) {
  const [standing, setStanding] = useState<StandingValue>(current);
  const [round, setRound] = useState(1);
  const [treatment, setTreatment] = useState<"REMOVE" | "PENALISED">("REMOVE");
  const [finePercent, setFinePercent] = useState(0);

  const needsDetail = standing === "WITHDRAWN" || standing === "LATE";
  const roundLabelId = `standing-round-${label.replace(/\W+/g, "-")}`;
  const fineLabelId = `standing-fine-${label.replace(/\W+/g, "-")}`;

  function handleSave() {
    if (standing === "WITHDRAWN") {
      onSave({
        standing: "WITHDRAWN",
        withdrawnInRound: round,
        treatment,
        ...(treatment === "PENALISED" ? { finePercent } : {}),
      });
      return;
    }
    if (standing === "LATE") {
      onSave({
        standing: "LATE",
        arrivedInRound: round,
        treatment,
        ...(treatment === "PENALISED" ? { finePercent } : {}),
      });
      return;
    }
    if (standing === "WITHOUT_STANDING") {
      onSave({ standing: "WITHOUT_STANDING" });
      return;
    }
    onSave({ standing: "ACTIVE" });
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
      <PillToggle<StandingValue>
        name={`standing-${label.replace(/\W+/g, "-")}`}
        legend={`Standing for ${label}`}
        options={[
          { value: "ACTIVE", label: "Active" },
          { value: "WITHDRAWN", label: "Withdrawn" },
          { value: "LATE", label: "Late" },
          { value: "WITHOUT_STANDING", label: "No standing" },
        ]}
        value={standing}
        onChange={setStanding}
      />

      {needsDetail && (
        <>
          <div className="flex items-center justify-between gap-3">
            <span
              id={roundLabelId}
              className="text-sm font-medium text-gray-700"
            >
              {standing === "WITHDRAWN"
                ? "Withdrew in round"
                : "Arrived in round"}
            </span>
            <div aria-labelledby={roundLabelId}>
              <NumberStepper min={1} value={round} onChange={setRound} />
            </div>
          </div>

          <PillToggle<"REMOVE" | "PENALISED">
            name={`treatment-${label.replace(/\W+/g, "-")}`}
            legend={`Treatment for ${label}`}
            options={[
              { value: "REMOVE", label: "Remove" },
              { value: "PENALISED", label: "Penalised" },
            ]}
            value={treatment}
            onChange={setTreatment}
          />

          {treatment === "PENALISED" && (
            <div className="flex items-center justify-between gap-3">
              <span
                id={fineLabelId}
                className="text-sm font-medium text-gray-700"
              >
                Fine %
              </span>
              <div aria-labelledby={fineLabelId}>
                <NumberStepper
                  min={0}
                  max={40}
                  value={finePercent}
                  zeroCharacter="0"
                  onChange={setFinePercent}
                />
              </div>
            </div>
          )}
        </>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-lg border border-gray-200 bg-white py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="flex-1 rounded-lg border border-blue-600 bg-blue-600 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          Save
        </button>
      </div>
    </div>
  );
}
