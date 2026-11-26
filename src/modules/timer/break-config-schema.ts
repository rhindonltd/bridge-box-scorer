import { z } from "zod";
import { BreakConfig } from "@/modules/timer/timer-state";

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

/**
 * Narrow the parsed breaks (which Zod types loosely) to the domain
 * {@link BreakConfig} array.
 */
export function toBreakConfigs(
  breaks: z.infer<typeof breakConfigSchema>[] | undefined,
): BreakConfig[] | undefined {
  return breaks as BreakConfig[] | undefined;
}
