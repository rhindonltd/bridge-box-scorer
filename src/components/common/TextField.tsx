type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

export default function TextField({ label, value, onChange }: Props) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-semibold text-gray-600">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={label}
        className="p-3 text-lg border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}
