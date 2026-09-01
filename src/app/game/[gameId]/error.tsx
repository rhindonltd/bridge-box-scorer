"use client";

import Link from "next/link";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GameError({ error, reset }: Props) {
  return (
    <div className="flex-1 flex items-center justify-center bg-gray-100">
      <div className="text-center max-w-md px-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          There was a problem with this game
        </h2>
        <p className="text-gray-600 mb-6">
          {error.message || "An unexpected error occurred."}
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={reset}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 transition text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            Back to Main Menu
          </Link>
        </div>
      </div>
    </div>
  );
}
