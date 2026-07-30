import { Settings } from "lucide-react";

interface Props {
  onCreateNewGame: () => void;
  onJoinGame: () => void;
  onManagePastGames: () => void;
  onOpenSettings: () => void;
}

export function MainMenuPage({
  onCreateNewGame,
  onJoinGame,
  onManagePastGames,
  onOpenSettings,
}: Props) {
  return (
    <div className="min-h-dvh flex flex-col overflow-y-auto relative bg-white">
      {/* Settings Cog */}
      <button
        onClick={onOpenSettings}
        className="absolute top-3 right-3 z-50 p-2 text-gray-500 hover:text-gray-700 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg"
        aria-label="Settings"
      >
        <Settings size={28} />
      </button>

      {/* Logo — scales down on small screens */}
      <div className="flex flex-col items-center mt-8 mb-8 px-6">
        <img
          src="/bridge-box-logo.png"
          alt="Bridge Box"
          className="w-48 sm:w-64 h-auto block"
        />
      </div>

      {/* Buttons — centred with max-width */}
      <div className="flex flex-col gap-3 px-6 pb-8 max-w-sm w-full mx-auto">
        <button
          onClick={onJoinGame}
          className="w-full py-3.5 text-lg font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          Join Game
        </button>

        <button
          onClick={onCreateNewGame}
          className="w-full py-3.5 text-lg font-semibold bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          Create New Game
        </button>

        <button
          onClick={onManagePastGames}
          className="w-full py-3.5 text-lg font-semibold bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          Manage Past Games
        </button>
      </div>
    </div>
  );
}
