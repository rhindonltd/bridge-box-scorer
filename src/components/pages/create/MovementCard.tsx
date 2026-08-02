import { PairMovementSpec, TeamMovementSpec } from "@/db/movements/schema";

type Props = {
  movement: PairMovementSpec | TeamMovementSpec;
  onSelected: (movementId: number) => void;
};

export function MovementCard({ movement, onSelected }: Props) {
  return (
    <button
      type="button"
      onClick={() => onSelected(movement.id)}
      className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm text-left w-full
        hover:border-blue-300 hover:shadow-md
        active:scale-[0.98] active:bg-blue-50
        transition-all duration-150
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
    >
      <h2 className="text-lg font-semibold text-gray-900">{movement.name}</h2>

      <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
        <Info label="Rounds" value={movement.rounds} />
        <Info label="Boards Per Round" value={movement.boardsPerRound} />
        <Info label="Boards" value={movement.boards} />
      </div>
    </button>
  );
}

type InfoProps = {
  label: string;
  value: string | number;
};

function Info({ label, value }: InfoProps) {
  return (
    <div className="rounded-lg bg-gray-50 p-2 text-center">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="font-medium text-gray-900">{value}</div>
    </div>
  );
}
