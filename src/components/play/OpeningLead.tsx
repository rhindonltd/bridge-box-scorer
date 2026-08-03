import { useMemo, useState } from "react";
import { Card, Rank, Ranks, Suit, SuitMap } from "@/model/common";

type Props = {
  onSave: (lead: Card) => void;
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

export function OpeningLead({ onSave }: Props) {
  const [suit, setSuit] = useState<Suit>("S");
  const [rank, setRank] = useState<Rank>("A");

  const lead = useMemo<Card>(() => `${suit}${rank}` as Card, [suit, rank]);

  const isRed = suit === "H" || suit === "D";

  return (
    <div className="flex flex-1 flex-col p-5">
      {/* HEADER */}
      {/*<header className="shrink-0 mb-2">*/}
      {/*  <h1 className="text-lg font-semibold">Opening Lead</h1>*/}
      {/*</header>*/}

      {/* TOP SECTION (FIXED HEIGHT — CRITICAL) */}
      <div className="shrink-0 h-[125px] flex gap-4 mb-3">
        {/* SUITS */}
        <div className="grid grid-cols-2 gap-2 flex-[0.45]">
          {(Object.keys(SuitMap) as Suit[]).map((s) => {
            const selected = s === suit;

            return (
              <button
                key={s}
                onClick={() => setSuit(s)}
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

        {/* PREVIEW CARD */}
        <div className="flex flex-[0.55] justify-end">
          <div className="relative h-full w-28 rounded-2xl border bg-white shadow-md">
            {/* TOP LEFT */}
            <div
              className={[
                "absolute left-3 top-2 text-base font-bold",
                isRed ? "text-red-600" : "text-gray-900",
              ].join(" ")}
            >
              <div className="text-lg">{rank}</div>
              <div className="text-xl leading-none">{SuitMap[suit]}</div>
            </div>

            {/* BOTTOM RIGHT */}
            <div
              className={[
                "absolute bottom-2 right-3 rotate-180 text-base font-bold",
                isRed ? "text-red-600" : "text-gray-900",
              ].join(" ")}
            >
              <div className="text-lg">{rank}</div>
              <div className="text-xl leading-none">{SuitMap[suit]}</div>
            </div>

            {/* CENTER */}
            <div
              className={[
                "flex h-full items-center justify-center text-6xl font-bold",
                isRed ? "text-red-600" : "text-gray-900",
              ].join(" ")}
            >
              {SuitMap[suit]}
            </div>
          </div>
        </div>
      </div>

      {/* GRID SECTION (NOW GUARANTEED TO FIT) */}
      <div className="flex-1 min-h-0">
        <div className="mb-2 text-xs text-gray-500">Rank</div>

        <div className="grid grid-cols-4 gap-2">
          {Ranks.map((r) => (
            <button
              key={r}
              onClick={() => setRank(r)}
              className={[
                "rounded-xl py-3 text-lg border transition",
                r === rank ? "bg-black text-white" : "hover:bg-gray-50",
              ].join(" ")}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* FOOTER */}
      <footer className="shrink-0 pt-3">
        <button
          onClick={() => onSave(lead)}
          className="w-full rounded-xl bg-blue-600 py-3 text-lg font-bold text-white"
        >
          Next
        </button>
      </footer>
    </div>
  );
}
