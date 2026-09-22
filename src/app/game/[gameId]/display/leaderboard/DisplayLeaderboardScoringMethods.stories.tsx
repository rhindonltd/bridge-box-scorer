import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { DisplayLeaderboardView } from "@/app/game/[gameId]/display/leaderboard/DisplayLeaderboardView";
import type { AssignedPair, AssignedTeam } from "@/model/participants";
import type { Player } from "@/db/games/tables/players";
import type { OverallScoreAndParticipant } from "@/model/leaderboard";

/*
 * These stories show the room-display leaderboard for the scoring methods
 * OTHER than MP percentage/matchpoints (which lives in
 * DisplayLeaderboardPage.stories.tsx). Each builds a small, realistic
 * `OverallScoreAndParticipant` for one method so the column layout and headings
 * can be eyeballed without any socket wiring — the presentational view takes
 * its data as props.
 */

// ---- shared participant builders -------------------------------------------

const SURNAMES = [
  "Collier",
  "Lovelace",
  "Turing",
  "Hopper",
  "Knuth",
  "Dijkstra",
  "Ritchie",
  "Thompson",
  "Berners-Lee",
  "Torvalds",
];

function player(id: number, first: string, last: string): Player {
  return { id, firstName: first, lastName: last, nationalId: null };
}

/** An assigned pair whose `id` matches the leaderboard line's `pairId`. */
function pair(idNum: number): AssignedPair {
  const last = SURNAMES[(idNum - 1) % SURNAMES.length];
  return {
    type: "PAIR",
    id: String(idNum),
    initialSeat: "A1NS",
    player1: player(idNum * 2 - 1, "Player", last),
    player2: player(idNum * 2, "Partner", last),
  };
}

/** An assigned team whose `id` matches the leaderboard line's `teamId`. */
function team(id: string, name: string, seed: number): AssignedTeam {
  const a = SURNAMES[(seed * 2) % SURNAMES.length];
  const b = SURNAMES[(seed * 2 + 1) % SURNAMES.length];
  return {
    type: "TEAM",
    id,
    name,
    pair1: {
      type: "PAIR",
      initialSeat: "A1NS",
      player1: player(seed * 4 + 1, "Player", a),
      player2: player(seed * 4 + 2, "Partner", a),
    },
    pair2: {
      type: "PAIR",
      initialSeat: "A1EW",
      player1: player(seed * 4 + 3, "Player", b),
      player2: player(seed * 4 + 4, "Partner", b),
    },
  };
}

// ---- per-method leaderboard builders ---------------------------------------

/** Cross-IMPs pairs: a single "X-IMP" column, shown to 2 decimal places. */
function pairXimp(): OverallScoreAndParticipant {
  // Cross-IMP totals are sums of per-board Butler averages, so they are
  // fractional and typically smaller than raw IMP totals.
  const scores = [12.83, 7.42, 3.17, 0.5, -4.25, -11.67];
  return {
    type: "PAIR_XIMP",
    participants: scores.map((_, i) => pair(i + 1)),
    overallScore: {
      type: "PAIR_XIMP",
      mode: "PAIR",
      scoring: "XIMP",
      lines: scores.map((crossImps, i) => ({
        rank: i + 1,
        tied: false,
        pairId: String(i + 1),
        crossImps,
      })),
    },
  };
}

/** Swiss Pairs Victory Points: Total plus a column per round. */
function pairSwissVp(): OverallScoreAndParticipant {
  const rows = [
    { total: 34.5, byRound: { 1: 12, 2: 12.5, 3: 10 } },
    { total: 25.5, byRound: { 1: 8, 2: 7.5, 3: 10 } },
    // A pair with a bye in round 2 simply omits that round -> blank cell.
    { total: 18, byRound: { 1: 8, 3: 10 } as Record<number, number> },
    { total: 12, byRound: { 1: 4, 2: 5, 3: 3 } },
  ];
  return {
    type: "PAIR_SWISS_VP",
    participants: rows.map((_, i) => pair(i + 1)),
    overallScore: {
      type: "PAIR_SWISS_VP",
      mode: "PAIR",
      scoring: "SWISS_VP",
      lines: rows.map((r, i) => ({
        rank: i + 1,
        tied: false,
        pairId: String(i + 1),
        totalVP: r.total,
        vpByRound: r.byRound,
      })),
    },
  };
}

