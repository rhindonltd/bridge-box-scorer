import { PlayHeader } from "@/components/play/PlayHeader";

interface Props {
  boardNumber: number;
}

export function WaitingForConfirmation({ boardNumber }: Props) {
  return (
    <div className="h-dvh flex flex-col bg-gray-100">
      <PlayHeader detail={`Board ${boardNumber}`} />

      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full mb-4" />
        <div className="text-xl font-semibold text-gray-900">Waiting for confirmation</div>
        <div className="text-base text-gray-500 mt-2 text-center">
          The other pair needs to enter their result for this board.
        </div>
      </div>
    </div>
  );
}
