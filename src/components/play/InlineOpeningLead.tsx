import { Rank, Ranks, Suit, SuitMap } from "@/model/common";

type InlineOpeningLeadProps = {
  suit: Suit | null;
  rank: Rank | null;
  onSuitChange: (suit: Suit) => void;
  onRankChange: (rank: Rank) => void;
};

function suitStyle(s: Suit, selected: boolean) {
  switch (s) {
    case "H":
      return selected
        ? "bg-red-600 text-white"
        : "bg-red-50 text-red-600 border-red-200";
    case "D":
      return selected
        ? "bg-orange-500 text-white"
        : "bg-orange-50 text-orange-600 border-orange-200";
    case "S":
      return selected
        ? "bg-gray-900 text-white"
        : "bg-gray-50 text-gray-700 border-gray-200";
    case "C":
      return selected
        ? "bg-emerald-700 text-white"
        : "bg-emerald-50 text-emerald-700 border-emerald-200";
  }
}

export function InlineOpeningLead({
  suit,
  rank,
  onSuitChange,
  onRankChange,
}: InlineOpeningLeadProps) {
  return (
    <div className="flex flex-col gap-1 h-full">
      {/* Suit selection — single row */}
      <div className="grid grid-cols-4 gap-1">
        {(Object.keys(SuitMap) as Suit[]).map((s) => {
          const selected = s === suit;

          return (
            <button
              key={s}
              onClick={() => onSuitChange(s)}
              className={[
                "rounded-lg text-lg py-1.5 border flex items-center justify-center",
                suitStyle(s, selected),
              ].join(" ")}
            >
              {SuitMap[s]}
            </button>
          );
        })}
      </div>

      {/* Rank selection — 4-column grid */}
      <div className="grid grid-cols-4 gap-1">
        {Ranks.map((r) => (
          <button
            key={r}
            onClick={() => onRankChange(r)}
            className={[
              "rounded-xl py-1.5 text-sm border transition",
              r === rank ? "bg-black text-white" : "hover:bg-gray-50",
            ].join(" ")}
          >
            {r}
          </button>
        ))}
      </div>
    </div>
  );
}
