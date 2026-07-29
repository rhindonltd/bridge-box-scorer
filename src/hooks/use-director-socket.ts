"use client";

import { useEffect, useState } from "react";
import { getDirectorSocket } from "@/lib/socket";

/**
 * Fetches the director token from the server (via the httpOnly cookie) and
 * initialises the socket connection with it as handshake auth.
 *
 * Use this hook in director-only pages/components instead of calling
 * getSocket() directly.
 */
export function useDirectorSocket() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      try {
        const res = await fetch("/api/director/token");
        if (!res.ok) {
          setError("Not authorised as director");
          return;
        }
        const { token } = await res.json();
        getDirectorSocket(token);
        setReady(true);
      } catch {
        setError("Failed to initialise director socket");
      }
    }

    init();
  }, []);

  return { ready, error };
}
