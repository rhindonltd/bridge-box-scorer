import { useMemo } from "react";

type InlineBoardResultProps = {
  contract: string; // e.g. "4H" — first char is the level
  mode: "made" | "down";
  value: number;
  onModeChange: (mode: "made" | "down") => void;
  onValueChange: (value: number) => void;
};

export function InlineBoardResult({
  contract,
  mode,
  value,
  onModeChange,
  onValueChange,
}: InlineBoardResultProps) {
  const level = parseInt(contract[0], 10) || 1;
  const requiredTricks = 6 + level;
  const maxOver = 13 - requiredTricks;
  const maxDown = requiredTricks;

  const values = useMemo(() => {
    return mode === "made"
      ? Array.from({ length: maxOver + 1 }, (_, i) => i)
      : Array.from({ length: maxDown }, (_, i) => i + 1);
  }, [mode, maxOver, maxDown]);

  return (
    <div className="space-y-2 h-full">
      {/* Made/Down toggle */}
      <div className="grid grid-cols-2 gap-1">
        <button
          onClick={() => {
            onModeChange("made");
            onValueChange(0);
          }}
          className={
            mode === "made"
              ? "rounded-lg bg-green-600 py-1.5 text-white"
              : "rounded-lg border py-1.5"
          }
        >
          Made
        </button>

        <button
          onClick={() => {
            onModeChange("down");
            onValueChange(1);
          }}
          className={
            mode === "down"
              ? "rounded-lg bg-red-600 py-1.5 text-white"
              : "rounded-lg border py-1.5"
          }
        >
          Down
        </button>
      </div>

      {/* Number grid */}
      <div className="grid grid-cols-4 gap-1">
        {values.map((v) => (
          <button
            key={v}
            onClick={() => onValueChange(v)}
            className={[
              "rounded-xl py-1.5 text-sm font-medium",
              v === value ? "bg-black text-white" : "border",
            ].join(" ")}
          >
            {mode === "made" ? `+${v}` : `-${v}`}
          </button>
        ))}
      </div>
    </div>
  );
}
