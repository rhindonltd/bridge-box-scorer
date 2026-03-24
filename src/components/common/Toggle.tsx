type Props = {
  value: boolean;
  offLabel: string;
  onLabel: string;
  onSwitch: () => void;
};

export function Toggle({ value, onSwitch, offLabel, onLabel }: Props) {
  return (
    <div className="inline-flex rounded-xl bg-gray-100 p-1">
      <button
        onClick={onSwitch}
        className={`px-4 py-2 text-sm font-medium rounded-lg transition
          ${
            !value
              ? "bg-white shadow text-gray-900"
              : "text-gray-500 hover:text-gray-700"
          }`}
      >
        {offLabel}
      </button>

      <button
        onClick={onSwitch}
        className={`px-4 py-2 text-sm font-medium rounded-lg transition
          ${
            value
              ? "bg-white shadow text-gray-900"
              : "text-gray-500 hover:text-gray-700"
          }`}
      >
        {onLabel}
      </button>
    </div>
  );
}
