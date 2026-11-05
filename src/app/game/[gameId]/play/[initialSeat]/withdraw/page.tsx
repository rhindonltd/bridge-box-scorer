"use client";

import { useParams, useRouter } from "next/navigation";
import { WithdrawPage } from "@/app/game/[gameId]/play/[initialSeat]/withdraw/WithdrawPage";
import { withdrawPair } from "@/lib/game-service";

/**
 * Withdraw route (design §11): the pair holding this seat withdraws itself.
 * Cancelling returns to play; once withdrawn, Done goes to the home screen.
 */
export default function WithdrawRoute() {
  const params = useParams<{ gameId: string; initialSeat: string }>();
  const router = useRouter();
  const { gameId, initialSeat: seat } = params;

  return (
    <WithdrawPage
      onCancel={() => router.replace(`/game/${gameId}/play/${seat}`)}
      onConfirm={() => withdrawPair(gameId, seat)}
      onDone={() => router.replace("/")}
    />
  );
}
