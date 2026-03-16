import type { Meta, StoryObj } from "@storybook/react-vite";

import { PairMPLeaderboard } from "./PairMPLeaderboard";

const meta: Meta<typeof PairMPLeaderboard> = {
  title: "Results/Overall/PairMPLeaderboard",
  component: PairMPLeaderboard,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof PairMPLeaderboard>;

export const Default: Story = {
  args: {
    results: [
      {
        pairId: "1",
        totalMP: 100,
        boardsPlayed: 24,
        percentage: 53.99,
        players: [
          {
            firstName: "Jacqui",
            lastName: "Collier",
          },
          {
            firstName: "David",
            lastName: "Collier",
          },
        ],
      },
      {
        pairId: "2",
        totalMP: 90,
        boardsPlayed: 24,
        percentage: 52.99,
        players: [
          {
            firstName: "Jacqui",
            lastName: "Collier",
          },
          {
            firstName: "David",
            lastName: "Collier",
          },
        ],
      },
      {
        pairId: "3",
        totalMP: 80,
        boardsPlayed: 24,
        percentage: 51.99,
        players: [
          {
            firstName: "Jacqui",
            lastName: "Collier",
          },
          {
            firstName: "David",
            lastName: "Collier",
          },
        ],
      },
      {
        pairId: "4",
        totalMP: 70,
        boardsPlayed: 24,
        percentage: 50.99,
        players: [
          {
            firstName: "Jacqui",
            lastName: "Collier",
          },
          {
            firstName: "David",
            lastName: "Collier",
          },
        ],
      },
      {
        pairId: "5",
        totalMP: 60,
        boardsPlayed: 24,
        percentage: 49.99,
        players: [
          {
            firstName: "Jacqui",
            lastName: "Collier",
          },
          {
            firstName: "David",
            lastName: "Collier",
          },
        ],
      },
    ],
  },
};
