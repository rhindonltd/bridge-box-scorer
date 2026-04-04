"use client";

import { PlayProvider } from "@/context/PlayContext";

export default function GameLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PlayProvider>{children}</PlayProvider>;
}
