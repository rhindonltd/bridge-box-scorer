"use client";

import { PageLayout } from "@/components/layout/PageLayout";

interface Props {
  code: string;
  error: string | null;
  loading: boolean;
  onCodeChange: (code: string) => void;
  onSubmit: () => void;
}

export function AdminKeyEntryView({
  code,
  error,
  loading,
  onCodeChange,
  onSubmit,
}: Props) {
  return (
    <PageLayout
      headerTitle="Settings"
      centerContent={true}
      children={
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Admin Access</h1>
          <p className="text-base text-gray-600 mb-8 text-center">
            Enter the admin key shown on the label underneath the device.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSubmit();
            }}
            id="admin-key-entry"
            className="w-full max-w-xs space-y-4"
          >
            <div>
              <label htmlFor="admin-key" className="sr-only">
                Admin Key
              </label>
              <input
                id="admin-key"
                type="password"
                value={code}
                onChange={(e) => onCodeChange(e.target.value)}
                placeholder="Enter admin key"
                autoFocus
                autoComplete="off"
                className="w-full text-center text-2xl font-mono font-bold tracking-[0.2em] p-4 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {error && (
              <p role="alert" className="text-red-600 text-base text-center">
                {error}
              </p>
            )}
          </form>
        </div>
      }
      actions={
        <button
          type="submit"
          form="admin-key-entry"
          disabled={loading || code.length === 0}
          className="w-full py-3.5 text-lg font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-[0.98] transition disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          {loading ? "Checking..." : "Unlock"}
        </button>
      }
    />
  );
}
