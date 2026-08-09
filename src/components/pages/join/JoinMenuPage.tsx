interface Props {
  onJoinAsPlayer: () => void;
}

export function JoinMenuPage({
  onJoinAsPlayer
}: Props) {
  return (
    <div className="flex-1 flex flex-col overflow-y-auto relative">
      {/* Logo — scales down on small screens */}
      <div className="flex flex-col items-center mt-8 mb-8 px-6">
        <img
          src="/bridge-box-logo.png"
          alt="Bridge Box"
          className="w-48 sm:w-64 h-auto block"
        />
      </div>

      {/* Buttons */}
      <div className="flex flex-col gap-3 px-6 pb-8 max-w-sm w-full mx-auto">
        <button
          onClick={onJoinAsPlayer}
          className="w-full py-3.5 text-lg font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          Join As Player
        </button>
      </div>
    </div>
  );
}
