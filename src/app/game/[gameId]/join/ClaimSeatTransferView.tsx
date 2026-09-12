"use client";

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
 * player seat-transfer flow.
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
    <div className="flex flex-col items-center text-center">
      <h2 className="mb-1 text-lg font-bold text-gray-900">
        Move a seat to this device
      </h2>
      <p className="mb-6 text-sm text-gray-600">
        On your other device, choose{" "}
        <span className="font-semibold">Change device</span> and enter the code
        it shows here.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        id="claim-seat-transfer"
        className="w-full max-w-xs space-y-4"
      >
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
          className="w-full rounded-xl border-2 border-gray-300 p-4 text-center font-mono text-2xl font-bold uppercase tracking-[0.3em] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {error && (
          <p role="alert" className="text-base text-red-600">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || code.length < 6}
          className="w-full rounded-xl bg-blue-600 py-3.5 text-lg font-semibold text-white transition hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          {loading ? "Moving…" : "Take over seat"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="w-full py-2 text-base font-semibold text-gray-600 transition hover:text-gray-800"
        >
          Cancel
        </button>
      </form>
    </div>
  );
}
