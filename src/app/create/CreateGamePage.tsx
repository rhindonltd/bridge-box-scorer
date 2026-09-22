"use client";

import { NewBridgeGame } from "@/db/game-index/schema";
import { useRouter } from "next/navigation";
import { createGame } from "@/lib/game-service";
import { useId, useState } from "react";
import useSWR from "swr";
import { GameType } from "@/db/games/types/game-type";
import { ScoringType } from "@/db/games/types/scoring-type";
import TextField from "@/components/common/TextField";
import SelectField from "@/components/common/SelectField";
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
  // Teams scoring choice, only surfaced (and only meaningful) for a Teams game:
  // IMP Victory Points (default) or Board-a-Match / Point-a-Board.
  const [teamsScoring, setTeamsScoring] = useState<
    Extract<ScoringType, "IMP" | "BAM" | "PAB">
  >("IMP");
  // Pairs scoring choice, only surfaced for a Pairs game: matchpoints (default)
  // or Cross-IMPs.
  const [pairsScoring, setPairsScoring] = useState<
    Extract<ScoringType, "MP" | "XIMP">
  >("MP");
  const [leadCardRequired, setLeadCardRequired] = useState(true);
  const [handEntryEnabled, setHandEntryEnabled] = useState(false);
  const [bridgewebsEventId, setBridgewebsEventId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Whether the director has switched the Event Name field over to the
  // BridgeWebs event dropdown. Only takes effect while a picker is available
  // (see `showEventPicker`), so it can stay `true` harmlessly when the picker
  // is briefly unavailable (e.g. mid date-change re-fetch).
  const [useBridgewebsEvent, setUseBridgewebsEvent] = useState(false);

  // Games are always created for today; there is no date field on the form.
  const eventDate = todayDateOnly();

  const router = useRouter();

  const leadCardLabelId = useId();
  const handEntryLabelId = useId();
  const eventNameModeLabelId = useId();

  // BridgeWebs events for today. Only offered when the box has BridgeWebs
  // credentials configured and there are events for the day; a failed fetch
  // degrades to the plain text field so the page behaves exactly as it did
  // before the integration.
  const { data: bridgewebs } = useSWR<BridgewebsEventsResponse>(
    swrKeys.bridgewebsEvents(eventDate),
    fetcher,
  );

  const eventPickerAvailable =
    (bridgewebs?.configured ?? false) &&
    /* v8 ignore next -- `events` is always an array in the response type, so `.length` is never nullish; the `?? 0` fallback is unreachable defensive code */
    (bridgewebs?.events.length ?? 0) > 0;

  // The dropdown is only shown when a picker is available AND the director has
  // switched it on. Deriving this (rather than storing it) means an unavailable
  // picker automatically falls back to the text field, with no effect needed.
  const showEventPicker = eventPickerAvailable && useBridgewebsEvent;

  function handleSelectBridgewebsEvent(id: string) {
    setBridgewebsEventId(id);
    const selected = bridgewebs?.events.find((e) => e.id === id);
    // Mirror the chosen BridgeWebs event's title into the event name; picking
    // "None" clears the id but leaves the name untouched.
    if (selected) {
      setEventName(selected.title);
    }
  }

  function handleToggleEventMode(useBridgewebs: boolean) {
    setUseBridgewebsEvent(useBridgewebs);
    // Switching back to free text drops the BridgeWebs event association.
    if (!useBridgewebs) {
      setBridgewebsEventId("");
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
      // Both game types carry an explicit scoring choice: Teams pick
      // IMP/BAM/PAB, Pairs pick MP/XIMP.
      scoringType: gameType === "TEAMS" ? teamsScoring : pairsScoring,
      eventDate,
      sectionName: "",
      tables: DEFAULT_TABLES,
      leadCardRequired,
      handEntryEnabled,
      // Only attach a BridgeWebs event id when the picker is actually shown, so
      // a hidden/stale selection never rides along on the created game.
      bridgewebsEventId: showEventPicker ? bridgewebsEventId || null : null,
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
          <div className="flex flex-col gap-1">
            {eventPickerAvailable && (
              <div className="flex items-center justify-between">
                <span
                  id={eventNameModeLabelId}
                  className="text-sm font-semibold text-gray-700"
                >
                  Use BridgeWebs Event
                </span>
                <Toggle
                  value={useBridgewebsEvent}
                  offLabel="No"
                  onLabel="Yes"
                  labelledBy={eventNameModeLabelId}
                  onChange={handleToggleEventMode}
                />
              </div>
            )}

            {showEventPicker ? (
              <SelectField
                label="Event Name"
                value={bridgewebsEventId}
                options={[
                  { label: "— Select an event —", value: "" },
                  ...bridgewebs!.events.map((e) => ({
                    label: e.title,
                    value: e.id,
                  })),
                ]}
                onSelect={handleSelectBridgewebsEvent}
              />
            ) : (
              <TextField
                label="Event Name"
                value={eventName}
                onChange={setEventName}
              />
            )}
          </div>

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
            inline
          />

          {gameType === "PAIRS" && (
            <SelectField
              label="Scoring"
              value={pairsScoring}
              options={[
                { label: "Matchpoints", value: "MP" as const },
                { label: "Cross-IMPs", value: "XIMP" as const },
              ]}
              onSelect={setPairsScoring}
              inline
            />
          )}

          {gameType === "TEAMS" && (
            <SelectField
              label="Scoring"
              value={teamsScoring}
              options={[
                { label: "IMP (Victory Points)", value: "IMP" as const },
                { label: "Board-a-Match", value: "BAM" as const },
                { label: "Point-a-Board", value: "PAB" as const },
              ]}
              onSelect={setTeamsScoring}
              inline
            />
          )}

          <div className="flex items-center justify-between">
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

          <div className="flex items-center justify-between">
            <label
              id={handEntryLabelId}
              className="text-sm font-semibold text-gray-700"
            >
              Allow Hand Entry
            </label>
            <Toggle
              value={handEntryEnabled}
              offLabel="No"
              onLabel="Yes"
              labelledBy={handEntryLabelId}
              onChange={(isOn) => setHandEntryEnabled(isOn)}
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
