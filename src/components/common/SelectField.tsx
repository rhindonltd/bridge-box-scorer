type Props = {
  label: string;
  value: string;
  options: string[];
  onSelect: (value: string) => void;
};

export default function SelectField({
  label,
  value,
  options,
  onSelect,
}: Props) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-semibold text-gray-600">{label}</label>
      <select
        value={value}
        onChange={(e) => onSelect(e.target.value)}
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
