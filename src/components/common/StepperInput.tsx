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
  /** Amount the −/+ buttons change the value by. Defaults to 1. */
  step?: number;
  /**
   * When true, stepping past `max` wraps to `min` and vice versa (used for the
   * seconds field, which cycles 0 → 15 → 30 → 45 → 0). Requires a finite `max`.
   */
  wrap?: boolean;
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
 * A compact number field presented as a single segmented control: a −/+ pair
 * flanks a centred text field inside one shared rounded border, so it reads as
 * one control rather than three separate boxes.
 *
 * Designed for touch: the steppers give a reliable way to change values on
 * mobile (press-and-hold auto-repeats), and the text field can be cleared while
 * typing (it shows empty rather than a sticky zero) and commits a clamped
 * number on blur.
 *
 * The middle element is a real `<input type="number">` so existing tests that
 * drive it via `fireEvent.change` and read `toHaveValue` continue to work.
 */
export function StepperInput({
  label,
  value,
  onChange,
  min = 0,
  max = Infinity,
  step = 1,
  wrap = false,
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

  // Compute the next value for a −/+ press. With `wrap` (and a finite max) the
  // value cycles between min and max in `step` increments; otherwise it just
  // moves by `step` and clamps at the ends.
  const nextValue = (direction: 1 | -1) => {
    if (wrap && Number.isFinite(max)) {
      const span = max - min + step; // e.g. 45 - 0 + 15 = 60 → wraps 0..45
      const offset = ((value - min + direction * step) % span + span) % span;
      return min + offset;
    }
    return clamp(value + direction * step);
  };

  const stepBy = (direction: 1 | -1) => {
    setDraft(null);
    commit(nextValue(direction));
  };

  const startAdjusting = (direction: 1 | -1) => {
    let speed = 300;
    stepBy(direction); // immediate
    timeoutRef.current = setTimeout(() => {
      const tick = () => {
        stepBy(direction);
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

  const input = (
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
        className={`h-11 w-full min-w-0 bg-transparent px-1 ${
          suffix ? "pr-5" : ""
        } text-center text-lg font-medium tabular-nums text-gray-900 focus:outline-none [appearance:textfield] disabled:text-gray-500 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
      />
      {suffix ? (
        <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-sm text-gray-400">
          {suffix}
        </span>
      ) : null}
    </div>
  );

  // Read-only structural values have no steppers to change them: render the
  // value in a plain bordered field.
  if (readOnly) {
    return (
      <div className="flex h-11 items-center rounded-xl border-2 border-gray-200 bg-gray-100">
        {input}
      </div>
    );
  }

  const stepBtn =
    "flex h-11 w-11 shrink-0 items-center justify-center text-2xl leading-none text-gray-600 select-none transition active:bg-gray-100 disabled:opacity-30 disabled:active:bg-transparent focus-visible:outline-none focus-visible:bg-blue-50 focus-visible:text-blue-700";

  return (
    <div className="flex h-11 items-stretch overflow-hidden rounded-xl border-2 border-gray-300 bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500">
      <button
        type="button"
        aria-label={`Decrease ${label}`}
        className={`${stepBtn} border-r border-gray-200`}
        disabled={disabled || (!wrap && value <= min)}
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

      {input}

      <button
        type="button"
        aria-label={`Increase ${label}`}
        className={`${stepBtn} border-l border-gray-200`}
        disabled={disabled || (!wrap && value >= max)}
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
