"use client";

import SelectField from "@/components/common/SelectField";
import { TournamentLevel } from "@/db/games/types/tournament-level";
import {
  TOURNAMENT_LEVEL_OPTIONS,
  TOURNAMENT_LEVEL_INFO,
} from "@/model/tournament-level";

interface TournamentLevelSelectProps {
  value: TournamentLevel;
  onChange: (level: TournamentLevel) => void;
  /** Disable the control (e.g. while an export is in flight). */
  disabled?: boolean;
}

/**
 * The EBU tournament-level picker used in the three export flows (Download
 * USEBIO, Upload to BridgeWebs, Upload to EBU). The level fixes the USEBIO
 * masterpoint/charge EVENT fields for that export; each flow pre-fills it from
 * the game's last-used value and saves the new choice back on export.
 *
 * Shows the resolved masterpoint scale / type / charge rate below the dropdown
 * so the director can confirm the EBU fields before publishing.
 */
export function TournamentLevelSelect({
  value,
  onChange,
  disabled = false,
}: TournamentLevelSelectProps) {
  const info = TOURNAMENT_LEVEL_INFO[value];

  return (
    <fieldset disabled={disabled} className="space-y-4">
      <p className="text-sm text-gray-600">
        The tournament level sets how the EBU charges this event and which
        Master Points and NGS updates it awards.
      </p>

      <SelectField
        label="Tournament Level"
        value={value}
        options={TOURNAMENT_LEVEL_OPTIONS}
        onSelect={onChange}
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
          <dd className="font-semibold text-gray-800">{info.p2pChargeRate}</dd>
        </div>
      </dl>
    </fieldset>
  );
}