/** Swiss Teams Victory Points: Total plus a column per round. */
function teamSwissVp(): OverallScoreAndParticipant {
  const rows = [
    { id: "T1", name: "Aces", total: 45.2, byRound: { 1: 15, 2: 18, 3: 12.2 } },
    { id: "T2", name: "Kings", total: 30.8, byRound: { 1: 5, 2: 12, 3: 13.8 } },
    { id: "T3", name: "Queens", total: 28, byRound: { 1: 10, 2: 8, 3: 10 } },
  ];
  return {
    type: "TEAM_SWISS_VP",
    participants: rows.map((r, i) => team(r.id, r.name, i)),
    overallScore: {
      type: "TEAM_SWISS_VP",
      mode: "TEAM",
      scoring: "SWISS_VP",
      lines: rows.map((r, i) => ({
        rank: i + 1,
        tied: false,
        teamId: r.id,
        totalVP: r.total,
        vpByRound: r.byRound,
      })),
    },
  };
}

/** Board-a-Match teams (barometer / Swiss Teams): per-round board fractions. */
function teamBam(): OverallScoreAndParticipant {
  const rows = [
    {
      id: "T1",
      name: "Aces",
      totalWon: 4.5,
      totalPlayed: 6,
      byRound: { 1: { won: 1.5, played: 3 }, 2: { won: 3, played: 3 } },
    },
    {
      id: "T2",
      name: "Kings",
      totalWon: 3,
      totalPlayed: 6,
      byRound: { 1: { won: 2, played: 3 }, 2: { won: 1, played: 3 } },
    },
    {
      id: "T3",
      name: "Queens",
      totalWon: 1.5,
      totalPlayed: 6,
      byRound: { 1: { won: 1, played: 3 }, 2: { won: 0.5, played: 3 } },
    },
  ];
  return {
    type: "TEAM_BAM",
    participants: rows.map((r, i) => team(r.id, r.name, i)),
    overallScore: {
      type: "TEAM_BAM",
      mode: "TEAM",
      scoring: "BAM",
      barometer: true,
      lines: rows.map((r, i) => ({
        rank: i + 1,
        tied: false,
        teamId: r.id,
        totalWon: r.totalWon,
        totalPlayed: r.totalPlayed,
        byRound: r.byRound,
      })),
    },
  };
}

/** Point-a-Board teams (Round Robin / non-barometer): cumulative total only. */
function teamPab(): OverallScoreAndParticipant {
  const rows = [
    { id: "T1", name: "Aces", totalWon: 5, totalPlayed: 8 },
    { id: "T2", name: "Kings", totalWon: 4, totalPlayed: 8 },
    { id: "T3", name: "Queens", totalWon: 3, totalPlayed: 8 },
  ];
  return {
    type: "TEAM_PAB",
    participants: rows.map((r, i) => team(r.id, r.name, i)),
    overallScore: {
      type: "TEAM_PAB",
      mode: "TEAM",
      scoring: "PAB",
      barometer: false,
      lines: rows.map((r, i) => ({
        rank: i + 1,
        tied: false,
        teamId: r.id,
        totalWon: r.totalWon,
        totalPlayed: r.totalPlayed,
        byRound: {},
      })),
    },
  };
}

