"use client";

import { HeaderBar } from "@/components/layout/HeaderBar";

/**
 * Presentational club-information form. It owns no data fetching — the parent
 * ({@link ClubSettingsPage}) loads the club record over SWR and performs the
 * save; this component just renders the fields, the status message, and the
 * Save button. The header's back arrow returns to the previous screen.
 * Splitting it out keeps the form storyable and unit-testable without wiring up
 * request mocking.
 */
export interface ClubSettingsFormProps {
  /** Current club name value (controlled by the parent). */
  name: string;
  /** Current EBU club number value (controlled by the parent). */
  clubNumber: string;
  /** Whether a save is in flight (disables the Save button). */
  saving: boolean;
  /**
   * Status/validation message. A message starting with "✅" renders as success
   * (green); anything else renders as an error (red).
   */
  message: string | null;
  onNameChange: (value: string) => void;
  onClubNumberChange: (value: string) => void;
  onSave: (e: React.FormEvent) => void;
  onBack: () => void;
}

export function ClubSettingsForm({
  name,
  clubNumber,
  saving,
  message,
  onNameChange,
  onClubNumberChange,
  onSave,
  onBack,
}: ClubSettingsFormProps) {
  return (
    <div className="min-h-dvh flex flex-col bg-white">
      <HeaderBar headerTitle="Club Information" backAction={onBack} />

      <form
        onSubmit={onSave}
        className="flex-1 flex flex-col px-6 pt-6 pb-8 max-w-sm w-full mx-auto"
      >
        <div className="space-y-4 flex-1">
          <p className="text-sm text-gray-600">
            Set your club&apos;s name and EBU number. These identify the club on
            published results and USEBIO exports.
          </p>

          <div>
            <label
              htmlFor="club-name"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Club Name
            </label>
            <input
              id="club-name"
              type="text"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="e.g. Anytown Bridge Club"
              className="w-full p-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="club-number"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              EBU Club Number
            </label>
            <input
              id="club-number"
              type="text"
              value={clubNumber}
              onChange={(e) => onClubNumberChange(e.target.value)}
              placeholder="e.g. 12345"
              className="w-full p-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {message && (
            <p
              className={`text-base text-center ${message.startsWith("✅") ? "text-green-700" : "text-red-600"}`}
            >
              {message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3 pt-6">
          <button
            type="submit"
            disabled={saving}
            className="w-full py-3.5 text-lg font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
