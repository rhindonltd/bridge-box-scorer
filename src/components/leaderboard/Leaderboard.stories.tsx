import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { Leaderboard } from "./Leaderboard";

const meta: Meta<typeof Leaderboard> = {
  title: "Components/Leaderboard/Leaderboard",
  component: Leaderboard,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Leaderboard>;

/**
 * A minimal assigned-pair participant for the leaderboard stories. `seat` is a
 * section-qualified seat id (e.g. "A1NS") used as both the participant id and
 * its initial seat — the Swiss VP table keys name lookups on the id.
 */
function pairParticipant(
  seat: `${string}${number}NS` | `${string}${number}EW`,
  p1First: string,
  p1Last: string,
  p2First: string,
  p2Last: string,
) {
  return {
    type: "PAIR" as const,
    id: seat,
    initialSeat: seat,
    player1: { id: 1, firstName: p1First, lastName: p1Last, nationalId: null },
    player2: { id: 2, firstName: p2First, lastName: p2Last, nationalId: null },
  };
}

export const PairIMP: Story = {
  args: {
    overallScoreAndParticipant: {
      type: "PAIR_XIMP",
      participants: [
        {
          type: "PAIR",
          id: "1",
          initialSeat: "A1NS",
          player1: {
            id: 1,
            firstName: "David",
            lastName: "Collier",
            nationalId: "404476",
          },
          player2: {
            id: 2,
            firstName: "Jacqui",
            lastName: "Collier",
            nationalId: "477484",
          },
        },
      ],
      overallScore: {
        type: "PAIR_XIMP",
        mode: "PAIR",
        scoring: "XIMP",
        lines: [
          {
            tied: false,
            rank: 1,
            pairId: "1",
            crossImps: 10,
          },
        ],
      },
    },
  },
};

export const PairMP: Story = {
  args: {
    overallScoreAndParticipant: {
      type: "PAIR_MP",
      participants: [
        {
          type: "PAIR",
          id: "1",
          initialSeat: "A1NS",
          player1: {
            id: 1,
            firstName: "David",
            lastName: "Collier",
            nationalId: "404476",
          },
          player2: {
            id: 2,
            firstName: "Jacqui",
            lastName: "Collier",
            nationalId: "477484",
          },
        },
      ],
      overallScore: {
        type: "PAIR_MP",
        mode: "PAIR",
        scoring: "MP",
        lines: [
          {
            tied: false,
            rank: 1,
            pairId: "1",
            totalMP: 10,
            maxMP: 20,
          },
        ],
      },
    },
  },
};

/**
 * A Swiss Pairs VP leaderboard after a round that used "2 half matches" for an
 * odd field. The leaderboard view is round-agnostic — it just shows each pair's
 * VP per round and total — so a half-match round needs no special rendering;
 * the scorer already credits the anchor its full /20 and each non-anchor its
 * played half + averaged half. This story documents that result: in round 1 the
 * anchor (A3) nears 20, while the two non-anchors (A4, A5) sit lower from a
 * played + compensated half; everyone plays a normal round 2.
 */
export const SwissPairsHalfMatchRound: Story = {
  args: {
    overallScoreAndParticipant: {
      type: "PAIR_SWISS_VP",
      participants: [
        pairParticipant("A1NS", "Al", "North", "Bo", "South"),
        pairParticipant("A2NS", "Cy", "East", "Di", "West"),
        pairParticipant("A3NS", "Ed", "North", "Fay", "South"),
        pairParticipant("A1EW", "Gus", "East", "Hal", "West"),
        pairParticipant("A2EW", "Ivy", "North", "Jo", "South"),
      ],
      overallScore: {
        type: "PAIR_SWISS_VP",
        mode: "PAIR",
        scoring: "SWISS_VP",
        lines: [
          // Anchor (A3NS): full /20 in the half-match round 1, strong round 2.
          { tied: false, rank: 1, pairId: "A3NS", totalVP: 33.5, vpByRound: { 1: 18.5, 2: 15 } },
          { tied: false, rank: 2, pairId: "A1NS", totalVP: 24, vpByRound: { 1: 12, 2: 12 } },
          // Non-anchor (A1EW): a played half + compensated half in round 1.
          { tied: false, rank: 3, pairId: "A1EW", totalVP: 16.65, vpByRound: { 1: 6.65, 2: 10 } },
          { tied: false, rank: 4, pairId: "A2NS", totalVP: 15, vpByRound: { 1: 8, 2: 7 } },
          // Non-anchor (A2EW): the other played + compensated half.
          { tied: false, rank: 5, pairId: "A2EW", totalVP: 13.4, vpByRound: { 1: 6.4, 2: 7 } },
        ],
      },
    },
  },
};

export const Team: Story = {
  args: {
    overallScoreAndParticipant: {
      type: "TEAM_SWISS_VP",
      participants: [
        {
          type: "TEAM",
          id: "1",
          name: "Collier",
          pair1: {
            type: "PAIR",
            initialSeat: "A1NS",
            player1: {
              id: 1,
              firstName: "David",
              lastName: "Collier",
              nationalId: "404476",
            },
            player2: {
              id: 2,
              firstName: "Jacqui",
              lastName: "Collier",
              nationalId: "477484",
            },
          },
          pair2: {
            type: "PAIR",
            initialSeat: "A1EW",
            player1: {
              id: 1,
              firstName: "Peter",
              lastName: "Collier",
              nationalId: "123456",
            },
            player2: {
              id: 2,
              firstName: "Nye",
              lastName: "Collier",
              nationalId: "654321",
            },
          },
        },
      ],
      overallScore: {
        type: "TEAM_SWISS_VP",
        mode: "TEAM",
        scoring: "SWISS_VP",
        lines: [
          {
            tied: false,
            rank: 1,
            teamId: "1",
            totalVP: 100,
            vpByRound: { 1: 100 },
          },
        ],
      },
    },
  },
};

/**
 * The participant matching `highlightAssignmentId` has their leaderboard row
 * highlighted. Here pair "1" (Collier) is emphasised while pair "2" (Button)
 * keeps the default styling.
 */
export const PairMPHighlighted: Story = {
  args: {
    highlightAssignmentId: "1",
    overallScoreAndParticipant: {
      type: "PAIR_MP",
      participants: [
        {
          type: "PAIR",
          id: "1",
          initialSeat: "A1NS",
          player1: {
            id: 1,
            firstName: "David",
            lastName: "Collier",
            nationalId: "404476",
          },
          player2: {
            id: 2,
            firstName: "Jacqui",
            lastName: "Collier",
            nationalId: "477484",
          },
        },
        {
          type: "PAIR",
          id: "2",
          initialSeat: "A1EW",
          player1: {
            id: 3,
            firstName: "Roy",
            lastName: "Button",
            nationalId: "111111",
          },
          player2: {
            id: 4,
            firstName: "Nadia",
            lastName: "Button",
            nationalId: "222222",
          },
        },
      ],
      overallScore: {
        type: "PAIR_MP",
        mode: "PAIR",
        scoring: "MP",
        lines: [
          { tied: false, rank: 1, pairId: "1", totalMP: 15, maxMP: 20 },
          { tied: false, rank: 2, pairId: "2", totalMP: 5, maxMP: 20 },
        ],
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByRole("table");

    // Exactly one row is highlighted.
    const highlightedRows =
      canvasElement.querySelectorAll<HTMLTableRowElement>("tr.bg-blue-100");
    expect(highlightedRows).toHaveLength(1);

    // The highlighted row belongs to pair "1" (the Colliers).
    const highlightedRow = highlightedRows[0];
    expect(highlightedRow).toHaveTextContent("Jacqui");
    expect(highlightedRow).not.toHaveTextContent("Roy");

    // The other pair's row (the Buttons) is present and not highlighted.
    const bodyRows = Array.from(
      canvasElement.querySelectorAll<HTMLTableRowElement>("tbody tr"),
    );
    const buttonRow = bodyRows.find((row) =>
      row.textContent?.includes("Button"),
    );
    expect(buttonRow).toBeDefined();
    expect(buttonRow).not.toHaveClass("bg-blue-100");

    // Zebra striping is turned off while a row is highlighted.
    const striped = canvasElement.querySelectorAll(
      "tbody tr.even\\:bg-gray-200",
    );
    expect(striped).toHaveLength(0);
  },
};
