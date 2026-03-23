type Props<T extends string | number> = {
  label: string;
  value?: T;
  options: readonly T[];
  onSelect: (value: T) => void;
};

export default function SelectField<T extends string | number>({
  label,
  value,
  options,
  onSelect,
}: Props<T>) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-semibold text-gray-600">{label}</label>
      <select
        value={value}
        onChange={(e) => onSelect(e.target.value as T)}
        className="p-3 text-lg border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {options.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
    </div>
  );
}
