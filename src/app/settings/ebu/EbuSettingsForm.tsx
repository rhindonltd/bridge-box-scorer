"use client";

import { PageLayout } from "@/components/layout/PageLayout";

const primaryButtonClass =
  "w-full py-3.5 text-lg font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50";

const inputClass =
  "w-full p-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";

/**
 * Presentational EBU settings form: the club's identity (name + EBU club
 * number, used on every results file) and the optional EBU login password
 * (only needed to submit results to the EBU). Owns no data fetching — the
 * parent ({@link import("./EbuSettingsPage").EbuSettingsPage}) loads the
 * current values over SWR and performs the save. The header's back arrow
 * returns to the previous screen. Splitting it out keeps the form storyable and
 * testable without request mocking.
 *
 * The password field is always edit-only: the stored password is never sent to
 * the client, so a blank password on an already-configured account means "keep
 * the existing one".
 */
export interface EbuSettingsFormProps {
  clubName: string;
  ebuNumber: string;
  password: string;
  /** Whether an EBU password is already stored (changes copy). */
  configured: boolean;
  saving: boolean;
  /** Status/validation message. "✅"-prefixed renders as success, else error. */
  message: string | null;
  onClubNameChange: (value: string) => void;
  onEbuNumberChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSave: (e: React.FormEvent) => void;
  onBack: () => void;
}

export function EbuSettingsForm({
  clubName,
  ebuNumber,
  password,
  configured,
  saving,
  message,
  onClubNameChange,
  onEbuNumberChange,
  onPasswordChange,
  onSave,
  onBack,
}: EbuSettingsFormProps) {
  return (
    <PageLayout
      headerTitle="EBU"
      backAction={onBack}
      // Centre the form in the space between the header and the Save bar.
      centerContent={true}
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
        className="px-6 py-6 max-w-sm w-full mx-auto"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Your club&apos;s name and EBU number identify the club on published
            results and exported files.
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
              value={clubName}
              onChange={(e) => onClubNameChange(e.target.value)}
              placeholder="e.g. Anytown Bridge Club"
              className={inputClass}
            />
          </div>

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
              className={inputClass}
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
              aria-describedby="ebu-password-hint"
              className={inputClass}
            />
            <p
              id="ebu-password-hint"
              className={`mt-1 text-xs ${configured ? "text-green-700" : "text-gray-600"}`}
            >
              {configured
                ? "A password is saved. Leave blank to keep it."
                : "Only needed to submit results to the EBU for masterpoints and NGS grading."}
            </p>
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
