/**
 * The phantom participant id written on the empty side of a sit-out / bye /
 * half-match compensation board row.
 *
 * It is deliberately NOT a valid seat id, so the board-history reader, match
 * reconstruction and scorers all ignore it — only the real sitting-out pair /
 * bye team is ever recorded. Shared by the Swiss Pairs sit-out, the Swiss Teams
 * bye, and the "2 half matches" HALF_AVERAGE compensation blocks so the three
 * never drift apart.
 */
export const PHANTOM_SEAT = "PHANTOM";
