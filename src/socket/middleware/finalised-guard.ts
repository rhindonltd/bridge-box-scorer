import { isGameFinalised } from "@/db/game-index/queries/is-game-finalised";
import { HandlerError } from "@/socket/handlers/handler-wrapper";
import { FINALISED_MESSAGE } from "@/lib/finalised-message";

/**
 * Socket guard for handlers that change a game. Throws a user-facing
 * {@link HandlerError} when the game is finalised (read-only), which the handler
 * wrapper acks as `{ success: false, error }`.
 */
export async function assertNotFinalised(gameId: string): Promise<void> {
  if (await isGameFinalised(gameId)) {
    throw new HandlerError(FINALISED_MESSAGE);
  }
}
