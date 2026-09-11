"use client";

import { useState } from "react";
import { claimDirectorCode } from "@/lib/game-service";
import { ClaimDirectorCodeView } from "@/app/manage/ClaimDirectorCodeView";

interface Props {
  gameId: string;
  gameName: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ClaimDirectorCode({
  gameId: _gameId,
  gameName,
  onSuccess,
  onCancel,
}: Props) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleSubmit() {
    if (!code.trim()) return;

    setError(null);
    setLoading(true);

    claimDirectorCode(code.trim().toUpperCase())
      .then(() => onSuccess())
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to claim code"),
      )
      .finally(() => setLoading(false));
  }

  return (
    <ClaimDirectorCodeView
      gameName={gameName}
      code={code}
      error={error}
      loading={loading}
      onCodeChange={setCode}
      onSubmit={handleSubmit}
      onCancel={onCancel}
    />
  );
}
