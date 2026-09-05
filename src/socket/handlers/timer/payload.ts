import { z } from "zod";
import { GameTypes } from "@/db/games/types/game-type";
import { BreakConfig } from "@/timer/timer-state";

/**
 * Zod schema for a single configured break. Mirrors {@link BreakConfig}: a
 * break is either a fixed duration (seconds) or a resume-time (ms since epoch),
 * both keyed to the round it follows.
 */
export const breakConfigSchema = z.discriminatedUnion("mode", [
  z.object({
    afterRound: z.number().int().positive(),
    mode: z.literal("duration"),
    durationSeconds: z.number().int().nonnegative(),
  }),
  z.object({
    afterRound: z.number().int().positive(),
    mode: z.literal("resumeTime"),
    resumeAtMs: z.number().int().nonnegative(),
  }),
]);

/** Optional break list + warning threshold shared by create/update payloads. */
export const timerConfigExtras = {
  breaks: z.array(breakConfigSchema).optional(),
  warningSeconds: z.number().int().nonnegative().optional(),
};

/** Fields common to every director-initiated timer control event. */
export const directorTimerFields = {
  gameType: z.enum(GameTypes),
  gameId: z.string().min(1),
  /** The section whose timer this event targets. */
  section: z.string().min(1),
  directorToken: z.string().min(1),
};

/**
 * Narrow the parsed breaks (which Zod types loosely) to the domain
 * {@link BreakConfig} array.
 */
export function toBreakConfigs(
  breaks: z.infer<typeof breakConfigSchema>[] | undefined,
): BreakConfig[] | undefined {
  return breaks as BreakConfig[] | undefined;
}
