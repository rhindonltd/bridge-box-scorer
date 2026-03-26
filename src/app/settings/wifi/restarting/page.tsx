"use client";

import { useEffect, useState } from "react";

export default function Page() {
  const [seconds, setSeconds] = useState(30);
  const [status, setStatus] = useState("Rebooting device...");

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((s) => s - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (seconds < 15) {
      const check = async () => {
        try {
          const res = await fetch("/api/system/network");
          if (res.ok) {
            window.location.href = "/";
          }
        } catch {
          // still offline
        }
      };

      const interval = setInterval(check, 3000);
      return () => clearInterval(interval);
    }
  }, [seconds]);

  return (
    <div style={{ textAlign: "center", marginTop: 100 }}>
      <h1>{status}</h1>
      <p>Reconnecting in {seconds}s...</p>
      <p>If disconnected, reconnect to BridgeBox WiFi</p>
    </div>
  );
}
