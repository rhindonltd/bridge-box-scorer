"use client";

import { useParams, useRouter } from "next/navigation";

import ManageMovementPage from "@/components/pages/manage/movement/ManageMovementPage";

export default function ManageMovementRoute() {
  const params = useParams<{ gameId: string }>();
  const router = useRouter();
  const gameId = params.gameId;

  return (<ManageMovementPage onBack={() => router.replace(`/manage/${gameId}/menu`)} />);
}
