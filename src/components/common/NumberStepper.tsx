import { useAutoRepeat } from "@/hooks/use-auto-repeat";

export type Props = {
  value: number;
  showPlus?: boolean;
  zeroCharacter?: string;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
};

export function NumberStepper({
  value,
  showPlus,
  zeroCharacter = "=",
  min = -Infinity,
  max = Infinity,
  onChange,
}: Props) {
  const { start: startAdjusting, stop: stopAdjusting } = useAutoRepeat();

  const clamp = (val: number) => Math.max(min, Math.min(max, val));

  const adjust = (delta: number) => {
    onChange(clamp(value + delta));
  };

  const resultText =
    value === 0
      ? zeroCharacter
      : value > 0
        ? showPlus
          ? `+${value}`
          : `${value}`
        : `${value}`;

  return (
    <div className="flex">
      {/* Decrement */}
      <button
        type="button"
        className="w-[35px] h-[35px] text-xl rounded-lg border disabled:opacity-50"
        onMouseDown={() => startAdjusting(() => adjust(-1))}
        onMouseUp={stopAdjusting}
        onMouseLeave={stopAdjusting}
        onTouchStart={() => startAdjusting(() => adjust(-1))}
        onTouchEnd={stopAdjusting}
        disabled={value <= min}
      >
        −
      </button>

      {/* Value */}
      <div className="text-3xl font-bold min-w-[60px] text-center">
        {resultText}
      </div>

      {/* Increment */}
      <button
        type="button"
        className="w-[35px] h-[35px] text-2xl rounded-lg border disabled:opacity-50"
        onMouseDown={() => startAdjusting(() => adjust(1))}
        onMouseUp={stopAdjusting}
        onMouseLeave={stopAdjusting}
        onTouchStart={() => startAdjusting(() => adjust(1))}
        onTouchEnd={stopAdjusting}
        disabled={value >= max}
      >
        +
      </button>
    </div>
  );
}
