"use client";

import { GamePageLayout } from "@/components/layout/GamePageLayout";
import { useGame } from "@/context/GameContext";
import { useRouter } from "next/navigation";

export function GameCreatedMenuPage() {
    const router = useRouter();

    const { game, isLoading } = useGame();

    if (isLoading || !game) return null;

    function onJoinGameAsPlayer() {
        router.push(`/join/${game!.gameId}/player`);
    }

    function onDirectorMenu() {
        router.push(`/manage/${game!.gameId}/menu`);
    }

    function onMainMenu() {
        router.push(`/`);
    }

    const standardButtonClass =
        "w-full py-3.5 text-lg font-semibold bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 pl-4";

    return (
        <GamePageLayout
            headerTitle="Game Created Menu"
            centerContent={true}
            children={
                <div className="flex flex-col gap-3 px-6 pb-8 pt-6 max-w-sm w-full mx-auto">
                    <button onClick={onJoinGameAsPlayer} className={standardButtonClass}>
                        <span className="flex items-center gap-3">Join Game As Player</span>
                    </button>

                    <button onClick={onDirectorMenu} className={standardButtonClass}>
                        <span className="flex items-center gap-3">Go To Director Menu</span>
                    </button>

                    <button onClick={onMainMenu} className={standardButtonClass}>
                        <span className="flex items-center gap-3">Go To Main Menu</span>
                    </button>
                </div>
            }
        />
    );
}
