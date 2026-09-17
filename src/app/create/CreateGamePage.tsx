"use client";

import { NewBridgeGame } from "@/db/game-index/schema";
import { useRouter } from "next/navigation";
import { createGame } from "@/lib/game-service";
import { useId, useState } from "react";
import useSWR from "swr";
import { GameType } from "@/db/games/types/game-type";
import TextField from "@/components/common/TextField";
import SelectField from "@/components/common/SelectField";
import DateField from "@/components/common/DateField";
import { Toggle } from "@/components/common/Toggle";
import { PageLayout } from "@/components/layout/PageLayout";
import { fetcher } from "@/lib/fetcher";
import { swrKeys } from "@/swr/swr-keys";
import type { BridgewebsEventsResponse } from "@/app/api/games/bridgewebs/events/route";

const DEFAULT_TABLES = 5;

function todayDateOnly(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function CreateGamePage() {
  const [eventName, setEventName] = useState("");
  const [director, setDirector] = useState("");
  const [gameType, setGameType] = useState<GameType>("PAIRS");
  const [eventDate, setEventDate] = useState(todayDateOnly());
  const [leadCardRequired, setLeadCardRequired] = useState(true);
  const [bridgewebsEventId, setBridgewebsEventId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const router = useRouter();

  const leadCardLabelId = useId();

  // BridgeWebs events for the chosen date. Only shown when the box has
  // BridgeWebs credentials configured; a failed fetch degrades to no picker so
  // the page behaves exactly as it did before the integration.
  const { data: bridgewebs } = useSWR<BridgewebsEventsResponse>(
    swrKeys.bridgewebsEvents(eventDate),
    fetcher,
  );

  const showEventPicker =
    (bridgewebs?.configured ?? false) && (bridgewebs?.events.length ?? 0) > 0;

  function handleSelectBridgewebsEvent(id: string) {
    setBridgewebsEventId(id);
    const selected = bridgewebs?.events.find((e) => e.id === id);
    // Prefill the event name from the chosen BridgeWebs event; picking "None"
    // leaves the name untouched.
    if (selected) {
      setEventName(selected.title);
    }
  }

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
      eventDate,
      sectionName: "",
      tables: DEFAULT_TABLES,
      leadCardRequired,
      bridgewebsEventId: bridgewebsEventId || null,
    });
  }

  return (
    <PageLayout
      headerTitle="Create Game"
      centerContent={true}
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
    >
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

          <DateField
            label="Date Played"
            value={eventDate}
            onChange={setEventDate}
          />

          {showEventPicker && (
            <SelectField
              label="BridgeWebs Event"
              value={bridgewebsEventId}
              options={[
                { label: "— None —", value: "" },
                ...bridgewebs!.events.map((e) => ({
                  label: e.title,
                  value: e.id,
                })),
              ]}
              onSelect={handleSelectBridgewebsEvent}
            />
          )}

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
    </PageLayout>
  );
}
