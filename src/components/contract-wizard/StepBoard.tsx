"use client";

type Props = {
  boards: number[];
  playedBoards: number[];
  onBoardSelected: (board: number) => void;
};

export function StepBoard({ boards, playedBoards, onBoardSelected }: Props) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6">
      <h2 className="text-xl font-bold text-center mb-6">Select Board</h2>
      <div className="grid grid-cols-3 gap-4 max-w-xs w-full">
        {boards.map((board) => {
          const isPlayed = playedBoards.includes(board);
          return (
            <button
              key={board}
              type="button"
              disabled={isPlayed}
              data-testid={`wizard-board-${board}`}
              className={`text-2xl font-bold py-6 rounded-xl transition ${
                isPlayed
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98]"
              }`}
              onClick={() => onBoardSelected(board)}
            >
              {board}
            </button>
          );
        })}
      </div>
    </div>
  );
}
