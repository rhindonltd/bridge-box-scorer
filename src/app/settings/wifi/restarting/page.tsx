"use client";

import { useEffect, useState } from "react";
import {WifiRestartingPage} from "@/components/pages/settings/WifiRestartingPage";

export default function WifiRestarting() {
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
      <WifiRestartingPage seconds={seconds} status={status} />
  );
}
