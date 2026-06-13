interface Props {
  onJoinAsPlayer: () => void;
  onShowTimer: () => void;
  onShowLeaderboard: () => void;
}

export function JoinMenuPage({
  onJoinAsPlayer,
  onShowTimer,
  onShowLeaderboard,
}: Props) {
  return (
    <div className="h-screen flex flex-col overflow-y-auto relative">
      {/* Logo */}
      <div className="flex flex-col items-center mt-6 mb-6 relative z-0">
        <img
          src="/bridge-box-logo.png"
          alt="Bridge Box"
          className="w-64 h-auto mb-2 block"
        />
      </div>

      {/* Buttons */}
      <div className="flex flex-col gap-4 px-4 pb-6 max-w-md w-full mx-auto relative z-10">
        <button
          onClick={onJoinAsPlayer}
          className="w-full py-3 text-lg font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:scale-[0.98] transition"
        >
          Join As Player
        </button>

        <button
          onClick={onShowTimer}
          className="w-full py-3 text-lg font-semibold bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 active:scale-[0.98] transition"
        >
          Show Timer
        </button>

        <button
          onClick={onShowLeaderboard}
          className="w-full py-3 text-lg font-semibold bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 active:scale-[0.98] transition"
        >
          Show Leaderboard
        </button>
      </div>
    </div>
  );
}
