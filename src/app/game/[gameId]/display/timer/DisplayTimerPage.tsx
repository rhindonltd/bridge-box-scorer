import { TeaCupIcon } from "@/app/game/[gameId]/display/timer/TeaCupIcon";

type TimerDisplayProps = {
  title: string;
  boardLabel: string | null;
  remaining: number;
  phase: "play" | "move" | "break" | "awaitingDraw" | "finished" | null;
  isRunning: boolean;
  projectedEndDate: Date;
  /** Seconds before end of play at which the "last minute" warning shows. */
  warningSeconds?: number;
};

export function DisplayTimerPage({
  title,
  boardLabel,
  remaining,
  phase,
  isRunning,
  projectedEndDate,
  warningSeconds = 60,
}: TimerDisplayProps) {
  function formatTime(totalSeconds: number) {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;

    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  const isLastMinute =
    remaining > 0 && remaining < warningSeconds && phase === "play";

  const isMoving = phase === "move";
  const isBreak = phase === "break";
  const isFinished = phase === "finished";
  const isAwaitingDraw = phase === "awaitingDraw";

  const textClass = isMoving ? "text-cyan-400" : "text-white";

  const timerClass = isLastMinute
    ? "text-red-500 animate-pulse"
    : isBreak
      ? "text-amber-100"
      : textClass;

  const projectedEndTime = projectedEndDate.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className={`fixed inset-0 flex flex-col items-center justify-center bg-black ${textClass}`}
    >
      {/* Header */}
      <div className="absolute inset-x-0 top-10 flex flex-col items-center text-center">
        {isBreak && (
          <div className="mb-3 text-amber-400">
            <TeaCupIcon />
          </div>
        )}

        <div className="text-6xl font-bold">{title}</div>

        {isBreak ? (
          <div className="mt-4 text-3xl opacity-80">
            Next round starts at {projectedEndTime}
          </div>
        ) : (
          phase === "play" &&
          boardLabel && (
            <div className="mt-4 text-3xl opacity-80">{boardLabel}</div>
          )
        )}
      </div>

      {/* Timer — a Swiss between-rounds wait shows a message rather than a
          countdown, since there is no fixed time until the next round. */}
      {isAwaitingDraw ? (
        <div className="px-8 text-center text-5xl font-semibold opacity-80">
          The director is drawing the next round
        </div>
      ) : (
        <div className={`text-[30vw] font-bold tabular-nums ${timerClass}`}>
          {phase === "finished" ? "00:00" : formatTime(remaining)}
        </div>
      )}

      {/* Paused — not shown while awaiting a draw (it is a deliberate wait, not
          a paused clock). */}
      {!isRunning && phase !== "finished" && !isAwaitingDraw && (
        <div className="absolute bottom-16 text-3xl text-yellow-400 mb-8">
          PAUSED
        </div>
      )}

      {/* Projected end — meaningless mid-Swiss (the next round starts on the
          director's draw), so omit it while awaiting a draw. */}
      {!isFinished && !isAwaitingDraw && (
        <div className="absolute bottom-8 text-2xl opacity-70">
          Projected end: {projectedEndTime}
        </div>
      )}
    </div>
  );
}
