import { GamePageLayout } from "@/components/layout/GamePageLayout";

interface Props {
  round: number;
  tableNumber?: number | null;
  onHandleSitOutContinue: () => void;
}

export function SitOutPage({
  round,
  tableNumber,
  onHandleSitOutContinue,
}: Props) {
  const heading =
    tableNumber != null ? `Sit Out at Table ${tableNumber}` : "Sit Out";

  return (
    <GamePageLayout
      headerTitle={`Round ${round}`}
      centerContent={true}
      actions={
        <button
          onClick={onHandleSitOutContinue}
          className="w-full py-3.5 text-lg font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          Continue
        </button>
      }
    >
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="text-2xl font-bold text-gray-900 mb-2">{heading}</div>
        <div className="text-base text-gray-500 text-center">
          You have a sit-out this round. Please wait for the next round.
        </div>
      </div>
    </GamePageLayout>
  );
}
