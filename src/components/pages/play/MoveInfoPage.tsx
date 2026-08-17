import { GamePageLayout } from "@/components/layout/GamePageLayout";

interface Props {
  roundNumber: number;
  tableNumber: number;
  sitOut: boolean;
  onMoveInfoContinue: () => void;
}

export function MoveInfoPage({
  roundNumber,
  tableNumber,
  sitOut,
  onMoveInfoContinue,
}: Props) {
  // If the next round is a sit-out, skip the "move to table" screen
  if (sitOut) {
    return (
      <GamePageLayout
        headerTitle="Move Info"
        centerContent={true}
        children={
          <div className="flex-1 flex flex-col items-center justify-center p-6">
            <div className="text-xl font-semibold text-gray-900 mb-2">Next</div>
            <div className="text-4xl font-bold text-blue-600 mb-4">Sit Out</div>
            <div className="text-base text-gray-500">Round {roundNumber}</div>
          </div>
        }
        actions={
          <button
            onClick={onMoveInfoContinue}
            className="w-full py-3.5 text-lg font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            Continue
          </button>
        }
      />
    );
  }

  return (
    <GamePageLayout
      headerTitle="Move Info"
      centerContent={true}
      children={
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="text-xl font-semibold text-gray-900 mb-2">
            Move to
          </div>
          <div className="text-4xl font-bold text-blue-600 mb-4">
            Table {tableNumber}
          </div>
          <div className="text-base text-gray-500">Round {roundNumber}</div>
        </div>
      }
      actions={
        <button
          onClick={onMoveInfoContinue}
          className="w-full py-3.5 text-lg font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          Continue
        </button>
      }
    />
  );
}
