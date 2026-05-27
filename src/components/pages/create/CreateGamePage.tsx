"use client";

import { useEffect, useState } from "react";
import { useGame } from "@/context/GameContext";

import { ShowTablesPage } from "./ShowTablesPage";
import { CreateGameFormPage } from "./CreateGameFormPage";
import { ShowMovementsPage } from "./ShowMovementsPage";

type Step = "FORM" | "TABLES" | "MOVEMENTS";

export function CreateGamePage() {
  const { gameSelection } = useGame();

  const [step, setStep] = useState<Step>("FORM");

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
        setStep("FORM");
      }
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // When game is created → move forward
  useEffect(() => {
    if (gameSelection && step === "FORM") {
      goToStep("TABLES");
    }
  }, [gameSelection]);

  return (
    <div className="h-screen flex flex-col overflow-y-auto">
      {/* HEADER */}
      <div className="w-full bg-blue-200 py-2 text-center font-bold">
        Create Game
      </div>

      {/* FORM */}
      {step === "FORM" && <CreateGameFormPage />}

      {/* TABLES */}
      {step === "TABLES" && (
        <ShowTablesPage onShowMovementsPage={() => goToStep("MOVEMENTS")} />
      )}

      {/* MOVEMENTS */}
      {step === "MOVEMENTS" && (
        <ShowMovementsPage onShowTablesPage={() => goToStep("TABLES")} />
      )}
    </div>
  );
}
