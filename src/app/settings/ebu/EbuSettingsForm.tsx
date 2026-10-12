"use client";

import { PageLayout } from "@/components/layout/PageLayout";

const primaryButtonClass =
  "w-full py-3.5 text-lg font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50";

/**
 * Presentational EBU settings form. Owns no data fetching — the parent
 * ({@link import("./EbuSettingsPage").EbuSettingsPage}) loads the configured
 * status over SWR and performs the save. The header's back arrow returns to the
 * previous screen. Splitting it out keeps the form storyable and testable
 * without request mocking.
 *
 * The password field is always edit-only: the stored password is never sent to
 * the client, so a blank password on an already-configured account means "keep
 * the existing one".
 */
export interface EbuSettingsFormProps {
  ebuNumber: string;
  password: string;
  /** Whether EBU credentials are already stored (changes copy + rules). */
  configured: boolean;
  saving: boolean;
  /** Status/validation message. "✅"-prefixed renders as success, else error. */
  message: string | null;
  onEbuNumberChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSave: (e: React.FormEvent) => void;
  onBack: () => void;
}

export function EbuSettingsForm({
  ebuNumber,
  password,
  configured,
  saving,
  message,
  onEbuNumberChange,
  onPasswordChange,
  onSave,
  onBack,
}: EbuSettingsFormProps) {
  return (
    <PageLayout
      headerTitle="EBU"
      backAction={onBack}
      actions={
        <button
          type="submit"
          form="ebu-settings-form"
          disabled={saving}
          className={primaryButtonClass}
        >
          {saving ? "Saving..." : "Save"}
        </button>
      }
    >
      <form
        id="ebu-settings-form"
        onSubmit={onSave}
        className="px-6 pt-6 max-w-sm w-full mx-auto"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Connect your club&apos;s EBU account to submit session results to the
            English Bridge Union for masterpoints and NGS grading.
          </p>

          <div>
            <label
              htmlFor="ebu-number"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              EBU Club Number
            </label>
            <input
              id="ebu-number"
              type="text"
              value={ebuNumber}
              onChange={(e) => onEbuNumberChange(e.target.value)}
              placeholder="e.g. 1234567"
              className="w-full p-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="ebu-password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              EBU Password
            </label>
            <input
              id="ebu-password"
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
      </form>
    </PageLayout>
  );
}
