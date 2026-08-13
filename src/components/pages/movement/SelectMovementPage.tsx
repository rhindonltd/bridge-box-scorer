"use client";

import React, { useMemo, useState } from "react";
import SelectField from "@/components/common/SelectField";
import FormCardLayout from "@/components/layout/FormCardLayout";
import { GameInfo } from "@/components/common/GameInfo";
import NumberStepper from "@/components/common/NumberStepper";

type Props = {
  tables: number;
  onConfirm: (value: Movement) => void;
};

type Movement = {
  name: string;
  tables: number;
  rounds: number;
  boardsPerRound: number;
};

export default function SelectMovementPage({ tables, onConfirm }: Props) {
  const [rounds, setRounds] = useState(3);
  const [boardsPerRound, setBoardsPerRound] = useState(3);

  const movements = useMemo(() => {
    let movementName;

    if (tables % 2 === 0) {
      if (rounds === tables) {
        movementName = "Mitchell Share and Relay";
      } else if (rounds < tables) {
        movementName = "Skip Mitchell";
      } else {
        movementName = "Howell";
      }
    } else {
      if (rounds <= tables) {
        movementName = "Standard Mitchell";
      } else {
        movementName = "Howell";
      }
    }

    return [
      {
        tables,
        rounds,
        boardsPerRound,
        name: movementName,
      },
    ];
  }, [tables, rounds, boardsPerRound]);

  const [movement, setMovement] = useState<Movement | null>(movements[0]);

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex flex-row w-full">
        <GameInfo />
      </div>

      <div className="flex-1 flex items-center justify-center p-2 min-h-0">
        <FormCardLayout
          header="Select Movement"
          primaryText="Select"
          onSecondaryClick={() => {}}
          disabled={!movement}
          onSubmit={(e) => {
            e.preventDefault();
            onConfirm(movement!);
          }}
        >
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-gray-600">
              Number of rounds:
            </label>
            <NumberStepper value={rounds} onChange={setRounds} min={2} />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-gray-600">
              Boards per round:
            </label>
            <NumberStepper
              value={boardsPerRound}
              onChange={setBoardsPerRound}
              min={2}
            />
          </div>

          <SelectField
            label="Movement"
            value={movement?.name}
            options={movements.map((m) => ({
              label: m.name,
              value: m.name,
            }))}
            onSelect={(name) => {
              const selected = movements.find((m) => m.name === name) || null;
              setMovement(selected);
            }}
          />
        </FormCardLayout>
      </div>
    </div>
  );
}
