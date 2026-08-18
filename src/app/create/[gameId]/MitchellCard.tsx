import { MitchellMovementSpec } from "@/movement/mitchell/mitchell-utils";

type Props = {
  name: string;
  spec: MitchellMovementSpec;
  onSelect: () => void;
};

export function MitchellCard({ name, spec, onSelect }: Props) {
  const totalBoards = spec.tables * spec.boardsPerRound;

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 shadow-sm w-full">
      <h2 className="text-lg font-semibold text-gray-900">{name}</h2>

      <h3 className="text-md font-semibold text-gray-900">
        Each pair plays {spec.rounds * spec.boardsPerRound} boards
      </h3>

      <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
        <div className="rounded-lg bg-white p-2 text-center">
          <div className="text-xs text-gray-500">Rounds</div>
          <div className="font-medium text-gray-900">{spec.rounds}</div>
        </div>

        <div className="rounded-lg bg-white p-2 text-center">
          <div className="text-xs text-gray-500">Boards per Round</div>
          <div className="font-medium text-gray-900">{spec.boardsPerRound}</div>
        </div>

        <div className="rounded-lg bg-white p-2 text-center">
          <div className="text-xs text-gray-500">Total Boards</div>
          <div className="font-medium text-gray-900">{totalBoards}</div>
        </div>
      </div>

      <button
        type="button"
        onClick={onSelect}
        className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white
          hover:bg-blue-700
          active:scale-[0.98]
          transition-all duration-150
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Show Movement Details
      </button>
    </div>
  );
}
