"use client";

import React, { useMemo, useState } from "react";
import SelectField from "@/components/common/SelectField";
import { NumberStepperField } from "@/components/common/NumberStepperField";
import FormCardLayout from "@/components/layout/FormCardLayout";
import { SectionInfo } from "@/components/common/SectionInfo";

type Props = {
  eventName: string;
  sessionName?: string;
  sectionName?: string;
  onConfirm: (value: Movement) => void;
};

type Movement = {
  name: string;
  tables: number;
  rounds: number;
  boardsPerRound: number;
};

export default function SelectMovementPage({
  eventName,
  sessionName,
  sectionName,
  onConfirm,
}: Props) {
  const [tables, setTables] = useState(3);
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
    <div className="h-screen flex flex-col bg-gray-100">
      <SectionInfo
        eventName={eventName}
        sessionName={sessionName}
        sectionName={sectionName}
      />

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
          <NumberStepperField
            label="Number of tables:"
            value={tables}
            onChange={setTables}
            min={2}
          />

          <NumberStepperField
            label="Number of rounds:"
            value={rounds}
            onChange={setRounds}
            min={2}
          />

          <NumberStepperField
            label="Boards per round:"
            value={boardsPerRound}
            onChange={setBoardsPerRound}
            min={2}
          />

          <SelectField
            label="Movement"
            value={movement?.name}
            options={movements.map((m) => m.name)}
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
