import { useMemo, useState } from "react";
import { Card, Rank, Ranks, Suit, SuitMap } from "@/model/common";

type Props = {
  onSave: (lead: Card) => void;
  initialSuit?: Suit;
  initialRank?: Rank;
  onSuitChange?: (suit: Suit) => void;
  onRankChange?: (rank: Rank) => void;
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

export function OpeningLead({
  onSave,
  initialSuit,
  initialRank,
  onSuitChange,
  onRankChange,
}: Props) {
  const [suit, setSuit] = useState<Suit>(initialSuit ?? "S");
  const [rank, setRank] = useState<Rank>(initialRank ?? "A");

  const handleSuitChange = (s: Suit) => {
    setSuit(s);
    onSuitChange?.(s);
  };

  const handleRankChange = (r: Rank) => {
    setRank(r);
    onRankChange?.(r);
  };

  const lead = useMemo<Card>(() => `${suit}${rank}` as Card, [suit, rank]);

  const isRed = suit === "H" || suit === "D";

  return (
    <div className="flex flex-1 flex-col p-4 min-h-0">
      {/* Main content — fills available space */}
      <div className="flex-1 flex flex-col min-h-0 gap-3">
        {/* TOP SECTION — suits + card preview (takes ~30% of space) */}
        <div className="flex-[3] flex gap-3 min-h-0">
          {/* SUITS — 2x2 grid, expands to fill space next to card */}
          <div className="grid grid-cols-2 gap-1.5 flex-1">
            {(Object.keys(SuitMap) as Suit[]).map((s) => {
              const selected = s === suit;
              return (
                <button
                  key={s}
                  onClick={() => handleSuitChange(s)}
                  className={[
                    "rounded-lg text-2xl border flex items-center justify-center",
                    suitStyle(s, selected),
                  ].join(" ")}
                >
                  {SuitMap[s]}
                </button>
              );
            })}
          </div>

          {/* PREVIEW CARD — 7:5 aspect ratio, fills height */}
          <div className="h-full aspect-[5/7] rounded-xl border bg-white shadow-md relative">
            {/* TOP LEFT */}
            <div
              className={[
                "absolute left-2 top-1.5 font-bold",
                isRed ? "text-red-600" : "text-gray-900",
              ].join(" ")}
            >
              <div className="text-base md:text-lg">{rank}</div>
              <div className="text-lg md:text-xl leading-none">
                {SuitMap[suit]}
              </div>
            </div>

            {/* BOTTOM RIGHT */}
            <div
              className={[
                "absolute bottom-1.5 right-2 rotate-180 font-bold",
                isRed ? "text-red-600" : "text-gray-900",
              ].join(" ")}
            >
              <div className="text-base md:text-lg">{rank}</div>
              <div className="text-lg md:text-xl leading-none">
                {SuitMap[suit]}
              </div>
            </div>

            {/* CENTER */}
            <div
              className={[
                "flex h-full items-center justify-center text-2xl md:text-7xl font-bold",
                isRed ? "text-red-600" : "text-gray-900",
              ].join(" ")}
            >
              {SuitMap[suit]}
            </div>
          </div>
        </div>

        {/* RANK GRID — takes ~70% of space, buttons grow to fill */}
        <div className="flex-[7] grid grid-cols-4 gap-2 min-h-0 auto-rows-fr">
          {Ranks.map((r) => (
            <button
              key={r}
              onClick={() => handleRankChange(r)}
              className={[
                "rounded-xl text-lg font-medium border transition flex items-center justify-center",
                r === rank ? "bg-black text-white" : "hover:bg-gray-50",
              ].join(" ")}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* FOOTER — pinned to bottom */}
      <div className="shrink-0 pt-3">
        <button
          onClick={() => onSave(lead)}
          className="w-full rounded-xl bg-blue-600 py-3 text-lg font-bold text-white"
        >
          Next
        </button>
      </div>
    </div>
  );
}
