import NumberStepper from "@/components/common/NumberStepper";

type Props = {
  label: string;
  value: number;
  onChange: (x: number) => void;
  min: number;
};

export function NumberStepperField({ label, value, onChange, min }: Props) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-semibold text-gray-600">{label}</label>
      <NumberStepper value={value} onChange={onChange} min={min} />
    </div>
  );
}
