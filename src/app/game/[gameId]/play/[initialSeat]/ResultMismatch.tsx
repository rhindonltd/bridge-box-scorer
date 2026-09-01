import { GamePageLayout } from "@/components/layout/GamePageLayout";
import { BoardResult as ContractDisplay } from "@/components/traveller/BoardResult";
import { BoardOutcome } from "@/model/score";

interface Props {
  nsBoardNumber: number;
  nsResult: string;
  ewBoardNumber: number;
  ewResult: string;
  onReenter: () => void;
}

export function ResultMismatch({
  nsBoardNumber,
  nsResult,
  ewBoardNumber,
  ewResult,
  onReenter,
}: Props) {
  const boardMismatch = nsBoardNumber !== ewBoardNumber;

  return (
    <GamePageLayout
      headerTitle={boardMismatch ? "Mismatch" : `Board ${nsBoardNumber}`}
      centerContent={true}
      actions={
        <button
          onClick={onReenter}
          className="w-full py-3.5 text-lg font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          Re-enter Result
        </button>
      }
    >
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="text-xl font-bold text-red-600 mb-4">
          Results Don&apos;t Match
        </div>
        <div className="text-base text-gray-700 text-center mb-6">
          {boardMismatch
            ? "The two sides entered results for different boards. Please discuss and re-enter."
            : "The two sides entered different results. Please discuss and re-enter the correct contract."}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 w-full max-w-xs text-center space-y-2">
          <div className="text-sm text-gray-500">NS entered:</div>
          <div className="font-semibold text-gray-900 text-lg">
            {boardMismatch && (
              <span className="text-sm text-gray-500 mr-1">
                Board {nsBoardNumber}:{" "}
              </span>
            )}
            <ContractDisplay boardOutcome={nsResult as BoardOutcome} />
          </div>
          <div className="text-sm text-gray-500 pt-2">EW entered:</div>
          <div className="font-semibold text-gray-900 text-lg">
            {boardMismatch && (
              <span className="text-sm text-gray-500 mr-1">
                Board {ewBoardNumber}:{" "}
              </span>
            )}
            <ContractDisplay boardOutcome={ewResult as BoardOutcome} />
          </div>
        </div>
      </div>
    </GamePageLayout>
  );
}
