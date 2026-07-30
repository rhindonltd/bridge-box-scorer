"use client";

import { useGame } from "@/context/GameContext";
import { useTimerDerived } from "@/hooks/timer-derived";
import { useTimerSync } from "@/hooks/timer-sync";
import { getSocket } from "@/lib/socket";
import { SocketEvents } from "@/socket/socket-events";
import { getDirectorToken } from "@/lib/director-token";
import { useEffect, useMemo, useState } from "react";

export default function ControlsPage() {
  const { game } = useGame();
  const { timerState } = useTimerSync();

  // eslint-disable-next-line react-compiler/react-compiler
  const [tick, setTick] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const timer = useTimerDerived(timerState, tick);

  const [boardsPerRound, setBoardsPerRound] = useState(3);
  const [totalRounds, setTotalRounds] = useState(8);

  const [playMinutes, setPlayMinutes] = useState(2);
  const [playSeconds, setPlaySeconds] = useState(0);

  const [moveMinutes, setMoveMinutes] = useState(1);
  const [moveSeconds, setMoveSeconds] = useState(30);

  const [timingMode, setTimingMode] = useState<"perRound" | "perBoard">(
    "perRound",
  );

  const enteredPlaySeconds = playMinutes * 60 + playSeconds;
  const moveDuration = moveMinutes * 60 + moveSeconds;

  const effectivePlayDuration =
    timingMode === "perRound"
      ? enteredPlaySeconds
      : enteredPlaySeconds * boardsPerRound;

  const totalSessionSeconds =
    totalRounds * effectivePlayDuration +
    Math.max(0, totalRounds - 1) * moveDuration;

  // eslint-disable-next-line react-compiler/react-compiler
  const previewEndDate = useMemo(
    () => new Date(Date.now() + totalSessionSeconds * 1000),
    [totalSessionSeconds],
  );

  if (!game) return null;

  function formatDuration(totalSeconds: number) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  }

  const hasSession = !!timerState;

  function emitSimple(event: string) {
    getSocket().emit(event, {
      gameType: game!.gameType,
      gameId: game!.gameId,
      directorToken: getDirectorToken(game!.gameId),
    });
  }

  function emitConfig(event: string) {
    getSocket().emit(event, {
      gameType: game!.gameType,
      gameId: game!.gameId,
      directorToken: getDirectorToken(game!.gameId),
      boardsPerRound,
      totalRounds,
      playDuration: effectivePlayDuration,
      moveDuration,
    });
  }

  function formatTime(totalSeconds: number) {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;

    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  return (
    <div className="h-screen w-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-3xl font-bold mb-2">Director Controls</h1>

      {/* STATUS PANEL */}
      <div className="w-full max-w-md bg-gray-900 rounded-lg p-4 text-sm">
        {hasSession ? (
          <>
            <div className="flex justify-between">
              <span className="text-white/60">Status</span>
              <span className="capitalize">
                {timer.isRunning ? timer.phase : "paused"}
              </span>
            </div>

            <div className="flex justify-between mt-2">
              <span className="text-white/60">Remaining</span>
              <span>
                {timer.phase === "finished"
                  ? "00:00"
                  : formatTime(timer.remaining)}
              </span>
            </div>

            <div className="flex justify-between mt-2">
              <span className="text-white/60">Round</span>
              <span>{timer.round}</span>
            </div>

            {timer.projectedEndDate && (
              <div className="flex justify-between mt-2">
                <span className="text-white/60">Live End</span>
                <span>
                  {timer.projectedEndDate.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="text-white/50 mb-2">No active session</div>

            <div className="flex justify-between">
              <span className="text-white/60">Session Length</span>
              <span>{formatDuration(totalSessionSeconds)}</span>
            </div>

            <div className="flex justify-between mt-2">
              <span className="text-white/60">Preview End</span>
              <span>
                {previewEndDate.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </>
        )}
      </div>

      {/* CONFIG */}
      <div className="grid grid-cols-2 gap-4 w-full max-w-md">
        <div className="flex flex-col gap-1">
          <label htmlFor="boards-per-round" className="text-sm text-white/60">
            Boards / Round
          </label>
          <input
            id="boards-per-round"
            type="number"
            value={boardsPerRound}
            onChange={(e) => setBoardsPerRound(Number(e.target.value))}
            className="p-2 rounded bg-gray-800"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="total-rounds" className="text-sm text-white/60">
            Total Rounds
          </label>
          <input
            id="total-rounds"
            type="number"
            value={totalRounds}
            onChange={(e) => setTotalRounds(Number(e.target.value))}
            className="p-2 rounded bg-gray-800"
          />
        </div>

        <fieldset className="col-span-2 flex gap-6">
          <legend className="sr-only">Timing Mode</legend>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="timingMode"
              checked={timingMode === "perRound"}
              onChange={() => setTimingMode("perRound")}
            />
            Per Round
          </label>

          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="timingMode"
              checked={timingMode === "perBoard"}
              onChange={() => setTimingMode("perBoard")}
            />
            Per Board
          </label>
        </fieldset>

        <div className="flex flex-col gap-1">
          <span className="text-sm text-white/60">Play Duration</span>
          <div className="flex gap-2">
            <input
              aria-label="Play minutes"
              type="number"
              value={playMinutes}
              onChange={(e) => setPlayMinutes(Number(e.target.value))}
              className="p-2 rounded bg-gray-800 w-20"
            />
            <input
              aria-label="Play seconds"
              type="number"
              value={playSeconds}
              onChange={(e) => setPlaySeconds(Number(e.target.value))}
              className="p-2 rounded bg-gray-800 w-20"
              max={59}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-sm text-white/60">Move Duration</span>
          <div className="flex gap-2">
            <input
              aria-label="Move minutes"
              type="number"
              value={moveMinutes}
              onChange={(e) => setMoveMinutes(Number(e.target.value))}
              className="p-2 rounded bg-gray-800 w-20"
            />
            <input
              aria-label="Move seconds"
              type="number"
              value={moveSeconds}
              onChange={(e) => setMoveSeconds(Number(e.target.value))}
              className="p-2 rounded bg-gray-800 w-20"
              max={59}
            />
          </div>
        </div>
      </div>

      {/* CONTROLS */}
      <div className="grid grid-cols-2 gap-4 w-full max-w-md">
        {!hasSession ? (
          <button
            onClick={() => emitConfig(SocketEvents.CREATE_TIMER)}
            className="bg-cyan-600 py-6 rounded-xl text-xl font-semibold col-span-2"
          >
            Create
          </button>
        ) : (
          <>
            <button
              onClick={() => emitConfig(SocketEvents.UPDATE_CONFIG_TIMER)}
              className="bg-blue-600 py-6 rounded-xl text-xl font-semibold col-span-2"
            >
              Apply Changes
            </button>

            <button
              onClick={() => emitSimple(SocketEvents.START_TIMER)}
              className="bg-green-600 py-6 rounded-xl text-xl font-semibold"
            >
              Start
            </button>

            <button
              onClick={() => emitSimple(SocketEvents.PAUSE_TIMER)}
              className="bg-yellow-600 py-6 rounded-xl text-xl font-semibold"
            >
              Pause
            </button>
          </>
        )}
      </div>
    </div>
  );
}
