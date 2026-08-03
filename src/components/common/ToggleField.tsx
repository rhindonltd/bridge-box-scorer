import { useId } from "react";
import { Toggle } from "@/components/common/Toggle";

type Props = {
  label: string;
  value: boolean;
  offLabel: string;
  onLabel: string;
  onSwitch: () => void;
};

export function ToggleField({
  label,
  value,
  offLabel,
  onLabel,
  onSwitch,
}: Props) {
  const id = useId();

  return (
    <div className="flex flex-col gap-1">
      <label id={id} className="text-sm font-semibold text-gray-700">
        {label}
      </label>
      <Toggle
        value={value}
        offLabel={offLabel}
        onLabel={onLabel}
        onSwitch={onSwitch}
      />
    </div>
  );
}
