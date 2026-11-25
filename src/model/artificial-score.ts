/**
 * EBU White Book §4.1.1.1 / Law 12C2 — the values of an artificial adjusted
 * score (AVE+ / AVE / AVE−) for pairs scoring, in ONE place.
 *
 * Every pairs path that produces or recognises an artificial award reads these:
 * the per-board scorers (`traveller/pair/assigned.ts`), the "better than
 * average" uplift (`traveller/pair/better-than-average*.ts`) and the withdrawal
 * / late-arrival absent-board outcomes. The uplift only re-values a side whose
 * flat value equals exactly these numbers, so the scorer and the uplift must
 * agree — hence the shared constants.
 *
 * The White Book default is ±3 IMPs. Some federations historically used ±2;
 * changing `ARTIFICIAL_IMP_AWARD` is the single switch for that.
 */

/** AVE+ / AVE− at matchpoints, as a percentage of the board top. */
export const AVE_PLUS_PERCENT = 60;
export const AVE_MINUS_PERCENT = 40;

/** AVE+ / AVE− at matchpoints, as a fraction of the board top. */
export const AVE_PLUS_FRACTION = AVE_PLUS_PERCENT / 100;
export const AVE_MINUS_FRACTION = AVE_MINUS_PERCENT / 100;

/** AVE+ / AVE− at IMPs and Cross-IMPs: ± this many IMPs (AVE is 0). */
export const ARTIFICIAL_IMP_AWARD = 3;
