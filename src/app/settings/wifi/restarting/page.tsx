"use client";

import { useEffect, useState } from "react";
import { WifiRestartingPage } from "@/app/settings/wifi/restarting/WifiRestartingPage";

export default function WifiRestarting() {
  const [seconds, setSeconds] = useState(30);
  const [status] = useState("Rebooting device...");

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
            // Full-page navigation is intentional: the device has just come
            // back online after a reboot, so a hard reload re-establishes the
            // app and Socket.IO connection cleanly.
            // eslint-disable-next-line @next/next/no-location-assign-relative-destination
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

  return <WifiRestartingPage seconds={seconds} status={status} />;
}
