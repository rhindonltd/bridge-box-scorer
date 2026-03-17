import { useRef } from "react";

export type Props = {
  value: number;
  showPlus?: boolean;
  zeroCharacter?: string;
  min?: number; // minimum value
  max?: number; // maximum value
  onAdjustValue: (x: number) => void;
};

export default function NumberStepper({
  value,
  showPlus,
  zeroCharacter = "=",
  min = -Infinity,
  max = Infinity,
  onAdjustValue,
}: Props) {
  const resultText =
    value === 0
      ? zeroCharacter
      : value > 0
        ? showPlus
          ? `+${value}`
          : `${value}`
        : `${value}`;

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const startAdjusting = (delta: number) => {
    let speed = 300; // initial delay (ms)

    // Adjust immediately if within bounds
    if (value + delta >= min && value + delta <= max) {
      onAdjustValue(delta);
    }

    timeoutRef.current = setTimeout(() => {
      intervalRef.current = setInterval(() => {
        if (value + delta >= min && value + delta <= max) {
          onAdjustValue(delta);
        }

        // accelerate (down to a minimum speed)
        speed = Math.max(50, speed - 30);

        clearInterval(intervalRef.current!);
        intervalRef.current = setInterval(() => {
          if (value + delta >= min && value + delta <= max) {
            onAdjustValue(delta);
          }
        }, speed);
      }, speed);
    }, 400); // delay before hold starts
  };

  const stopAdjusting = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  return (
    <div className="flex justify-center items-center gap-5 mt-3">
      {/* Decrement button */}
      <button
        className="w-[50px] h-[50px] text-2xl rounded-lg border disabled:opacity-50"
        onMouseDown={() => startAdjusting(-1)}
        onMouseUp={stopAdjusting}
        onMouseLeave={stopAdjusting}
        onTouchStart={() => startAdjusting(-1)}
        onTouchEnd={stopAdjusting}
        disabled={value <= min} // disable at min
      >
        −
      </button>

      {/* Value display */}
      <div className="text-3xl font-bold min-w-[60px] text-center">
        {resultText}
      </div>

      {/* Increment button */}
      <button
        className="w-[50px] h-[50px] text-2xl rounded-lg border disabled:opacity-50"
        onMouseDown={() => startAdjusting(1)}
        onMouseUp={stopAdjusting}
        onMouseLeave={stopAdjusting}
        onTouchStart={() => startAdjusting(1)}
        onTouchEnd={stopAdjusting}
        disabled={value >= max} // disable at max
      >
        +
      </button>
    </div>
  );
}
