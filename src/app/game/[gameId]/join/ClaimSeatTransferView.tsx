"use client";

import { PageLayout } from "@/components/layout/PageLayout";

interface Props {
  code: string;
  error: string | null;
  loading: boolean;
  onCodeChange: (code: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

/**
 * Presentational code-entry form for taking over a seat from another device.
 * Mirrors ClaimDirectorCodeView (6-char code, uppercased) but scoped to the
 * player seat-transfer flow. Laid out like AdminKeyEntryView: a header bar with
 * a back button (cancels), a centered form, and a single fixed-bottom action.
 */
export function ClaimSeatTransferView({
  code,
  error,
  loading,
  onCodeChange,
  onSubmit,
  onCancel,
}: Props) {
  return (
    <PageLayout
      headerTitle="Join Game"
      backAction={onCancel}
      centerContent={true}
      actions={
        <button
          type="submit"
          form="claim-seat-transfer"
          disabled={loading || code.length < 6}
          className="w-full py-3.5 text-lg font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-[0.98] transition disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          {loading ? "Moving…" : "Take over seat"}
        </button>
      }
    >
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <h1 className="text-xl font-bold text-gray-900 mb-2">
          Move a seat to this device
        </h1>
        <p className="text-base text-gray-600 mb-8 text-center">
          On your other device, choose{" "}
          <span className="font-semibold">Change device</span> and enter the
          code it shows here.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
          id="claim-seat-transfer"
          className="w-full max-w-xs space-y-4"
        >
          <div>
            <label htmlFor="seat-transfer-code" className="sr-only">
              Transfer code
            </label>
            <input
              id="seat-transfer-code"
              type="text"
              value={code}
              onChange={(e) => onCodeChange(e.target.value.toUpperCase())}
              placeholder="Enter code"
              maxLength={6}
              autoFocus
              autoComplete="off"
              className="w-full text-center font-mono text-2xl font-bold uppercase tracking-[0.3em] p-4 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {error && (
            <p role="alert" className="text-red-600 text-base text-center">
              {error}
            </p>
          )}
        </form>
      </div>
    </PageLayout>
  );
}
