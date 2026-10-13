"use client";

import { useState } from "react";
import { useRequiredGame } from "@/context/GameContext";
import { GamePageLayout } from "@/components/layout/GamePageLayout";
import TextField from "@/components/common/TextField";
import SelectField from "@/components/common/SelectField";
import { Toggle } from "@/components/common/Toggle";
import { updateEventDetails } from "@/lib/game-service";
import { TOURNAMENT_LEVEL_OPTIONS } from "@/model/tournament-level";
import { updateTournamentLevel } from "@/lib/game-service";
import { TournamentLevel } from "@/db/games/types/tournament-level";
import { useTranslations } from "@/i18n/useTranslations";
import {
  type EventTypeChoice,
  type PairsScoring,
  type TeamsScoring,
  EVENT_TYPE_MAP,
  EVENT_TYPE_OPTIONS,
  eventTypeChoiceOf,
  isPairsChoice,
  scoringTypeFor,
  splitScoring,
} from "@/model/event-type-choice";

interface Props {
  /** Leave the edit screen (back arrow / after a save), returning to setup. */
  onDone: () => void;
}

/**
 * Director screen to review and adjust a game's event details after creation —
 * the same options as the create form (event name, director, event type,
 * scoring, tournament level, and the per-game toggles), prefilled from the
 * already-created game. Reached by the back arrow on the setup views.
 *
 * Changing the event type or scoring is a structural change that can invalidate
 * a movement already chosen for the section, so if a movement is selected the
 * director is asked to confirm; on confirm the movement is cleared server-side
 * and they re-pick one that fits.
 */
export function EditEventDetailsPage({ onDone }: Props) {
  const t = useTranslations();
  const { game, mutateGame } = useRequiredGame();

  const [eventName, setEventName] = useState(game.eventName);
  const [director, setDirector] = useState(game.director ?? "");
  const [eventType, setEventType] = useState<EventTypeChoice>(
    eventTypeChoiceOf(game.gameType, game.eventFormat),
  );
  const initialScoring = splitScoring(game.scoringType);
  const [pairsScoring, setPairsScoring] = useState<PairsScoring>(
    initialScoring.pairsScoring,
  );
  const [teamsScoring, setTeamsScoring] = useState<TeamsScoring>(
    initialScoring.teamsScoring,
  );
  const [tournamentLevel, setTournamentLevel] = useState<TournamentLevel>(
    game.tournamentLevel,
  );
  const [leadCardRequired, setLeadCardRequired] = useState(
    game.leadCardRequired,
  );
  const [handEntryEnabled, setHandEntryEnabled] = useState(
    game.handEntryEnabled,
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const eventNameInvalid = eventName.trim().length === 0;

  const { gameType, eventFormat } = EVENT_TYPE_MAP[eventType];
  const scoringType = scoringTypeFor(eventType, pairsScoring, teamsScoring);

  // Whether the chosen type/scoring differs from what the game was created with
  // — a structural change that would clear a movement already selected.
  const structuralChange =
    gameType !== game.gameType ||
    eventFormat !== game.eventFormat ||
    scoringType !== game.scoringType;
  const hasMovement = game.selectedMovement != null;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (eventNameInvalid || saving) return;

    // A structural change clears a chosen movement — confirm first so the
    // director doesn't lose it unknowingly.
    if (structuralChange && hasMovement) {
      const ok = window.confirm(
        "Changing the event type or scoring will clear the movement you've selected, so you'll need to pick a new one. Continue?",
      );
      if (!ok) return;
    }

    setSaving(true);
    setError(null);

    const trimmedName = eventName.trim();
    const trimmedDirector = director.trim();

    try {
      await updateEventDetails(game.gameId, {
        eventName: trimmedName,
        director: trimmedDirector.length > 0 ? trimmedDirector : null,
        gameType,
        eventFormat,
        scoringType,
        leadCardRequired,
        handEntryEnabled,
      });
      // The tournament level lives on the same game but has its own endpoint;
      // only call it when it actually changed.
      if (tournamentLevel !== game.tournamentLevel) {
        await updateTournamentLevel(game.gameId, tournamentLevel);
      }
      // Reflect the saved values locally; the server also broadcasts the fresh
      // game row to every device.
      mutateGame(
        {
          ...game,
          eventName: trimmedName,
          director: trimmedDirector.length > 0 ? trimmedDirector : null,
          gameType,
          eventFormat,
          scoringType,
          leadCardRequired,
          handEntryEnabled,
          tournamentLevel,
          selectedMovement: structuralChange ? null : game.selectedMovement,
        },
        false,
      );
      onDone();
    } catch {
      setError("Could not save the event details. Please try again.");
      setSaving(false);
    }
  }

  return (
    <GamePageLayout
      headerTitle="Edit Event Details"
      backAction={onDone}
      actions={
        <button
          type="submit"
          form="edit-event-details-form"
          disabled={saving || eventNameInvalid}
          className="w-full py-3.5 text-lg font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      }
    >
      <form
        onSubmit={handleSave}
        id="edit-event-details-form"
        className="mx-auto flex w-full max-w-md flex-col gap-5 p-4"
      >
        <TextField
          label="Event Name"
          value={eventName}
          onChange={setEventName}
          invalid={eventNameInvalid}
        />

        <TextField
          label="Director Name"
          value={director}
          onChange={setDirector}
        />

        <SelectField
          label="Event Type"
          value={eventType}
          options={EVENT_TYPE_OPTIONS}
          onSelect={setEventType}
          inline
        />

        {eventType === "SWISS_TEAMS" ? (
          <p className="text-sm text-gray-500">
            Scoring:{" "}
            <span className="font-semibold text-gray-700">
              IMP (Victory Points)
            </span>
          </p>
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

        <SelectField
          label="Tournament Level"
          value={tournamentLevel}
          options={TOURNAMENT_LEVEL_OPTIONS}
          onSelect={setTournamentLevel}
          inline
        />

        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700">
            Record Opening Lead
          </span>
          <Toggle
            value={leadCardRequired}
            offLabel="No"
            onLabel="Yes"
            onChange={setLeadCardRequired}
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700">
            Allow Hand Entry
          </span>
          <Toggle
            value={handEntryEnabled}
            offLabel="No"
            onLabel="Yes"
            onChange={setHandEntryEnabled}
          />
        </div>

        {structuralChange && hasMovement && (
          <p className="text-sm text-amber-700">
            Changing the event type or scoring will clear the movement you have
            selected.
          </p>
        )}

        {error && (
          <p role="alert" className="text-sm font-medium text-red-600">
            {error}
          </p>
        )}
      </form>
    </GamePageLayout>
  );
}
