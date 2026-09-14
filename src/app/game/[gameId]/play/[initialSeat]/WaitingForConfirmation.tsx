import { GamePageLayout } from "@/components/layout/GamePageLayout";
import { Spinner } from "@/components/common/Spinner";

interface Props {
  boardNumber: number;
  /** Right-hand header content (the play header menu). */
  headerRight?: React.ReactNode;
}

export function WaitingForConfirmation({ boardNumber, headerRight }: Props) {
  return (
    <GamePageLayout
      headerTitle={`Board ${boardNumber}`}
      headerRight={headerRight}
      centerContent={true}
    >
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <Spinner size="lg" className="mb-4" />
        <div className="text-xl font-semibold text-gray-900">
          Waiting for confirmation
        </div>
        <div className="text-base text-gray-500 mt-2 text-center">
          The other pair needs to enter their result for this board.
        </div>
      </div>
    </GamePageLayout>
  );
}
