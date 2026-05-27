"use client";

import { useGame } from "@/context/GameContext";
import { useEffect, useState } from "react";
import SelectGamePage from "./SelectGamePage";
import { AwaitingMovementPage } from "./AwaitingMovementPage";
import { BridgeGame } from "@/db/game-index/schema";
import { Seat } from "@/model/participants";
import { EnterPlayerNamesPage } from "./EnterPlayerNamesPage";
import { SelectSeatPage } from "./SelectSeatPage";

type Step =
  | "LIST_GAMES"
  | "SELECT_SEAT"
  | "ENTER_PLAYER_NAMES"
  | "AWAITING_MOVEMENT";

export function JoinGamePage() {
  const { selectGame } = useGame();

  const [step, setStep] = useState<Step>("LIST_GAMES");

  const [seat, setSeat] = useState<Seat | null>(null);

  // Push step into browser history
  const goToStep = (next: Step) => {
    window.history.pushState({ step: next }, "", "");
    setStep(next);
  };

  // Sync browser back/forward buttons
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
    setStep("SELECT_SEAT");
  }

  function onSeatSelected(seat: Seat) {
    setSeat(seat);
    setStep("ENTER_PLAYER_NAMES");
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

      {/* TABLE SELECT */}
      {step === "SELECT_SEAT" && (
        <SelectSeatPage onSeatSelected={onSeatSelected} />
      )}

      {/* PLAYER NAMES ENTRY */}
      {step === "ENTER_PLAYER_NAMES" && (
        <EnterPlayerNamesPage
          seat={seat!}
          onSubmit={() => goToStep("AWAITING_MOVEMENT")}
        />
      )}

      {/* AWAITING MOVEMENT (should be in play game?) */}
      {step === "AWAITING_MOVEMENT" && <AwaitingMovementPage />}
    </div>
  );
}
