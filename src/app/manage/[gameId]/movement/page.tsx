"use client";

import { ManageMovementPage } from "@/components/pages/manage/ManageMovementPage";
import { useParams, useRouter } from "next/navigation";

export default function ManageMovementRoute() {
  const params = useParams<{ gameId: string }>();
  const router = useRouter();
  const gameId = params.gameId;

  return (
    <ManageMovementPage
      onBack={() => router.replace(`/manage/${gameId}/menu`)}
    />
  );
}
