import { useRef } from "react";

export type Props = {
  value: number;
  showPlus?: boolean;
  zeroCharacter?: string;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
};

export default function NumberStepper({
                                        value,
                                        showPlus,
                                        zeroCharacter = "=",
                                        min = -Infinity,
                                        max = Infinity,
                                        onChange,
                                      }: Props) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clamp = (val: number) => Math.max(min, Math.min(max, val));

  const adjust = (delta: number) => {
    onChange(clamp(value + delta));
  };

  const startAdjusting = (delta: number) => {
    let speed = 300;

    adjust(delta); // immediate

    timeoutRef.current = setTimeout(() => {
      const tick = () => {
        adjust(delta);

        speed = Math.max(50, speed - 30);
        intervalRef.current = setTimeout(tick, speed);
      };

      tick();
    }, 400);
  };

  const stopAdjusting = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (intervalRef.current) clearTimeout(intervalRef.current);
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
    <div className="flex justify-center items-center gap-5 mt-3">
      {/* Decrement */}
      <button
        className="w-[50px] h-[50px] text-2xl rounded-lg border disabled:opacity-50"
        onMouseDown={() => startAdjusting(-1)}
        onMouseUp={stopAdjusting}
        onMouseLeave={stopAdjusting}
        onTouchStart={() => startAdjusting(-1)}
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
        className="w-[50px] h-[50px] text-2xl rounded-lg border disabled:opacity-50"
        onMouseDown={() => startAdjusting(1)}
        onMouseUp={stopAdjusting}
        onMouseLeave={stopAdjusting}
        onTouchStart={() => startAdjusting(1)}
        onTouchEnd={stopAdjusting}
        disabled={value >= max}
      >
        +
      </button>
    </div>
  );
}
