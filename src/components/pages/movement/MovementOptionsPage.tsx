"use client";

import React, { useState } from "react";
import SelectField, { SelectOption } from "@/components/common/SelectField";
import FormCardLayout from "@/components/layout/FormCardLayout";
import { GameInfo } from "@/components/common/GameInfo";
import NumberStepper from "@/components/common/NumberStepper";

type Props = {
  tables: number;
  onSubmit: (value: MovementOptions) => void;
};

type MovementOptions = {
  missingPair: string | null;
  arrowSwitchedRounds: number;
};

export default function MovementOptionsPage({ tables, onSubmit }: Props) {
  const [missingPair, setMissingPair] = useState<string>("None");
  const [arrowSwitchedRounds, setArrowSwitchedRounds] = useState(0);

  const generateMissingPairs = (tables: number): SelectOption<string>[] => {
    const result: SelectOption<string>[] = [{ label: "None", value: "None" }];

    for (let i = 1; i <= tables; i++) {
      result.push(
        { label: `${i}NS`, value: `${i}NS` },
        { label: `${i}EW`, value: `${i}EW` },
      );
    }

    return result;
  };

  const options = generateMissingPairs(tables);

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex flex-row w-full">
        <GameInfo />
      </div>

      <div className="flex-1 flex items-center justify-center p-2 min-h-0">
        <FormCardLayout
          header="Movement Options"
          primaryText="Select"
          onSecondaryClick={() => {}}
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit({
              missingPair,
              arrowSwitchedRounds,
            });
          }}
        >
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-gray-600">
              Number of arrow switched rounds:
            </label>
            <NumberStepper
              value={tables}
              onChange={setArrowSwitchedRounds}
              min={0}
            />
          </div>

          <SelectField
            label="Missing Pair:"
            value={missingPair}
            options={options}
            onSelect={setMissingPair}
          />
        </FormCardLayout>
      </div>
    </div>
  );
}
