"use client";

interface PillOption<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  /** Radio group name; must be unique per instance on the page. */
  name: string;
  /** Accessible group label (visually hidden). */
  legend: string;
  options: PillOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

/**
 * A segmented pill control (e.g. Per Round / Per Board, Duration / Resume at
 * time). Uses real radio inputs (visually hidden) so it stays keyboard- and
 * screen-reader accessible while presenting as pills. The selected pill is
 * raised on a white background; the rest sit flat on the grey track.
 */
export function PillToggle<T extends string>({
  name,
  legend,
  options,
  value,
  onChange,
}: Props<T>) {
  const pillClass = (active: boolean) =>
    `flex-1 cursor-pointer rounded-lg px-4 py-2 text-center text-sm font-medium transition ${
      active
        ? "bg-white text-blue-700 shadow-sm"
        : "text-gray-600 hover:text-gray-800"
    }`;

  return (
    <fieldset className="flex gap-1 rounded-xl bg-gray-100 p-1">
      <legend className="sr-only">{legend}</legend>
      {options.map((option) => (
        <label key={option.value} className={pillClass(value === option.value)}>
          <input
            type="radio"
            name={name}
            className="sr-only"
            checked={value === option.value}
            onChange={() => onChange(option.value)}
          />
          {option.label}
        </label>
      ))}
    </fieldset>
  );
}
