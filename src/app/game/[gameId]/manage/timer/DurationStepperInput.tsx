"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  /** Accessible name for the input (kept stable for tests). */
  label: string;
  /** Current numeric value from config. */
  value: number;
  /** Called with the committed numeric value. */
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  /** Optional short suffix rendered inside the field (e.g. "m", "s"). */
  suffix?: string;
  disabled?: boolean;
  /**
   * When true the value is shown but cannot be changed. Unlike `disabled` this
   * keeps the field readable/greyed and hides the stepper buttons, and it sets
   * the native `readonly` attribute (relied on by callers/tests).
   */
  readOnly?: boolean;
  /** Optional id for htmlFor label association. */
  id?: string;
}

/**
 * A compact number field with −/+ stepper buttons on either side. Designed for
 * touch: the steppers give a reliable way to change values on mobile, and the
 * text field can be cleared while typing (it shows empty rather than a sticky
 * zero) and commits a clamped number on blur.
 *
 * The middle element is a real `<input type="number">` so existing tests that
 * drive it via `fireEvent.change` and read `toHaveValue` continue to work.
 */
export function DurationStepperInput({
  label,
  value,
  onChange,
  min = 0,
  max = Infinity,
  suffix,
  disabled = false,
  readOnly = false,
  id,
}: Props) {
  // Local draft lets the user clear the box while typing without it snapping
  // back to 0. `null` means "not editing — show the committed value".
  const [draft, setDraft] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => stopAdjusting, []);

  const clamp = (val: number) => Math.max(min, Math.min(max, val));

  const commit = (raw: number) => {
    const next = clamp(Number.isFinite(raw) ? raw : min);
    onChange(next);
  };

  const step = (delta: number) => {
    setDraft(null);
    commit(value + delta);
  };

  const startAdjusting = (delta: number) => {
    let speed = 300;
    step(delta); // immediate
    timeoutRef.current = setTimeout(() => {
      const tick = () => {
        step(delta);
        speed = Math.max(60, speed - 30);
        intervalRef.current = setTimeout(tick, speed);
      };
      tick();
    }, 400);
  };

  function stopAdjusting() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (intervalRef.current) clearTimeout(intervalRef.current);
    timeoutRef.current = null;
    intervalRef.current = null;
  }

  const displayValue = draft ?? String(value);

  const btnClass =
    "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-gray-300 bg-white text-2xl leading-none text-gray-700 select-none active:scale-95 transition disabled:opacity-40 disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500";

  const inputEl = (
    <div className="relative flex-1">
      <input
        id={id}
        aria-label={label}
        type="number"
        inputMode="numeric"
        disabled={disabled}
        readOnly={readOnly}
        aria-readonly={readOnly || undefined}
        value={displayValue}
        min={min}
        max={Number.isFinite(max) ? max : undefined}
        onFocus={(e) => !readOnly && e.target.select()}
        onChange={(e) => {
          if (readOnly) return;
          const raw = e.target.value;
          setDraft(raw);
          // Keep config in sync as they type when the value is a real number,
          // so existing change-driven behaviour/tests still fire.
          if (raw !== "" && !Number.isNaN(Number(raw))) {
            commit(Number(raw));
          }
        }}
        onBlur={() => {
          if (readOnly) return;
          if (draft === "") {
            // Empty on blur falls back to the clamped minimum.
            commit(min);
          } else if (draft !== null) {
            commit(Number(draft));
          }
          setDraft(null);
        }}
        className={`h-11 w-full min-w-0 rounded-xl border-2 px-3 ${
          suffix ? "pr-7" : ""
        } text-center text-lg tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${
          readOnly
            ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-600"
            : "border-gray-300 bg-white focus:border-blue-500"
        } disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-600`}
      />
      {suffix ? (
        <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-sm text-gray-400">
          {suffix}
        </span>
      ) : null}
    </div>
  );

  // Read-only structural values have no steppers to change them.
  if (readOnly) {
    return <div className="flex items-stretch">{inputEl}</div>;
  }

  return (
    <div className="flex items-stretch gap-2">
      <button
        type="button"
        aria-label={`Decrease ${label}`}
        className={btnClass}
        disabled={disabled || value <= min}
        onPointerDown={(e) => {
          e.preventDefault();
          startAdjusting(-1);
        }}
        onPointerUp={stopAdjusting}
        onPointerLeave={stopAdjusting}
        onPointerCancel={stopAdjusting}
      >
        −
      </button>

      {inputEl}

      <button
        type="button"
        aria-label={`Increase ${label}`}
        className={btnClass}
        disabled={disabled || value >= max}
        onPointerDown={(e) => {
          e.preventDefault();
          startAdjusting(1);
        }}
        onPointerUp={stopAdjusting}
        onPointerLeave={stopAdjusting}
        onPointerCancel={stopAdjusting}
      >
        +
      </button>
    </div>
  );
}
