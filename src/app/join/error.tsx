"use client";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function JoinError({ error, reset }: Props) {
  return (
    <div className="h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center max-w-md px-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Unable to join game
        </h2>
        <p className="text-gray-600 mb-6">
          {error.message || "Failed to load game data."}
        </p>
        <button
          onClick={reset}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
