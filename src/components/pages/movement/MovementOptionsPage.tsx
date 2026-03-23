"use client";

import React, { useState } from "react";
import SelectField from "@/components/common/SelectField";
import { NumberStepperField } from "@/components/common/NumberStepperField";
import FormCardLayout from "@/components/layout/FormCardLayout";
import {SectionInfo} from "@/components/common/SectionInfo";

type Props = {
  eventName: string
  sessionName?: string
  sectionName?: string
  tables: number;
  onSubmit: (value: MovementOptions) => void;
};

type MovementOptions = {
  missingPair: string | null;
  arrowSwitchedRounds: number;
};

export default function MovementOptionsPage({ eventName, sessionName, sectionName, tables, onSubmit }: Props) {
  const [missingPair, setMissingPair] = useState<string>("None");
  const [arrowSwitchedRounds, setArrowSwitchedRounds] = useState(0);

  const generateMissingPairs = (tables: number): string[] => {
    const result = ["None"];

    for (let i = 1; i <= tables; i++) {
      result.push(`${i}NS`, `${i}EW`);
    }

    return result;
  };

  const options = generateMissingPairs(tables);

  return (
      <div className="h-screen flex flex-col bg-gray-100">

          <SectionInfo eventName={eventName} sessionName={sessionName} sectionName={sectionName} />

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
      <NumberStepperField
        label="Number of arrow switched rounds:"
        value={tables}
        onChange={setArrowSwitchedRounds}
        min={0}
      />

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
