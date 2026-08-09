"use client";

import { GameStatus } from "@/db/games/types/game-status";
import {useGame} from "@/context/GameContext";
import { useState } from "react";
import { getDirectorToken } from "@/lib/director-token";

interface ChangeStatusPageProps {
    onStatusChanged: () => void;
}

export default function ChangeStatusPage({ onStatusChanged }: ChangeStatusPageProps) {

    const STATUS_OPTIONS: { value: GameStatus; label: string }[] = [
        { value: "CREATED", label: "Created" },
        { value: "JOINABLE", label: "Open for Players" },
        { value: "COMPLETE", label: "Complete" },
    ];

    const { game, mutateGame } = useGame();
    const [saving, setSaving] = useState(false);

    if (!game) return null;

    async function handleStatusChange(newStatus: GameStatus) {
        if (newStatus === game!.status || saving) return;

        setSaving(true);

        const res = await fetch(`/api/games/${game!.gameId}/status`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                status: newStatus,
                directorToken: getDirectorToken(game!.gameId),
            }),
        });

        if (res.ok) {
            mutateGame();
            onStatusChanged();
        } else {
            setSaving(false);
        }
    }

    return (
        <div className="min-h-dvh flex flex-col bg-white">
            {/* Header */}
            <div className="bg-gray-200 text-gray-800 py-3 text-center font-bold text-lg shrink-0">
                {game.eventName}
            </div>

            {/* Sub-header */}
            <div className="bg-blue-600 text-white px-3 py-2.5 text-center font-bold text-lg">
                Game Status
            </div>

            {/* Status options */}
            <div className="flex flex-col gap-3 px-6 pt-6 pb-8 max-w-sm w-full mx-auto">
                {STATUS_OPTIONS.map((option) => {
                    const isActive = game.status === option.value;
                    return (
                        <button
                            key={option.value}
                            onClick={() => handleStatusChange(option.value)}
                            disabled={saving}
                            className={`w-full py-3.5 text-lg font-semibold rounded-xl ${
                                isActive
                                    ? "bg-blue-600 text-white"
                                    : "bg-gray-200 text-gray-800 hover:bg-gray-300 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                            } ${saving ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                            {option.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