// The display fills the whole screen (fixed inset-0), so render at a large,
// TV-like size with no padded frame.
const meta: Meta<typeof DisplayLeaderboardView> = {
  title: "App/Display/Game/Leaderboard/ScoringMethods",
  component: DisplayLeaderboardView,
  parameters: {
    layout: "fullscreen",
    viewport: { defaultViewport: "responsive" },
  },
  args: {
    isLoading: false,
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof DisplayLeaderboardView>;

/** Cross-IMP pairs standings (single X-IMP column). */
export const CrossImpPairs: Story = {
  args: {
    eventName: "Cross-IMP Pairs",
    leaderboard: pairXimp(),
    sections: [{ section: "A", ...pairXimp() }],
  },
};

/** Swiss Pairs Victory Points: a total plus one column per round. */
export const SwissPairsVictoryPoints: Story = {
  args: {
    eventName: "Swiss Pairs",
    leaderboard: pairSwissVp(),
    sections: [{ section: "A", ...pairSwissVp() }],
  },
};

/** Swiss Teams Victory Points: a total plus one column per round. */
export const SwissTeamsVictoryPoints: Story = {
  args: {
    eventName: "Swiss Teams",
    leaderboard: teamSwissVp(),
    sections: [{ section: "A", ...teamSwissVp() }],
  },
};

/** Board-a-Match teams (Swiss Teams): per-round board fractions (e.g. "1.5/3"). */
export const BoardAMatchTeams: Story = {
  args: {
    eventName: "Board-a-Match Teams",
    leaderboard: teamBam(),
    sections: [{ section: "A", ...teamBam() }],
  },
};

/** Point-a-Board teams (Round Robin): cumulative points won (e.g. "5/8" ×2 scale). */
export const PointABoardTeams: Story = {
  args: {
    eventName: "Point-a-Board Teams",
    leaderboard: teamPab(),
    sections: [{ section: "A", ...teamPab() }],
  },
};

// ---- two-winner (Mitchell) NS/EW split -------------------------------------

/** An assigned MP pair for a given section-qualified seat (e.g. "A2EW"). */
function seatPair(seat: string, seed: number): AssignedPair {
  const last = SURNAMES[seed % SURNAMES.length];
  return {
    type: "PAIR",
    id: seat,
    initialSeat: seat as AssignedPair["initialSeat"],
    player1: player(seed * 2 + 1, "Player", last),
    player2: player(seed * 2 + 2, "Partner", last),
  };
}

/**
 * One direction's MP ranking of `count` pairs, percentages descending from a
 * top just under the given start. Enough pairs (e.g. 18) makes each column
 * overflow so the auto-scroll is visible.
 */
function directionRanking(
  direction: "NS" | "EW",
  count: number,
  startPct: number,
): OverallScoreAndParticipant {
  const seats = Array.from({ length: count }, (_, i) => `A${i + 1}${direction}`);
  return {
    type: "PAIR_MP",
    participants: seats.map((seat, i) => seatPair(seat, i)),
    overallScore: {
      type: "PAIR_MP",
      mode: "PAIR",
      scoring: "MP",
      lines: seats.map((seat, i) => {
        // Descending percentages with a little variety; clamped so they stay
        // sensible even for a long field.
        const pct = Math.max(20, startPct - i * 2.3);
        return {
          rank: i + 1,
          tied: false,
          pairId: seat,
          // Percentages are shown directly; totalMP/maxMP back them out so the
          // percentage view renders pct%.
          totalMP: Math.round(pct * 100) / 100,
          maxMP: 100,
        };
      }),
    },
  };
}

/**
 * A two-winner Mitchell leaderboard: North/South and East/West are separate
 * fields, each with its own ranking, carried as `directional`. `count` pairs
 * per direction.
 */
function twoWinnerMitchell(count = 18): OverallScoreAndParticipant & {
  directional: { ns: OverallScoreAndParticipant; ew: OverallScoreAndParticipant };
} {
  const ns = directionRanking("NS", count, 64.2);
  const ew = directionRanking("EW", count, 61.8);
  // The pooled ranking is unused by the two-winner display, but the type still
  // requires one; reuse the NS ranking as a harmless placeholder.
  return { ...ns, directional: { ns, ew } };
}

/**
 * Two-winner Mitchell pairs: the standings show two independent rankings,
 * North/South and East/West, side by side. Shown as percentages. With a full
 * field each column overflows, so the standings slowly auto-scroll.
 */
export const TwoWinnerMitchell: Story = {
  args: {
    eventName: "Monday Mitchell Pairs",
    leaderboard: twoWinnerMitchell(),
    sections: [{ section: "A", ...twoWinnerMitchell() }],
    scoringMode: "percentage",
  },
};
