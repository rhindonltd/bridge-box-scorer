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
    <div className="max-w-md mx-auto mt-16 p-6 bg-white rounded-xl shadow-md font-sans h-screen">
      <h2 className="text-2xl font-bold mb-4">Enter PIN to continue</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="password"
          value={pinInput}
          onChange={(e) => setPinInput(e.target.value)}
          placeholder="PIN"
          autoFocus
        />
        <Button type="submit" value="Enter" />
      </form>
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}
