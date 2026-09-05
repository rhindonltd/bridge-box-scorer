"use client";

import { PageLayout } from "@/components/layout/PageLayout";

interface ClaimDirectorCodeViewProps {
  gameName: string;
  code: string;
  error: string | null;
  loading: boolean;
  onCodeChange: (code: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export function ClaimDirectorCodeView({
  gameName: _gameName,
  code,
  error,
  loading,
  onCodeChange,
  onSubmit,
  onCancel,
}: ClaimDirectorCodeViewProps) {
  return (
    <PageLayout
      headerTitle="Claim Director Code"
      centerContent={true}
      actions={
        <>
          <button
            type="submit"
            form="claim-director-code"
            disabled={loading || code.length < 6}
            className="w-full py-3.5 text-lg font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-[0.98] transition disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            {loading ? "Claiming..." : "Claim Access"}
          </button>

          <button
            type="button"
            onClick={onCancel}
            className="w-full py-3 text-base font-semibold text-gray-600 hover:text-gray-800 transition"
          >
            Cancel
          </button>
        </>
      }
    >
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <h1 className="text-xl font-bold text-gray-900 mb-2">
          Become Director
        </h1>
        <p className="text-base text-gray-600 mb-8 text-center">
          Please enter the share code
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
          id="claim-director-code"
          className="w-full max-w-xs space-y-4"
        >
          <div>
            <label htmlFor="share-code" className="sr-only">
              Share Code
            </label>
            <input
              id="share-code"
              type="text"
              value={code}
              onChange={(e) => onCodeChange(e.target.value.toUpperCase())}
              placeholder="Enter code"
              maxLength={6}
              autoFocus
              autoComplete="off"
              className="w-full text-center text-2xl font-mono font-bold tracking-[0.3em] p-4 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
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
