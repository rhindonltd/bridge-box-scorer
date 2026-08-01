"use client";

import Button from "@/components/common/Button";
import { useState } from "react";

interface PinEntryProps {
  correctPin: string;
  onSuccess: () => void;
}

export function PinEntryPage({ correctPin, onSuccess }: PinEntryProps) {
  const [pinInput, setPinInput] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === correctPin) {
      onSuccess();
    } else {
      setError("Incorrect PIN, try again.");
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-xl shadow-md flex-1 flex flex-col justify-center">
      <h1 className="text-2xl font-bold mb-6 text-center">Enter PIN to continue</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="pin-input" className="text-sm font-semibold text-gray-700">
            PIN
          </label>
          <input
            id="pin-input"
            type="password"
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
            placeholder="Enter PIN"
            autoFocus
            aria-describedby={error ? "pin-error" : undefined}
            className="p-3 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {error && (
          <p id="pin-error" role="alert" className="text-red-600 text-sm">
            {error}
          </p>
        )}

        <Button type="submit" value="Enter" className="w-full" />
      </form>
    </div>
  );
}
