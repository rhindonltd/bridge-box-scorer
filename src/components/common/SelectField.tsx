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
  /**
   * Lay the label and dropdown out on one row (label left, dropdown right)
   * instead of stacking the dropdown under the label. Saves vertical space on
   * dense forms. Defaults to the stacked layout.
   */
  inline?: boolean;
};

export default function SelectField<T extends string | number>({
  label,
  value,
  options,
  onSelect,
  inline = false,
}: Props<T>) {
  const id = useId();

  const select = (
    <select
      id={id}
      value={value}
      onChange={(e) => onSelect(e.target.value as T)}
      className={`p-3 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
        // In the inline layout, give every dropdown the same fixed width so
        // stacked rows line up regardless of their option text length.
        inline ? "w-44" : ""
      }`}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );

  if (inline) {
    return (
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-sm font-semibold text-gray-700">
          {label}
        </label>
        {select}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-semibold text-gray-700">
        {label}
      </label>
      {select}
    </div>
  );
}
