import { Check, Minus, Info } from "lucide-react";
import { RecommendedMovement } from "@/movement/recommendations/recommendation-types";

type Props = {
  movement: RecommendedMovement;
  onSelect: () => void;
};

/**
 * A selectable card for a single recommended movement. Shows the movement's key
 * stats plus a short pros/cons summary so the director can decide quickly.
 * Presentation-only: selection is delegated to `onSelect`.
 */
export function RecommendedMovementCard({ movement, onSelect }: Props) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm text-left w-full
        hover:border-blue-300 hover:shadow-md
        active:scale-[0.98] active:bg-blue-50
        transition-all duration-150
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
    >
      <h2 className="text-lg font-semibold text-gray-900">{movement.name}</h2>

      <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <Stat label="Rounds" value={movement.rounds} />
        <Stat label="Boards in a Set" value={movement.boardsPerRound} />
        <Stat label="Copies of each Set" value={movement.copies} />
        <Stat label="Boards a Pair Plays" value={movement.boardsPerPair} />
      </div>

      {(movement.pros.length > 0 || movement.cons.length > 0) && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <ProsConsList
            items={movement.pros}
            tone="pro"
            title="Pros"
          />
          <ProsConsList
            items={movement.cons}
            tone="con"
            title="Cons"
          />
        </div>
      )}

      {movement.note && (
        <p className="mt-3 flex items-start gap-1.5 text-xs text-gray-500">
          <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
          <span>{movement.note}</span>
        </p>
      )}
    </button>
  );
}

type StatProps = {
  label: string;
  value: string | number;
};

function Stat({ label, value }: StatProps) {
  return (
    <div className="rounded-lg bg-gray-50 p-2 text-center">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="font-medium text-gray-900">{value}</div>
    </div>
  );
}

type ProsConsListProps = {
  items: string[];
  tone: "pro" | "con";
  title: string;
};

function ProsConsList({ items, tone, title }: ProsConsListProps) {
  if (items.length === 0) return null;

  const isPro = tone === "pro";
  const Icon = isPro ? Check : Minus;
  const iconColor = isPro ? "text-green-600" : "text-amber-600";

  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {title}
      </h3>
      <ul className="mt-1 space-y-1">
        {items.map((item, index) => (
          <li
            key={index}
            className="flex items-start gap-1.5 text-sm text-gray-700"
          >
            <Icon
              className={`mt-0.5 h-3.5 w-3.5 flex-shrink-0 ${iconColor}`}
              aria-hidden="true"
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
