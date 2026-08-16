import { PlayHeader } from "@/components/play/PlayHeader";

interface Props {
    roundNumber: number;
    tableNumber: number;
    sitOut: boolean;
    onMoveInfoContinue: () => void;
}

export function MoveInfoPage({ roundNumber, tableNumber, sitOut, onMoveInfoContinue }: Props) {
    // If the next round is a sit-out, skip the "move to table" screen
    if (sitOut) {
        return (
            <div className="h-dvh flex flex-col bg-gray-100">
                <PlayHeader detail="Round Complete" />

                <div className="flex-1 flex flex-col items-center justify-center p-6">
                    <div className="text-xl font-semibold text-gray-900 mb-2">
                        Next up
                    </div>
                    <div className="text-4xl font-bold text-blue-600 mb-4">
                        Sit Out
                    </div>
                    <div className="text-base text-gray-500">
                        Round {roundNumber}
                    </div>
                </div>

                <div className="p-4 shrink-0">
                    <button
                        onClick={onMoveInfoContinue}
                        className="w-full py-3.5 text-lg font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                    >
                        Continue
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-dvh flex flex-col bg-gray-100">
            <PlayHeader detail="Round Complete" />

            <div className="flex-1 flex flex-col items-center justify-center p-6">
                <div className="text-xl font-semibold text-gray-900 mb-2">
                    Move to
                </div>
                <div className="text-4xl font-bold text-blue-600 mb-4">
                    Table {tableNumber}
                </div>
                <div className="text-base text-gray-500">
                    Round {roundNumber}
                </div>
            </div>

            <div className="p-4 shrink-0">
                <button
                    onClick={onMoveInfoContinue}
                    className="w-full py-3.5 text-lg font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                >
                    Continue
                </button>
            </div>
        </div>
    );
}
