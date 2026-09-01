type Props = {
  value: boolean;
  onChange: (value: boolean) => void;
  offLabel: string;
  onLabel: string;
  /** id of an external label element describing this control (for a11y) */
  labelledBy?: string;
};

export function Toggle({
  value,
  onChange,
  offLabel,
  onLabel,
  labelledBy,
}: Props) {
  return (
    <div
      role="group"
      aria-labelledby={labelledBy}
      className="inline-flex rounded-xl bg-gray-100 p-1"
    >
      <button
        type="button"
        onClick={() => onChange(false)}
        aria-pressed={!value}
        className={`rounded-lg px-4 py-2 text-sm font-medium transition-all
          focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
          ${
            !value
              ? "bg-blue-600 text-white shadow-sm"
              : "text-gray-600 hover:bg-gray-200 hover:text-gray-900"
          }`}
      >
        {offLabel}
      </button>

      <button
        type="button"
        onClick={() => onChange(true)}
        aria-pressed={value}
        className={`rounded-lg px-4 py-2 text-sm font-medium transition-all
          focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
          ${
            value
              ? "bg-blue-600 text-white shadow-sm"
              : "text-gray-600 hover:bg-gray-200 hover:text-gray-900"
          }`}
      >
        {onLabel}
      </button>
    </div>
  );
}
