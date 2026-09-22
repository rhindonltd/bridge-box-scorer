import type { Locale } from "./locale";
import type { ScoringType } from "@/db/games/types/scoring-type";

/** The scoring types offerable for a teams game. */
export type TeamsScoringType = Extract<ScoringType, "IMP" | "BAM" | "PAB">;

/**
 * A teams scoring option offered in the create-game form, as a label plus the
 * stored scoring type it maps to. Which options a locale offers (and their
 * labels) is a regional concern — e.g. the board-comparison teams method is
 * called "Point-a-Board" in the UK (`PAB`) and "Board-a-Match" in the US
 * (`BAM`); they are separate scoring types, not the same one relabelled.
 */
export interface ScoringOption {
  label: string;
  value: TeamsScoringType;
}

/** The set of user-facing strings that vary by locale. */
export interface Messages {
  /** Teams scoring choices offered on the create-game form, in display order. */
  teamsScoringOptions: ScoringOption[];
}

const enGB: Messages = {
  teamsScoringOptions: [
    { label: "IMP (Victory Points)", value: "IMP" },
    { label: "Point-a-Board", value: "PAB" },
  ],
};

const enUS: Messages = {
  teamsScoringOptions: [
    { label: "IMP (Victory Points)", value: "IMP" },
    { label: "Board-a-Match", value: "BAM" },
  ],
};

export const MESSAGES: Record<Locale, Messages> = {
  "en-GB": enGB,
  "en-US": enUS,
};
