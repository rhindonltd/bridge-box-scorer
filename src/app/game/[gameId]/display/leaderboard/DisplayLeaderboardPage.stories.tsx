import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, waitFor, within } from "storybook/test";

import { DisplayLeaderboardView } from "@/app/game/[gameId]/display/leaderboard/DisplayLeaderboardView";
import type { OverallScoreAndParticipant } from "@/model/leaderboard";
import type { SectionLeaderboard } from "@/context/LeaderboardContext";

// A small realistic MP pairs leaderboard used to populate the display without
// any socket wiring (the presentational view takes its data as props).
function pairMp(
  first: string,
  last: string,
  rank: number,
  totalMP: number,
): OverallScoreAndParticipant {
  return {
    type: "PAIR_MP",
    participants: [
      {
        type: "PAIR",
        id: String(rank),
        initialSeat: "A1NS",
        player1: {
          id: rank * 2 - 1,
          firstName: first,
          lastName: last,
          nationalId: null,
        },
        player2: {
          id: rank * 2,
          firstName: "Partner",
          lastName: last,
          nationalId: null,
        },
      },
    ],
    overallScore: {
      type: "PAIR_MP",
      mode: "PAIR",
      scoring: "MP",
      lines: [{ tied: false, rank, pairId: String(rank), totalMP, maxMP: 20 }],
    },
  };
}

const combined = pairMp("David", "Collier", 1, 18);

const sectionA: SectionLeaderboard = {
  section: "A",
  ...pairMp("Ada", "Lovelace", 1, 16),
};
const sectionB: SectionLeaderboard = {
  section: "B",
  ...pairMp("Alan", "Turing", 1, 15),
};

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
  "Liskov",
  "Hamilton",
  "Goldberg",
  "Perlman",
  "Lamport",
  "Rivest",
  "Shamir",
  "Adleman",
];

/**
 * A long standings list of `count` pairs, used to show the two-column wrap on a
 * wide screen and the auto-scroll when it still overflows. 40 pairs is enough
 * to overflow even a tall screen after the two-column split.
 */
function manyPlaces(count = 40): OverallScoreAndParticipant {
  const surname = (i: number) => `${SURNAMES[i % SURNAMES.length]}-${i + 1}`;
  return {
    type: "PAIR_MP",
    participants: Array.from({ length: count }, (_, i) => ({
      type: "PAIR",
      id: String(i + 1),
      initialSeat: "A1NS",
      player1: {
        id: i * 2 + 1,
        firstName: "Player",
        lastName: surname(i),
        nationalId: null,
      },
      player2: {
        id: i * 2 + 2,
        firstName: "Partner",
        lastName: surname(i),
        nationalId: null,
      },
    })),
    overallScore: {
      type: "PAIR_MP",
      mode: "PAIR",
      scoring: "MP",
      lines: Array.from({ length: count }, (_, i) => ({
        tied: false,
        rank: i + 1,
        pairId: String(i + 1),
        totalMP: 200 - i * 3,
        maxMP: 200,
      })),
    },
  };
}

// The display fills the whole screen (fixed inset-0), so render it at a large
// TV-like size with no padded frame.
const meta: Meta<typeof DisplayLeaderboardView> = {
  title: "App/Display/Game/Leaderboard/DisplayLeaderboardPage",
  component: DisplayLeaderboardView,
  parameters: {
    layout: "fullscreen",
    viewport: { defaultViewport: "responsive" },
  },
  args: {
    eventName: "Monday AM Pairs",
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof DisplayLeaderboardView>;

/** Single-section game: just the standings, no section tabs. */
export const Default: Story = {
  args: {
    leaderboard: combined,
    sections: [{ section: "A", ...combined }],
    isLoading: false,
  },
};

/** Multi-section event: a Combined tab plus a tab per section. */
export const MultiSection: Story = {
  args: {
    leaderboard: combined,
    sections: [sectionA, sectionB],
    isLoading: false,
  },
};

/** No results yet: the empty state shown before any board is played. */
export const Empty: Story = {
  args: {
    leaderboard: null,
    sections: [],
    isLoading: false,
  },
};

/** Waiting for the first snapshot. */
export const Loading: Story = {
  args: {
    leaderboard: null,
    sections: [],
    isLoading: true,
  },
};

/**
 * Many places on a wide screen: the standings wrap into two columns so more
 * pairs are visible at once. View at a large (TV) width to see the two columns;
 * if it still overflows, it slowly auto-scrolls.
 */
export const ManyPlaces: Story = {
  args: {
    leaderboard: manyPlaces(),
    sections: [{ section: "A", ...manyPlaces() }],
    isLoading: false,
  },
  play: async ({ canvasElement }) => {
    // With 40 pairs the standings overflow the scroll region, which is what the
    // auto-scroll then eases up and down. (The scroll animation itself is
    // driven by requestAnimationFrame, which the headless test browser
    // throttles when unfocused, so we assert the overflow — the precondition
    // for scrolling — rather than the moving scrollTop.)
    await waitFor(() => {
      const el = canvasElement.querySelector<HTMLElement>(
        '[aria-label$="standings"]',
      );
      expect(el && el.scrollHeight > el.clientHeight).toBe(true);
    });
  },
};

/**
 * Multi-section event that rotates. With a short rotation interval you can
 * watch it cycle Combined → Section A → Section B automatically; tapping a tab
 * jumps straight there and restarts the dwell.
 */
export const RotatingSections: Story = {
  args: {
    leaderboard: combined,
    sections: [sectionA, sectionB],
    isLoading: false,
    dwellMs: 3000,
  },
};

/**
 * The full room-display effect: a big multi-section event. Each view (the
 * combined ranking and each section) has enough places to fill a wide screen in
 * two columns and still overflow, so you can watch it rotate between views AND
 * auto-scroll each one. A short rotation interval keeps the demo lively; tap a
 * section tab to jump and restart the dwell.
 */
export const ManyPlacesMultiSection: Story = {
  args: {
    leaderboard: manyPlaces(48),
    sections: [
      { section: "A", ...manyPlaces(30) },
      { section: "B", ...manyPlaces(30) },
    ],
    isLoading: false,
    // Minimum dwell; each view keeps scrolling at a steady pace and only
    // rotates on once it has eased back to the top.
    dwellMs: 10000,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // The combined view overflows the scroll region (the precondition for the
    // auto-scroll). The scroll motion and section rotation are gated on
    // requestAnimationFrame — throttled in the unfocused headless test browser
    // and slow by design — so they are covered by the unit tests rather than
    // asserted here.
    await waitFor(() => {
      const el = canvasElement.querySelector<HTMLElement>(
        '[aria-label$="standings"]',
      );
      expect(el && el.scrollHeight > el.clientHeight).toBe(true);
    });

    // It starts on the combined view.
    expect(
      canvas.getByRole("heading", { name: /^Monday AM Pairs$/ }),
    ).toBeInTheDocument();
  },
};
