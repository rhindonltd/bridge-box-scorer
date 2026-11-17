"use client";

import { useRouter } from "next/navigation";
import ExportSelectGamePage from "@/app/export/ExportSelectGamePage";

export default function ExportRoute() {
  const router = useRouter();
  return (
    <ExportSelectGamePage
      onGameSelected={(gameId) => router.push(`/game/${gameId}/export`)}
    />
  );
}
