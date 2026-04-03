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
    <div className="h-screen flex flex-col overflow-y-auto relative">
      {/* Settings Cog */}
      <button
        onClick={onOpenSettings}
        className="absolute top-3 right-3 z-50 p-2 text-gray-400 hover:text-gray-600 transition-opacity opacity-60 hover:opacity-100"
        aria-label="Settings"
      >
        <Settings size={30} />
      </button>

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
          onClick={onJoinGame}
          className="w-full py-3 text-lg font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:scale-[0.98] transition"
        >
          Join Game
        </button>

        <button
          onClick={onCreateNewGame}
          className="w-full py-3 text-lg font-semibold bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 active:scale-[0.98] transition"
        >
          Create New Game
        </button>

        <button
          onClick={onManagePastGames}
          className="w-full py-3 text-lg font-semibold bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 active:scale-[0.98] transition"
        >
          Manage Past Games
        </button>
      </div>
    </div>
  );
}
