"use client";

import { useGame } from "@/context/GameContext";
import { useEffect, useState } from "react";
import { BridgeGame } from "@/db/game-index/schema";
import SelectGamePage from "../join/SelectGamePage";
import ControlsPage from "../timer/ControlsPage";

type Step = "LIST_GAMES" | "CONTROL_TIMER";

export function ManageGamePage() {
  const { selectGame } = useGame();

  const [step, setStep] = useState<Step>("LIST_GAMES");

  const goToStep = (next: Step) => {
    window.history.pushState({ step: next }, "", "");
    setStep(next);
  };

  useEffect(() => {
    const onPopState = (event: PopStateEvent) => {
      if (event.state?.step) {
        setStep(event.state.step);
      } else {
        setStep("LIST_GAMES");
      }
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  function onGameSelected(game: BridgeGame) {
    selectGame(game);
    setStep("CONTROL_TIMER");
  }

  return (
    <div className="h-screen flex flex-col overflow-y-auto">
      {/* HEADER */}
      <div className="w-full bg-blue-200 py-2 text-center font-bold">
        Join Game
      </div>

      {/* GAME LIST */}
      {step === "LIST_GAMES" && (
        <SelectGamePage onGameSelected={onGameSelected} />
      )}

      {/* AWAITING MOVEMENT (should be in play game?) */}
      {step === "CONTROL_TIMER" && <ControlsPage />}
    </div>
  );
}
