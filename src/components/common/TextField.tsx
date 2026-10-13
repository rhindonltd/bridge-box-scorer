import { useId } from "react";

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /**
   * Mark the field as invalid (e.g. a required value is missing after the user
   * tried to continue). Draws a red border/ring and sets `aria-invalid` so the
   * problem field stands out instead of a separate standing instruction.
   */
  invalid?: boolean;
};

export default function TextField({
  label,
  value,
  onChange,
  invalid = false,
}: Props) {
  const id = useId();

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-semibold text-gray-700">
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={label}
        aria-invalid={invalid || undefined}
        className={`p-3 text-lg border rounded-lg focus:outline-none focus:ring-2 ${
          invalid
            ? "border-red-500 focus:ring-red-500 focus:border-red-500"
            : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"
        }`}
      />
    </div>
  );
}
