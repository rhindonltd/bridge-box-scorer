"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

export default function WaitingForSession() {
  const [joined, setJoined] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io("http://localhost:3000");
    socketRef.current = socket;

    socket.on("session:started", () => {
      setJoined(true);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        fontFamily: "sans-serif",
        fontSize: "24px",
      }}
    >
      {joined ? "Session joined ✅" : "Waiting for session to start..."}
    </div>
  );
}
