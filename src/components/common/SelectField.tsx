import { useId } from "react";

export type SelectOption<T extends string | number> = {
  label: string;
  value: T;
};

type Props<T extends string | number> = {
  label: string;
  value?: T;
  options: SelectOption<T>[];
  onSelect: (value: T) => void;
};

export default function SelectField<T extends string | number>({
  label,
  value,
  options,
  onSelect,
}: Props<T>) {
  const id = useId();

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-semibold text-gray-700">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onSelect(e.target.value as T)}
        className="p-3 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
