"use client";

/**
 * Presentational "update admin key" form. Owns no logic — the parent
 * ({@link UpdateAdminKeyPage}) holds the field state, validation, and save.
 */
export interface UpdateAdminKeyFormProps {
  newKey: string;
  confirmKey: string;
  saving: boolean;
  /** Status/validation message. "✅"-prefixed renders as success, else error. */
  message: string | null;
  onNewKeyChange: (value: string) => void;
  onConfirmKeyChange: (value: string) => void;
  onSave: (e: React.FormEvent) => void;
  onBack: () => void;
}

export function UpdateAdminKeyForm({
  newKey,
  confirmKey,
  saving,
  message,
  onNewKeyChange,
  onConfirmKeyChange,
  onSave,
  onBack,
}: UpdateAdminKeyFormProps) {
  return (
    <div className="min-h-dvh flex flex-col bg-white">
      <div className="bg-gray-200 text-gray-800 py-3 text-center font-bold text-lg shrink-0">
        Update Admin Key
      </div>

      <form
        onSubmit={onSave}
        className="flex-1 flex flex-col px-6 pt-6 pb-8 max-w-sm w-full mx-auto"
      >
        <div className="space-y-4 flex-1">
          <p className="text-sm text-gray-600">
            The admin key controls access to this Settings section and device
            configuration. Keep it somewhere safe.
          </p>

          <div>
            <label
              htmlFor="new-key"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              New Admin Key
            </label>
            <input
              id="new-key"
              type="password"
              value={newKey}
              onChange={(e) => onNewKeyChange(e.target.value)}
              autoComplete="new-password"
              className="w-full p-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="confirm-key"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Confirm Admin Key
            </label>
            <input
              id="confirm-key"
              type="password"
              value={confirmKey}
              onChange={(e) => onConfirmKeyChange(e.target.value)}
              autoComplete="new-password"
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
            {saving ? "Saving..." : "Update Key"}
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
