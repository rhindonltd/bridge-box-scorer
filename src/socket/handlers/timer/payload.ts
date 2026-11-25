import { z } from "zod";
import { GameTypes } from "@/model/game-types";

/** Fields common to every director-initiated timer control event. */
export const directorTimerFields = {
  gameType: z.enum(GameTypes),
  gameId: z.string().min(1),
  /** The section whose timer this event targets. */
  section: z.string().min(1),
  directorToken: z.string().min(1),
};
