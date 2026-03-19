"use client";

import { useState } from "react";
import SelectField from "@/components/common/SelectField";
import FormCard from "@/components/common/FormCard";
import { NumberStepperField } from "@/components/common/NumberStepperField";

type Props = {
  tables: number;
  onSubmit: (value: MovementOptions) => void;
};

type MovementOptions = {
  missingPair: string | null,
  arrowSwitchedRounds: number
}

export default function MovementOptionsPage({ tables, onSubmit }: Props) {
  const [missingPair, setMissingPair] = useState<string>('None');
  const [arrowSwitchedRounds, setArrowSwitchedRounds] = useState(0);

  const generateMissingPairs = (tables: number): string[] => {
    const result = ['None'];

    for (let i = 1; i <= tables; i++) {
      result.push(`${i}NS`, `${i}EW`);
    }

    return result;
  };

  const options = generateMissingPairs(tables);

  return (
    <FormCard
      header="Movement Options"
      primaryText="Select"
      onSecondaryClick={() => {}}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          missingPair,
          arrowSwitchedRounds
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
    </FormCard>
  );
}
