"use client";

import { useGame } from "@/context/GameContext";
import { useEffect, useState } from "react";
import { BridgeGame } from "@/db/game-index/schema";
import SelectGamePage from "./SelectGamePage";
import { LeaderboardPage } from "../leaderboard/LeaderboardPage";

type Step = "LIST_GAMES" | "SHOW_LEADERBOARD";

export function JoinAsLeaderboardPage() {
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
    setStep("SHOW_LEADERBOARD");
  }

  return (
    <div className="h-screen flex flex-col overflow-y-auto">
      {/* HEADER */}
      {/*<div className="w-full bg-blue-200 py-2 text-center font-bold">*/}
      {/*  Join Game*/}
      {/*</div>*/}

      {/* GAME LIST */}
      {step === "LIST_GAMES" && (
        <SelectGamePage onGameSelected={onGameSelected} />
      )}

      {step === "SHOW_LEADERBOARD" && (
        <LeaderboardPage
          overallScoreAndParticipant={{
            type: "TEAM_OVERALL",
            participants: [
              {
                type: "TEAM",
                teamId: "1",
                pair1: {
                  type: "PAIR",
                  player1: {
                    id: 1,
                    firstName: "David",
                    lastName: "Collier",
                    nationalId: "404476",
                  },
                  player2: {
                    id: 2,
                    firstName: "Jacqui",
                    lastName: "Collier",
                    nationalId: "477484",
                  },
                  direction: "NS",
                  tableNumber: 1,
                },
                pair2: {
                  type: "PAIR",
                  player1: {
                    id: 3,
                    firstName: "Peter",
                    lastName: "Collier",
                    nationalId: "123456",
                  },
                  player2: {
                    id: 4,
                    firstName: "Nye",
                    lastName: "Collier",
                    nationalId: "654321",
                  },
                  direction: "EW",
                  tableNumber: 1,
                },
              },
            ],
            overallScore: {
              mode: "TEAM",
              scoring: "OVERALL",
              type: "TEAM_OVERALL",
              lines: [
                {
                  tied: false,
                  rank: 1,
                  teamId: "1",
                  score: 100,
                },
              ],
            },
          }}
          onNext={function (): void {
            throw new Error("Function not implemented.");
          }}
        />
      )}
    </div>
  );
}
