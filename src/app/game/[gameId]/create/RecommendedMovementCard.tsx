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
      data-testid="movement-card"
      className="flex w-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white text-left shadow-sm
        hover:border-blue-300 hover:shadow-md
        active:scale-[0.98] active:bg-blue-50
        transition-all duration-150
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
    >
      <div className="border-b border-gray-200 bg-gray-50 px-4 py-2.5">
        <h3 className="text-base font-bold text-gray-900">{movement.name}</h3>
      </div>

      <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100 text-center">
        <Stat label="Rounds" value={movement.rounds} />
        <Stat label="Boards / Round" value={movement.boardsPerRound} />
        <Stat label="Boards per Set" value={movement.boardsInPlay} />
      </div>

      {(movement.pros.length > 0 || movement.cons.length > 0) && (
        <div className="grid gap-1.5 p-3 sm:grid-cols-2">
          <ProsConsList items={movement.pros} tone="pro" />
          <ProsConsList items={movement.cons} tone="con" />
        </div>
      )}

      {movement.copies > 1 && (
        <p className="flex items-start gap-1.5 px-3 pb-3 text-xs font-medium text-amber-700">
          <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
          <span>Needs {movement.copies} sets of boards.</span>
        </p>
      )}

      {movement.note && (
        <p className="flex items-start gap-1.5 px-3 pb-3 text-xs text-gray-500">
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
    <div className="px-2 py-2">
      <div className="text-base font-semibold text-gray-900">{value}</div>
      <div className="text-[11px] leading-tight text-gray-500">{label}</div>
    </div>
  );
}

type ProsConsListProps = {
  items: string[];
  tone: "pro" | "con";
};

function ProsConsList({ items, tone }: ProsConsListProps) {
  if (items.length === 0) return null;

  const isPro = tone === "pro";
  const Icon = isPro ? Check : Minus;
  const iconColor = isPro ? "text-green-600" : "text-amber-600";

  return (
    <ul className="space-y-1">
      {items.map((item, index) => (
        <li
          key={index}
          className="flex items-start gap-1.5 text-xs leading-snug text-gray-700"
        >
          <Icon
            className={`mt-0.5 h-3 w-3 flex-shrink-0 ${iconColor}`}
            aria-hidden="true"
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
