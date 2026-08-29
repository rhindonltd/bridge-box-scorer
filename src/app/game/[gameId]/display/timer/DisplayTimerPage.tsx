import { TeaCupIcon } from "@/app/game/[gameId]/display/timer/TeaCupIcon";

type TimerDisplayProps = {
  title: string;
  boardLabel: string | null;
  remaining: number;
  phase: "play" | "move" | "break" | "finished" | null;
  isRunning: boolean;
  projectedEndDate: Date;
};

export function DisplayTimerPage({
  title,
  boardLabel,
  remaining,
  phase,
  isRunning,
  projectedEndDate,
}: TimerDisplayProps) {
  function formatTime(totalSeconds: number) {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;

    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  const isLastMinute = remaining > 0 && remaining < 60 && phase === "play";

  const isMoving = phase === "move";
  const isBreak = phase === "break";
  const isFinished = phase === "finished";

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

      {/* Timer */}
      <div className={`text-[30vw] font-bold tabular-nums ${timerClass}`}>
        {phase === "finished" ? "00:00" : formatTime(remaining)}
      </div>

      {/* Paused */}
      {!isRunning && phase !== "finished" && (
        <div className="absolute bottom-16 text-3xl text-yellow-400 mb-8">
          PAUSED
        </div>
      )}

      {/* Projected end */}
      {!isFinished && (
        <div className="absolute bottom-8 text-2xl opacity-70">
          Projected end: {projectedEndTime}
        </div>
      )}
    </div>
  );
}
