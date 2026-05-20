"use client";

import { AssignmentProvider } from "@/context/AssignmentContext";
import { PlayProvider } from "@/context/PlayContext";

export default function GameLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AssignmentProvider>
      <PlayProvider>{children}</PlayProvider>
    </AssignmentProvider>
  );
}
