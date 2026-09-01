"use client";

import { NewBridgeGame } from "@/db/game-index/schema";
import { useRouter } from "next/navigation";
import { createGame } from "@/lib/game-service";
import { useId, useState } from "react";
import { GameType } from "@/db/games/types/game-type";
import TextField from "@/components/common/TextField";
import SelectField from "@/components/common/SelectField";
import NumberStepper from "@/components/common/NumberStepper";
import { Toggle } from "@/components/common/Toggle";
import { PageLayout } from "@/components/layout/PageLayout";

export function CreateGamePage() {
  const [eventName, setEventName] = useState("");
  const [director, setDirector] = useState("");
  const [gameType, setGameType] = useState<GameType>("PAIRS");
  const [tables, setTables] = useState(1);
  const [leadCardRequired, setLeadCardRequired] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const router = useRouter();

  const leadCardLabelId = useId();

  async function onCreateGame(game: NewBridgeGame) {
    setError(null);
    setIsSubmitting(true);
    try {
      const created = await createGame(game);
      router.replace(`/game/${created.gameId}/create`);
    } catch (err) {
      console.error("Failed to create game:", err);
      setError("Failed to create game. Please try again.");
      setIsSubmitting(false);
    }
  }

  async function handleCreate() {
    onCreateGame({
      eventName,
      director,
      gameType,
      sessionName: "",
      eventDate: new Date().toISOString(),
      sectionName: "",
      tables: tables,
      leadCardRequired,
    });
  }

  return (
    <PageLayout
      headerTitle="Create Game"
      centerContent={true}
      children={
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleCreate();
          }}
          id="create-game-form"
          className="flex flex-col w-full max-w-md p-4"
        >
          <div className="flex flex-col flex-1 justify-center gap-4">
            <TextField
              label="Event Name"
              value={eventName}
              onChange={setEventName}
            />

            <TextField
              label="Director Name"
              value={director}
              onChange={setDirector}
            />

            <SelectField
              label="Event Type"
              value={gameType}
              options={[
                { label: "Pairs", value: "PAIRS" },
                { label: "Teams", value: "TEAMS" },
              ]}
              onSelect={setGameType}
            />

            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-gray-600">
                Initial Tables
              </label>
              <NumberStepper value={tables} onChange={setTables} min={1} />
            </div>

            <div className="flex flex-col gap-1">
              <label
                id={leadCardLabelId}
                className="text-sm font-semibold text-gray-700"
              >
                Record Opening Lead
              </label>
              <Toggle
                value={leadCardRequired}
                offLabel="No"
                onLabel="Yes"
                labelledBy={leadCardLabelId}
                onChange={(isOn) => setLeadCardRequired(isOn)}
              />
            </div>

            {error && (
              <p role="alert" className="text-sm font-medium text-red-600">
                {error}
              </p>
            )}
          </div>
        </form>
      }
      actions={
        <button
          type="submit"
          form="create-game-form"
          disabled={isSubmitting}
          className="w-full py-3.5 text-lg font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50"
        >
          {isSubmitting ? "Creating..." : "Create Game"}
        </button>
      }
    />
  );
}
