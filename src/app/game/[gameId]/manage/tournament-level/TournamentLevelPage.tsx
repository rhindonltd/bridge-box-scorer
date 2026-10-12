"use client";

import { useState } from "react";
import { useRequiredGame } from "@/context/GameContext";
import { GamePageLayout } from "@/components/layout/GamePageLayout";
import SelectField from "@/components/common/SelectField";
import { updateTournamentLevel } from "@/lib/game-service";
import { TournamentLevel } from "@/db/games/types/tournament-level";
import {
  TOURNAMENT_LEVEL_OPTIONS,
  TOURNAMENT_LEVEL_INFO,
  DEFAULT_TOURNAMENT_LEVEL,
} from "@/model/tournament-level";

interface TournamentLevelPageProps {
  onDone: () => void;
}

/**
 * Director screen to correct a game's EBU tournament level after creation. The
 * level fixes the USEBIO masterpoint/charge fields on export, so a level set
 * wrongly at setup can be fixed here any time before the results are submitted.
 */
export function TournamentLevelPage({ onDone }: TournamentLevelPageProps) {
  const { game, mutateGame } = useRequiredGame();

  // Fall back to the default level for an older row with no explicit value, so
  // the dropdown always shows a concrete selection.
  const current = game.tournamentLevel ?? DEFAULT_TOURNAMENT_LEVEL;
  const [level, setLevel] = useState<TournamentLevel>(current);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = level !== current;
  const info = TOURNAMENT_LEVEL_INFO[level];

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!dirty) {
      onDone();
      return;
    }

    setSaving(true);
    setError(null);

    const previous = game.tournamentLevel;
    // Optimistically reflect the choice; the server broadcasts the fresh game
    // row to every device on success.
    mutateGame({ ...game, tournamentLevel: level }, false);

    try {
      await updateTournamentLevel(game.gameId, level);
      onDone();
    } catch {
      // Roll back the optimistic change on failure.
      mutateGame({ ...game, tournamentLevel: previous }, false);
      setError("Could not save the tournament level. Please try again.");
      setSaving(false);
    }
  }

  return (
    <GamePageLayout
      headerTitle="Tournament Level"
      centerContent={true}
      backAction={onDone}
      actions={
        <button
          type="submit"
          form="tournament-level-form"
          disabled={saving}
          className="w-full py-3.5 text-lg font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      }
    >
      <form
        onSubmit={handleSave}
        id="tournament-level-form"
        className="px-6 max-w-sm w-full mx-auto space-y-4"
      >
        <p className="text-sm text-gray-600">
          The tournament level sets how the EBU charges this event and which
          Master Points and NGS updates it awards. Correct it here if it was set
          wrongly when the game was created.
        </p>

        <SelectField
          label="Tournament Level"
          value={level}
          options={TOURNAMENT_LEVEL_OPTIONS}
          onSelect={setLevel}
        />

        <dl className="text-sm text-gray-600 border border-gray-200 rounded-lg divide-y divide-gray-200">
          <div className="flex items-center justify-between px-3 py-2">
            <dt>Masterpoint scale</dt>
            <dd className="font-semibold text-gray-800">
              {info.masterPointScale}
            </dd>
          </div>
          <div className="flex items-center justify-between px-3 py-2">
            <dt>Masterpoint type</dt>
            <dd className="font-semibold text-gray-800">
              {info.masterPointType}
            </dd>
          </div>
          <div className="flex items-center justify-between px-3 py-2">
            <dt>Charge rate</dt>
            <dd className="font-semibold text-gray-800">
              {info.p2pChargeRate}
            </dd>
          </div>
        </dl>

        {error && (
          <p role="alert" className="text-red-600 text-base text-center">
            {error}
          </p>
        )}
      </form>
    </GamePageLayout>
  );
}
