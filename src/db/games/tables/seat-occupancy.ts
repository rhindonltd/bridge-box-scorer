import {
  sqliteTable,
  integer,
  text,
  index,
  unique,
} from "drizzle-orm/sqlite-core";
import { players } from "@/db/games/tables/players";
import { PairSeat } from "@/model/participants";

/**
 * A SEAT OCCUPANCY — the first-class participant entity (EBU White Book
 * §2.3.3/§2.4.7; see `docs/design/seat-occupancy-handover.md`).
 *
 * A seat is just a movement slot (`A3NS`, the id stored on `boards.ns`/`ew`).
 * The real contestant record is an occupancy: a pair that occupied a seat over
 * a set of boards, with its own standing and device secret. This replaces the
 * old `participants` + `assignment` tables.
 *
 * In the common case a seat has EXACTLY ONE occupancy covering every board the
 * seat plays (`boards = null`). A mid-session stand-by → real-pair handover is
 * two occupancies on the same seat over DISJOINT board sets. "Who played board
 * N at seat S?" is then one uniform lookup for every game: the single occupancy
 * of seat S whose board set contains N (a `boards = null` row contains every
 * board). The disjoint-set invariant is enforced at the write path (there is no
 * DB-level constraint that can express it over a JSON set).
 */
export const seatOccupancy = sqliteTable(
  "seat_occupancy",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),

    /**
     * The PHYSICAL seat this occupancy sits at — section-qualified, e.g.
     * "A3NS". This is what the director seats by, what auth resolves, and the
     * stable ranked identity. (Subsumes the old `participant.initial_seat`.)
     */
    seat: text("seat").$type<PairSeat>().notNull(),

    /**
     * The MOVEMENT ANCHOR id — the value stored on `boards.ns`/`boards.ew` for
     * this seat's rows. Usually equal to {@link seat} (standard Mitchell, Round
     * Robin Teams, and all Swiss write a direction-qualified id like "A1NS"),
     * but for one-winner movements that number pairs rather than seats
     * (arrow-switch Mitchell, file-based/SPEC pairs & teams) the board id is a
     * bare, renumbered id (e.g. "A1" or "A6") that is NOT the physical seat. The
     * identity joins (player schedule, traveller names) match a board row to its
     * occupant on this column. (Subsumes the old `assignment.id`.)
     *
     * Null until the movement is materialised: a seat's occupancy is created
     * when the director seats it (pre-start), before the movement — and hence
     * the anchor id — is known. Materialisation stamps it from the round-1
     * layout. For games where the id equals the seat, callers can fall back to
     * `seat` when this is null.
     */
    anchorId: text("anchor_id"),

    /**
     * The set of board numbers this occupant played, as a JSON array of
     * integers. `null` means "every board this seat plays" — the whole-event
     * common case, where the seat has a single occupancy. Board numbers are not
     * monotonic with play order, so a stand-in's coverage may be
     * non-contiguous (e.g. 25,26,27,1,2,3); a set, not a range, captures that.
     */
    boards: text("boards", { mode: "json" }).$type<number[]>(),

    player1: integer("player1")
      .references(() => players.id)
      .notNull(),
    player2: integer("player2")
      .references(() => players.id)
      .notNull(),

    /** Device auth secret for THIS occupant of THIS seat. */
    secretKey: text("secret_key").notNull(),

    /**
     * The occupant's standing in the event (EBU White Book §2.4). Default
     * ACTIVE — an ordinary contestant whose results count normally and who is
     * ranked. See `docs/design/withdrawals-late-arrivals.md`.
     *   - ACTIVE           normal (default)
     *   - WITHDRAWN        stopped at a recorded point (§2.4.4/§2.4.5)
     *   - WITHOUT_STANDING plays but does not count for itself; opponents'
     *                      results stand; dropped from the ranking (§2.4.9)
     *   - LATE             arrived after the start (§2.4.7). Retains standing if
     *                      present for at least HALF the event's boards; else
     *                      its unplayed (early) boards score per §2.4.6, driven
     *                      by `withdrawalTreatment`/`withdrawalFinePercent`.
     * For teams, the standing is carried on the home-NS occupancy (the team's
     * stable anchor); a withdrawal/late-arrival is always whole-team.
     */
    standing: text("standing", {
      enum: ["ACTIVE", "WITHDRAWN", "WITHOUT_STANDING", "LATE"],
    })
      .notNull()
      .default("ACTIVE"),

    /**
     * Coarse context: the round the contestant withdrew in, or (for a `LATE`
     * arrival) the round it arrived. Null when ACTIVE. NOT how played/unplayed
     * is decided — that is read per-board from the board rows.
     */
    withdrawnInRound: integer("withdrawn_in_round"),

    /**
     * §2.4.5/§2.4.6 — the score given TO a contestant for its UNPLAYED boards.
     * Null unless `standing = WITHDRAWN`, or a short `LATE` arrival (§2.4.7).
     *   - REMOVE     drop from the ranking entirely
     *   - PENALISED  AVE− plus a 0..40% fine on the unplayed boards
     * These remain the ordinary §2.4.5/§2.4.6 WITHDRAWAL treatments; a §2.4.7
     * handover/substitution does NOT use them (it has no artificial score — see
     * `split` + the `standing` eligibility below). The column is plain TEXT (the
     * enum is a TS-level constraint only).
     */
    withdrawalTreatment: text("withdrawal_treatment", {
      enum: ["REMOVE", "PENALISED"],
    }),

    /** §2.4.5 — the 0..40 fine percentage when PENALISED (null otherwise). */
    withdrawalFinePercent: integer("withdrawal_fine_percent"),

    /**
     * The §2.4.7 handover ARRIVAL ANCHOR flag (1 = yes). On a handover seat the
     * arriving occupant — the one that took over the live device and plays the
     * seat forward from the handover point — is the anchor; the occupant that
     * played the EARLIER boards is not. 0 for an ordinary single occupancy.
     *
     * This is the DEVICE / forward-play identity, kept SEPARATE from `standing`:
     * auth (which secret the live seat uses) follows the anchor, while
     * eligibility (ranked or not) follows `standing`. Plain integer, 0 default.
     */
    isArrivalAnchor: integer("is_arrival_anchor").notNull().default(0),

    /**
     * §2.4.7 MERGED-LINE identity flag (1 = this occupant is the "main pair").
     * Only meaningful on a ONE-LINE (`split = 0`) handover seat: it names which
     * of the two occupants REPRESENTS the single merged line — its names + EBU
     * numbers are the one ranked line and the one USEBIO `<PAIR>`, while the
     * OTHER occupant rides along as the local "(Sub)" name. The director picks
     * this ("Main pair") on the Substitutions screen.
     *
     * This is the SCORING/EXPORT identity ONLY — kept SEPARATE from
     * {@link isArrivalAnchor} (the device identity): changing the main pair must
     * never move which device/secret authenticates the live seat. 0 on both
     * occupants means "not chosen" → the merged line defaults to the arrival
     * anchor (the arriving pair). 0 for an ordinary single occupancy.
     *
     * A split seat ignores this (each occupant is already its own line with its
     * own names/`<PAIR>`), so it is only ever set while `split = 0`.
     */
    isMainLine: integer("is_main_line").notNull().default(0),

    /**
     * §2.4.7 handover SPLIT flag (1 = yes). Per SEAT (both of a handover seat's
     * occupancies carry the same value), the director's "Split by board?"
     * choice on the Substitutions screen:
     *   - 0 (default): the seat is ONE continuous contestant — both occupants'
     *     boards score to a single ranked line (bare seat id). The two surfaces
     *     differ on purpose: the LOCAL leaderboard STITCHES both pairs' names
     *     for club transparency (e.g. "Smith/Jones & (Sub) Brown/Green"), while
     *     the USEBIO export emits one `<PAIR>` carrying ONLY the MAIN pair's two
     *     players + EBU numbers (a stitched name string would fail the EBU
     *     registry parser and reject the upload). Which occupant is the main
     *     pair is {@link isMainLine} (default: the arrival anchor).
     *   - 1: the two occupants are scored as SEPARATE contestants — each ranked
     *     on only the boards it played (its own line; the non-anchor gets a
     *     `#<occId>` id), two leaderboard rows, two USEBIO `<PAIR>` blocks.
     * Eligibility is independent and lives on `standing`: a WITHOUT_STANDING
     * occupant's results still count for its opponents but it is stripped from
     * the ranking / prize export (Category B/C). 0 for an ordinary occupancy.
     */
    split: integer("split").notNull().default(0),
  },
  (table) => ({
    // Lookups resolve by seat (then by board set in app code), so index it.
    seatIdx: index("seat_occupancy_seat_idx").on(table.seat),
    // The identity joins match a board row's ns/ew to its occupant on anchorId.
    anchorIdx: index("seat_occupancy_anchor_idx").on(table.anchorId),
    // One person occupies a single position: the same two players can't be
    // seated twice (the create path's dedupe guard, carried over from the old
    // `participant` table).
    uniquePair: unique().on(table.player1, table.player2),
  }),
);

export type SeatOccupancy = typeof seatOccupancy.$inferSelect;
export type NewSeatOccupancy = typeof seatOccupancy.$inferInsert;
