"use client";
import { Suspense } from "react";
import { ShareDirectorAccessPage } from "@/app/game/[gameId]/manage/share-access/ShareDirectorAccessPage";
import { useParams, useSearchParams } from "next/navigation";

export default function ShareDirectorAccessRoute() {
  return (
    // The page reads the `?from=` search param.
    <Suspense>
      <ShareDirectorAccess />
    </Suspense>
  );
}

function ShareDirectorAccess() {
  const params = useParams<{ gameId: string }>();
  const fromSetup = useSearchParams().get("from") === "setup";
  return (
    <ShareDirectorAccessPage gameId={params.gameId} fromSetup={fromSetup} />
  );
}
