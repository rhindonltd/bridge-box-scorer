"use client";

import { useBridgeSessionTimer } from "@/hooks/countdown-timer";
import { useEffect, useRef, useState } from "react";

/* ---------------- CONFIG ---------------- */

const TOTAL_ROUNDS = 8;
const PLAY_DURATION = 2 * 60;
const MOVE_DURATION = 90;
const BOARD_COUNT = 3;

/* ---------------- HELPERS ---------------- */

function formatTime(totalSeconds: number) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;

  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function getBoardIndex(
  elapsed: number,
  playDuration: number,
  boardCount: number,
) {
  const boardDuration = playDuration / boardCount;
  return Math.min(boardCount - 1, Math.floor(elapsed / boardDuration));
}

function formatBoard(index: number, count: number) {
  return `Board ${index + 1} of ${count}`;
}

/* ---------------- COMPONENT ---------------- */

export default function TimerPage() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const { phase, round, remaining, isRunning, start, pause, reset } =
    useBridgeSessionTimer({
      totalRounds: TOTAL_ROUNDS,
      playDuration: PLAY_DURATION,
      moveDuration: MOVE_DURATION,
    });

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasAttemptedFullscreen, setHasAttemptedFullscreen] = useState(false);

  /* ---------------- FULLSCREEN ---------------- */

  const enterFullscreen = async () => {
    if (!containerRef.current) return;
    try {
      await containerRef.current.requestFullscreen();
    } catch {}
  };

  const exitFullscreen = async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);

    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  useEffect(() => {
    setHasAttemptedFullscreen(true);
    enterFullscreen();
  }, []);

  /* ---------------- BOARD LOGIC ---------------- */

  const elapsed = PLAY_DURATION - remaining;

  const boardIndex =
    phase === "play"
      ? getBoardIndex(elapsed, PLAY_DURATION, BOARD_COUNT)
      : null;

  const boardLabel =
    phase === "play" && boardIndex !== null
      ? formatBoard(boardIndex, BOARD_COUNT)
      : null;

  /* ---------------- DISPLAY ---------------- */

  const title =
    phase === "finished"
      ? "Session Complete"
      : phase === "play"
        ? `Round ${round} of ${TOTAL_ROUNDS}`
        : `Move for Round ${round + 1}`;

  const isWarning = phase === "play" && remaining <= 60;
  const isDanger = phase === "play" && remaining <= 10;

  return (
    <div
      ref={containerRef}
      className="
        relative flex h-screen w-screen flex-col
        items-center justify-center overflow-hidden
        bg-black text-white
      "
    >
      {/* ---------------- HEADER ---------------- */}

      {phase === "move" ? (
        <div className="absolute top-10 text-center w-full">
          <div className="text-cyan-300 text-7xl md:text-9xl font-bold tracking-[0.3em]">
            MOVE
          </div>
          <div className="mt-4 text-white/90 text-5xl md:text-6xl font-semibold">
            Move to Round {round + 1}
          </div>
        </div>
      ) : (
        <div className="absolute top-10 text-center w-full">
          <div className="text-6xl md:text-8xl font-bold text-white/90">
            {title}
          </div>

          {boardLabel && (
            <div className="mt-5 text-4xl md:text-5xl text-white/80 font-medium">
              {boardLabel}
            </div>
          )}
        </div>
      )}

      {/* ---------------- TIMER ---------------- */}

      <div
        className={`
          select-none font-[family:var(--font-bebas)]
          text-[44vw] md:text-[32rem]
          leading-none tabular-nums tracking-tight
          transition-colors duration-300

          ${
            phase === "finished"
              ? "text-white/25"
              : phase === "move"
                ? "text-cyan-300"
                : isDanger
                  ? "animate-pulse text-red-500"
                  : isWarning
                    ? "text-yellow-400"
                    : "text-white"
          }
        `}
      >
        {phase === "finished" ? "00:00" : formatTime(remaining)}
      </div>

      {/* ---------------- CONTROLS ---------------- */}

      {phase !== "finished" && (
        <div className="absolute bottom-8 flex gap-4">
          {!isRunning ? (
            <button
              onClick={start}
              className="rounded-2xl bg-green-600 px-6 py-3 text-xl font-semibold hover:bg-green-500"
            >
              Start
            </button>
          ) : (
            <button
              onClick={pause}
              className="rounded-2xl bg-yellow-600 px-6 py-3 text-xl font-semibold hover:bg-yellow-500"
            >
              Pause
            </button>
          )}

          <button
            onClick={reset}
            className="rounded-2xl bg-blue-600 px-6 py-3 text-xl font-semibold hover:bg-blue-500"
          >
            Reset
          </button>

          {!isFullscreen ? (
            <button
              onClick={enterFullscreen}
              className="rounded-2xl bg-gray-700 px-6 py-3 text-xl font-semibold hover:bg-gray-600"
            >
              Fullscreen
            </button>
          ) : (
            <button
              onClick={exitFullscreen}
              className="rounded-2xl bg-gray-700 px-6 py-3 text-xl font-semibold hover:bg-gray-600"
            >
              Exit
            </button>
          )}
        </div>
      )}

      {/* ---------------- FULLSCREEN FALLBACK ---------------- */}

      {hasAttemptedFullscreen && !isFullscreen && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <button
            onClick={enterFullscreen}
            className="rounded-2xl bg-white px-6 py-3 text-black text-xl font-semibold"
          >
            Tap to Enter Fullscreen
          </button>
        </div>
      )}
    </div>
  );
}
