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

export const PairIMP: Story = {
  args: {
    overallScoreAndParticipant: {
      type: "PAIR_XIMP",
      participants: [
        {
          type: "PAIR",
          id: "1",
          initialSeat: "1NS",
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
          initialSeat: "1NS",
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

export const Team: Story = {
  args: {
    overallScoreAndParticipant: {
      type: "TEAM_OVERALL",
      participants: [
        {
          type: "TEAM",
          id: "1",
          pair1: {
            type: "PAIR",
            initialSeat: "1NS",
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
            initialSeat: "1EW",
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
        type: "TEAM_OVERALL",
        mode: "TEAM",
        scoring: "OVERALL",
        lines: [
          {
            tied: false,
            rank: 1,
            teamId: "1",
            score: 100,
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
          initialSeat: "1NS",
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
          initialSeat: "1EW",
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
