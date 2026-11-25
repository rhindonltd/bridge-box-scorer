"use client";

import { NewBridgeGame } from "@/db/game-index/schema";
import { useRouter } from "next/navigation";
import { createGame } from "@/lib/game-service";
import { useId, useState } from "react";
import useSWR from "swr";
import { ScoringType } from "@/model/game-types";
import {
  type EventTypeChoice,
  EVENT_TYPE_MAP,
  EVENT_TYPE_OPTIONS,
  isPairsChoice,
  scoringTypeFor,
} from "@/model/event-type-choice";
import TextField from "@/components/common/TextField";
import SelectField from "@/components/common/SelectField";
import { Toggle } from "@/components/common/Toggle";
import { PageLayout } from "@/components/layout/PageLayout";
import { fetcher } from "@/lib/fetcher";
import { swrKeys } from "@/swr/swr-keys";
import { useTranslations } from "@/i18n/useTranslations";
import type { BridgewebsEventsResponse } from "@/app/api/games/bridgewebs/events/route";

const DEFAULT_TABLES = 5;

function todayDateOnly(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

interface Props {
  /**
   * Back arrow on the first step. The new-game menu passes this to return to
   * itself; without it the arrow pops the history stack.
   */
  onBack?: () => void;
}

/**
 * The details for a new game (name, director, type, scoring and options). It is
 * opened from Game Details on the new-game menu, and saving it creates the game
 * and opens that game's Set Up Game menu.
 */
export function CreateGamePage({ onBack }: Props = {}) {
  const t = useTranslations();
  const [eventName, setEventName] = useState("");
  const [director, setDirector] = useState("");
  // Set once the director tries to create the game with a required field still
  // blank. Drives the red highlight on the empty field(s)
  // in place of a standing instruction; cleared as soon as the details are
  // complete so the highlight never lingers once fixed.
  const [showDetailsErrors, setShowDetailsErrors] = useState(false);
  // The four event-type choices the director picks from. Each maps to a
  // (gameType family × eventFormat) pair: Swiss Pairs is a PAIRS game in the
  // SWISS format, Swiss Teams a TEAMS game in the SWISS format, and so on.
  const [eventType, setEventType] = useState<EventTypeChoice>("PAIRS");
  const { gameType, eventFormat } = EVENT_TYPE_MAP[eventType];
  // Teams scoring choice, only surfaced (and only meaningful) for a Teams game.
  // Defaults to IMP Victory Points; the board-comparison alternative offered is
  // locale-specific (Point-a-Board / PAB in the UK, Board-a-Match / BAM in the
  // US), so the option list comes from the localized messages.
  const [teamsScoring, setTeamsScoring] =
    useState<Extract<ScoringType, "IMP" | "IMP_VP" | "BAM" | "PAB">>("IMP");
  // Pairs scoring choice, only surfaced for a Pairs game: matchpoints (default)
  // or Cross-IMPs.
  const [pairsScoring, setPairsScoring] =
    useState<Extract<ScoringType, "MP" | "XIMP">>("MP");
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
      eventFormat,
      // Pairs/Swiss Pairs pick MP/XIMP; Teams picks IMP/BAM/PAB; Swiss Teams
      // is always IMP (VP) — it is the only scoring that powers the VP-based
      // draw (aggregate IMP and board-comparison lack a VP total, so the draw
      // cannot rank the field).
      scoringType: scoringTypeFor(eventType, pairsScoring, teamsScoring),
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

  // Both a (non-blank) event name and director are required before the game
  // can be created. The event name is whatever is in the text field,
  // or the chosen BridgeWebs event's mirrored title; either way it lives in
  // `eventName`, so a single trim check covers both input modes.
  const detailsComplete =
    eventName.trim().length > 0 && director.trim().length > 0;

  return (
    <PageLayout
      headerTitle="Game Details"
      // Back returns to the new-game menu (or pops the stack).
      backAction={onBack}
      backFallbackHref="/create/new"
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
          // A blank event name or director is surfaced with a red highlight
          // (rather than a standing instruction) and nothing is created.
          if (detailsComplete) {
            handleCreate();
          } else {
            setShowDetailsErrors(true);
          }
        }}
        id="create-game-form"
        // Laid out like the Game Details edit page: one scrolling column.
        className="mx-auto flex w-full max-w-md flex-col p-4"
      >
        <div className="flex flex-col gap-5">
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
                invalid={showDetailsErrors && eventName.trim().length === 0}
              />
            )}
          </div>

          <TextField
            label="Director Name"
            value={director}
            onChange={setDirector}
            invalid={showDetailsErrors && director.trim().length === 0}
          />

          <SelectField
            label="Event Type"
            value={eventType}
            options={EVENT_TYPE_OPTIONS}
            onSelect={setEventType}
            inline
          />

          {eventType === "SWISS_TEAMS" ? (
            // Swiss Teams is always scored by IMP (Victory Points) — the
            // round-by-round draw depends on VP standings, so no other
            // scoring method applies. No dropdown needed, but the row still
            // mirrors the inline SelectField layout (bold label left, value
            // right) so it lines up with the other scoring choices.
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-gray-700">
                Scoring
              </span>
              <span className="text-lg text-gray-700">
                IMP (Victory Points)
              </span>
            </div>
          ) : isPairsChoice(eventType) ? (
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
          ) : (
            <SelectField
              label="Scoring"
              value={teamsScoring}
              options={t.teamsScoringOptions}
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
