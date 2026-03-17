import { useState } from "react";
import NumberStepper from "@/components/common/NumberStepper";
import Button from "@/components/common/Button";
import { HeaderContentButtonLayout } from "@/components/common/HeaderContentButtonLayout";

type Props = {
  title: string;
  onConfirm: (value: number) => void;
};

export default function SelectNumberOfTablesPage({ title, onConfirm }: Props) {
  const [value, setValue] = useState(1);

  return (
    <HeaderContentButtonLayout
      heading={<h1 className="text-3xl font-bold">{title}</h1>}
      content={
        <div className="flex flex-col w-full gap-2 items-center justify-center">
          <span>Please select the number of tables:</span>
          <NumberStepper value={value} onAdjustValue={setValue} min={1} />
        </div>
      }
      button={
        <Button type="button" value="Submit" onClick={() => onConfirm(value)} />
      }
    />
  );
}
