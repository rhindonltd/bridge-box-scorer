"use client";

import { useState } from "react";
import { getSocket } from "@/lib/socket";
import { SocketEvents } from "@/socket/socket-events";
import { setDirectorToken } from "@/lib/director-token";
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

    getSocket().emit(
      SocketEvents.CLAIM_DIRECTOR_CODE,
      { code: code.trim().toUpperCase() },
      (res: {
        success: boolean;
        directorToken?: string;
        gameId?: string;
        error?: string;
      }) => {
        setLoading(false);

        if (res.success && res.directorToken && res.gameId) {
          setDirectorToken(res.gameId, res.directorToken);
          onSuccess();
        } else {
          setError(res.error ?? "Failed to claim code");
        }
      },
    );
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
