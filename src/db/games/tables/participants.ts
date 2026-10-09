import { sqliteTable, integer, unique, text } from "drizzle-orm/sqlite-core";
import { players } from "@/db/games/tables/players";
import { PairSeat } from "@/model/participants";

export const participants = sqliteTable(
  "participant",
  {
    initialSeat: text("initial_seat").$type<PairSeat>().primaryKey(),
    player1: integer("player1")
      .references(() => players.id)
      .notNull(),
    player2: integer("player2")
      .references(() => players.id)
      .notNull(),
    secretKey: text("secret_key").notNull(),

    /**
     * The contestant's standing in the event (EBU White Book §2.4). Default
     * ACTIVE — an ordinary contestant whose results count normally and who is
     * ranked. See `docs/design/withdrawals-late-arrivals.md`.
     *   - ACTIVE           normal (default)
     *   - WITHDRAWN        stopped at a recorded point (§2.4.4/§2.4.5)
     *   - WITHOUT_STANDING plays but does not count for itself; opponents'
     *                      results stand; dropped from the ranking (§2.4.9)
     * For teams, the standing is carried on the home-NS participant row (the
     * team's stable anchor); a withdrawal is always whole-team.
     */
    standing: text("standing", {
      enum: ["ACTIVE", "WITHDRAWN", "WITHOUT_STANDING"],
    })
      .notNull()
      .default("ACTIVE"),

    /**
     * Coarse context: the round the contestant withdrew in (part-way through or
     * just finished). Null when ACTIVE. NOT how played/unplayed is decided —
     * that is read per-board from the board rows (board numbers are not
     * monotonic with play order). Used for the UI and the Swiss "not drawn into
     * later rounds" fact only.
     */
    withdrawnInRound: integer("withdrawn_in_round"),

    /**
     * §2.4.5 — the score given TO a withdrawing contestant, the director's
     * choice. Null unless `standing = WITHDRAWN`.
     *   - REMOVE     drop from the ranking entirely (a genuine illness)
     *   - PENALISED  AVE− plus a 0..40% fine on the boards after withdrawal
     */
    withdrawalTreatment: text("withdrawal_treatment", {
      enum: ["REMOVE", "PENALISED"],
    }),

    /**
     * §2.4.5 — the 0..40 fine percentage when `withdrawalTreatment = PENALISED`
     * (null otherwise). A per-board deduction taking the withdrawer's AVE− down
     * toward 0%.
     */
    withdrawalFinePercent: integer("withdrawal_fine_percent"),
  },
  (table) => ({
    uniquePair: unique().on(table.player1, table.player2),
  }),
);

export type Participant = typeof participants.$inferSelect;
