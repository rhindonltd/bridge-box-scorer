"use client";

import { useState } from "react";
import { ContractSuit, Doubling, Level, Levels } from "@/model/contract";
import { Direction, SuitMap } from "@/model/common";
import { PlayedContractCode, parsePlayedContract } from "@/model/result";
import { buildPlayedContractCode } from "@/lib/buildPlayedContractCode";
import { StepSuit } from "./StepSuit";
import { StepDeclarer } from "./StepDeclarer";
import { StepResult } from "./StepResult";

/** A completed weighted component: a contract and its weight. */
type Component = {
  contract: PlayedContractCode;
  weight: number;
};

type Props = {
  onSubmit: (components: Component[]) => void;
};

type Phase =
  | { step: "list" }
  | { step: "level" }
  | { step: "suit"; level: Level }
  | { step: "declarer"; level: Level; suit: ContractSuit }
  | { step: "result"; level: Level; suit: ContractSuit; declarer: Direction; dbl: Doubling }
  | { step: "weight"; contract: PlayedContractCode };

/**
 * Director step for entering a weighted assigned score (Law 12C1c). The
 * director builds N components, each a real contract result + a percentage
 * weight. Weights must sum to 100.
 */
export function StepWeightedScore({ onSubmit }: Props) {
  const [components, setComponents] = useState<Component[]>([]);
  const [phase, setPhase] = useState<Phase>({ step: "list" });
  const [weight, setWeight] = useState(100);

  // Weights may carry up to 2 decimal places (e.g. a 33.33/33.33/33.34 split),
  // so track totals in whole "cents of a percent" to avoid binary-float drift
  // and round the displayed figures to 2dp.
  const totalCents = components.reduce(
    (sum, c) => sum + Math.round(c.weight * 100),
    0,
  );
  const totalWeight = totalCents / 100;
  const remaining = (10000 - totalCents) / 100;

  function removeComponent(index: number) {
    setComponents((prev) => prev.filter((_, i) => i !== index));
  }

  function handleAddComponent() {
    setWeight(remaining);
    setPhase({ step: "level" });
  }

  function handleLevelSelected(level: Level) {
    setPhase({ step: "suit", level });
  }

  function handleSuitSelected(suit: ContractSuit) {
    if (phase.step !== "suit") return;
    setPhase({ step: "declarer", level: phase.level, suit });
  }

  function handleDeclarerSelected(declarer: Direction, dbl: Doubling) {
    if (phase.step !== "declarer") return;
    setPhase({
      step: "result",
      level: phase.level,
      suit: phase.suit,
      declarer,
      dbl,
    });
  }

  function handleResultComplete(mode: "made" | "down", value: number) {
    if (phase.step !== "result") return;
    const trickResult = mode === "down" ? -value : value;
    const contract = buildPlayedContractCode(
      phase.level,
      phase.suit,
      phase.dbl,
      phase.declarer,
      trickResult,
    );
    setPhase({ step: "weight", contract });
  }

  function handleWeightConfirmed() {
    if (phase.step !== "weight") return;
    // Allow up to 2 decimal places; clamp into (0, remaining].
    const rounded = Math.round(weight * 100) / 100;
    const clamped = Math.min(Math.max(0.01, rounded), remaining);
    setComponents((prev) => [
      ...prev,
      { contract: phase.contract, weight: clamped },
    ]);
    setPhase({ step: "list" });
  }

  function handleBack() {
    switch (phase.step) {
      case "list":
        return; // caller handles outer back via the wizard shell
      case "level":
        setPhase({ step: "list" });
        return;
      case "suit":
        setPhase({ step: "level" });
        return;
      case "declarer":
        setPhase({ step: "suit", level: phase.level });
        return;
      case "result":
        setPhase({
          step: "declarer",
          level: phase.level,
          suit: phase.suit,
        });
        return;
      case "weight":
        setPhase({ step: "level" }); // restart the contract entry
        return;
    }
  }

  // --- Rendering ---

  if (phase.step === "level") {
    return (
      <div className="flex-1 flex flex-col min-h-0">
        <div className="shrink-0 px-4 pt-3 pb-1 flex items-center gap-2">
          <button
            type="button"
            onClick={handleBack}
            className="text-blue-600 font-semibold text-sm"
          >
            ← Back
          </button>
          <span className="text-sm text-gray-500 ml-auto">
            Component {components.length + 1} — Level
          </span>
        </div>
        <div className="flex-1 grid grid-cols-2 gap-3 p-4 min-h-0 auto-rows-fr">
          {Levels.map((level) => (
            <button
              key={level}
              type="button"
              className="rounded-xl text-center border-2 border-gray-200 bg-white hover:bg-gray-50 active:scale-[0.98] transition text-2xl font-bold text-gray-900 flex items-center justify-center"
              onClick={() => handleLevelSelected(level)}
            >
              {level}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (phase.step === "suit") {
    return (
      <div className="flex-1 flex flex-col min-h-0">
        <div className="shrink-0 px-4 pt-3 pb-1 flex items-center gap-2">
          <button
            type="button"
            onClick={handleBack}
            className="text-blue-600 font-semibold text-sm"
          >
            ← Back
          </button>
          <span className="text-sm text-gray-500 ml-auto">
            Component {components.length + 1} — Suit
          </span>
        </div>
        <StepSuit level={phase.level} onSuitSelected={handleSuitSelected} />
      </div>
    );
  }

  if (phase.step === "declarer") {
    return (
      <div className="flex-1 flex flex-col min-h-0">
        <div className="shrink-0 px-4 pt-3 pb-1 flex items-center gap-2">
          <button
            type="button"
            onClick={handleBack}
            className="text-blue-600 font-semibold text-sm"
          >
            ← Back
          </button>
          <span className="text-sm text-gray-500 ml-auto">
            Component {components.length + 1} — Declarer
          </span>
        </div>
        <StepDeclarer
          level={phase.level}
          suit={phase.suit}
          onDeclarerSelected={handleDeclarerSelected}
        />
      </div>
    );
  }

  if (phase.step === "result") {
    return (
      <div className="flex-1 flex flex-col min-h-0">
        <div className="shrink-0 px-4 pt-3 pb-1 flex items-center gap-2">
          <button
            type="button"
            onClick={handleBack}
            className="text-blue-600 font-semibold text-sm"
          >
            ← Back
          </button>
          <span className="text-sm text-gray-500 ml-auto">
            Component {components.length + 1} — Result
          </span>
        </div>
        <StepResult
          level={phase.level}
          onResultComplete={handleResultComplete}
        />
      </div>
    );
  }

  if (phase.step === "weight") {
    const maxWeight = remaining;
    return (
      <div className="flex-1 flex flex-col p-4 min-h-0">
        <div className="shrink-0 flex items-center gap-2 mb-4">
          <button
            type="button"
            onClick={handleBack}
            className="text-blue-600 font-semibold text-sm"
          >
            ← Back
          </button>
          <span className="text-sm text-gray-500 ml-auto">
            Component {components.length + 1} — Weight
          </span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <p className="text-xl font-bold text-gray-800">
            <ContractLabel contract={phase.contract} />
          </p>
          <p className="text-sm text-gray-500">
            Enter percentage weight (remaining: {maxWeight}%)
          </p>
          <input
            type="number"
            min={0.01}
            max={maxWeight}
            step={0.01}
            value={weight}
            onChange={(e) => setWeight(Number(e.target.value))}
            className="w-24 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            aria-label="Weight percentage"
          />
          <button
            type="button"
            disabled={weight <= 0 || weight > maxWeight}
            onClick={handleWeightConfirmed}
            className="w-full max-w-xs bg-blue-600 text-white py-3 text-lg font-bold rounded-xl disabled:opacity-40"
          >
            Add Component
          </button>
        </div>
      </div>
    );
  }

  // --- List phase ---
  return (
    <div className="flex-1 flex flex-col p-4 min-h-0">
      <h2 className="text-lg font-bold text-gray-800 text-center mb-4">
        Weighted Score
      </h2>

      {components.length === 0 ? (
        <p className="text-sm text-gray-500 text-center mb-4">
          Add one or more contract components with weights that sum to 100%.
        </p>
      ) : (
        <div className="flex flex-col gap-2 mb-4">
          {components.map((c, i) => (
            <div
              key={i}
              className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 border border-gray-200"
            >
              <span className="font-semibold text-gray-800">
                {c.weight}%{" "}
                <ContractLabel contract={c.contract} />
              </span>
              <button
                type="button"
                onClick={() => removeComponent(i)}
                className="text-red-500 hover:text-red-700 font-bold text-lg px-2"
                aria-label={`Remove component ${i + 1}`}
              >
                ✕
              </button>
            </div>
          ))}
          <div className="text-sm text-gray-500 text-center">
            Total: {totalWeight}%{" "}
            {remaining > 0 && (
              <span className="text-amber-600">({remaining}% remaining)</span>
            )}
          </div>
        </div>
      )}

      {remaining > 0 && (
        <button
          type="button"
          onClick={handleAddComponent}
          className="w-full py-3 rounded-xl text-center border-2 border-blue-300 bg-blue-50 hover:bg-blue-100 active:scale-[0.98] transition text-base font-semibold text-blue-800 mb-3"
        >
          + Add Component
        </button>
      )}

      <div className="mt-auto pt-4">
        <button
          type="button"
          disabled={totalWeight !== 100}
          onClick={() => onSubmit(components)}
          className="w-full bg-green-700 text-white py-3 text-lg font-bold rounded-xl disabled:opacity-40"
        >
          Submit
        </button>
      </div>
    </div>
  );
}

/** Display a PlayedContractCode with suit symbols. */
function ContractLabel({ contract }: { contract: PlayedContractCode }) {
  const parsed = parsePlayedContract(contract);
  const suitColor =
    parsed.suit === "H" || parsed.suit === "D" ? "text-red-600" : "";
  const suitDisplay =
    parsed.suit === "NT" ? "NT" : SuitMap[parsed.suit as keyof typeof SuitMap];

  return (
    <span>
      {parsed.level}
      <span className={suitColor}>{suitDisplay}</span>
      {parsed.doubling}
      {parsed.declarer}
      {parsed.result}
    </span>
  );
}
