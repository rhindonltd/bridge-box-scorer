"use client";

import { useState } from "react";
import { ShowTablesPage } from "./ShowTablesPage";
import { ShowMovementsPage } from "./ShowMovementsPage";
import { createFlow, useFlow } from "@/hooks/flow";
import { useGame } from "@/context/GameContext";
import { ShareDirectorAccess } from "@/components/pages/manage/ShareDirectorAccess";

const setupGameFlow = createFlow(
  {
    tables: {},
    movements: {},
  },
  ["tables", "movements"] as const,
);

export function SetupGamePage() {
  const { game } = useGame();
  const { step, goTo } = useFlow(setupGameFlow, {}, `/create/${game?.gameId}`);
  const [showShare, setShowShare] = useState(false);

  if (!game) {
    return null;
  }

  if (showShare) {
    return (
      <ShareDirectorAccess
        gameId={game.gameId}
        onClose={() => setShowShare(false)}
      />
    );
  }

  if (step === "tables") {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1">
          <ShowTablesPage onShowMovementsPage={() => goTo("movements")} />
        </div>
        <div className="p-4 border-t">
          <button
            onClick={() => setShowShare(true)}
            className="w-full py-2.5 text-base font-semibold text-gray-600 border border-gray-300 rounded-xl hover:bg-gray-50 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            Share Director Access
          </button>
        </div>
      </div>
    );
  }

  if (step === "movements") {
    return <ShowMovementsPage onShowTablesPage={() => goTo("tables")} />;
  }
}
