"use client";

import { BoardProvider } from "@/context/BoardSelectionContext";

export default function GameLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <BoardProvider>{children}</BoardProvider>;
}
