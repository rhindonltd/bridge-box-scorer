"use client";

/**
 * Presentational BridgeWebs settings form. Owns no data fetching — the parent
 * ({@link BridgewebsSettingsPage}) loads the configured status over SWR and
 * performs the save. Splitting it out keeps the form storyable and testable
 * without request mocking.
 *
 * The password field is always edit-only: the stored password is never sent to
 * the client, so a blank password on an already-configured account means "keep
 * the existing one".
 */
export interface BridgewebsSettingsFormProps {
  club: string;
  password: string;
  /** Whether BridgeWebs credentials are already stored (changes copy + rules). */
  configured: boolean;
  saving: boolean;
  /** Status/validation message. "✅"-prefixed renders as success, else error. */
  message: string | null;
  onClubChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSave: (e: React.FormEvent) => void;
  onBack: () => void;
}

export function BridgewebsSettingsForm({
  club,
  password,
  configured,
  saving,
  message,
  onClubChange,
  onPasswordChange,
  onSave,
  onBack,
}: BridgewebsSettingsFormProps) {
  return (
    <div className="min-h-dvh flex flex-col bg-white">
      <div className="bg-gray-200 text-gray-800 py-3 text-center font-bold text-lg shrink-0">
        BridgeWebs
      </div>

      <form
        onSubmit={onSave}
        className="flex-1 flex flex-col px-6 pt-6 pb-8 max-w-sm w-full mx-auto"
      >
        <div className="space-y-4 flex-1">
          <p className="text-sm text-gray-600">
            Connect your club&apos;s BridgeWebs account to list the day&apos;s
            events when creating a game and upload results.
          </p>

          <div>
            <label
              htmlFor="bw-club"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              BridgeWebs Club Code
            </label>
            <input
              id="bw-club"
              type="text"
              value={club}
              onChange={(e) => onClubChange(e.target.value)}
              placeholder="e.g. anytownbc"
              className="w-full p-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="bw-password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              BridgeWebs Password
            </label>
            <input
              id="bw-password"
              type="password"
              value={password}
              autoComplete="new-password"
              onChange={(e) => onPasswordChange(e.target.value)}
              placeholder={
                configured ? "•••••••• (leave blank to keep)" : "Enter password"
              }
              className="w-full p-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {configured && (
              <p className="mt-1 text-xs text-green-700">
                A password is saved. Leave blank to keep it.
              </p>
            )}
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

          <button
            type="button"
            onClick={onBack}
            className="w-full py-3.5 text-lg font-semibold bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            Back
          </button>
        </div>
      </form>
    </div>
  );
}
