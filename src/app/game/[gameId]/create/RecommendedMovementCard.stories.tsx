import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { RecommendedMovementCard } from "@/app/game/[gameId]/create/RecommendedMovementCard";
import { RecommendedMovement } from "@/movement/recommendations/recommendation-types";

const generatedMitchell: RecommendedMovement = {
  family: "MITCHELL",
  name: "Standard Mitchell",
  rounds: 9,
  boardsPerRound: 3,
  boardsPerPair: 27,
  copies: 1,
  pros: ["Best and easiest for nine tables", "Can shorten to 8 or 7 rounds"],
  cons: ["Two-winner game", "Each pair misses four opposing pairs"],
  source: "generated",
  specRef: {
    source: "generated",
    spec: { tables: 9, rounds: 9, boardsPerRound: 3 },
  },
};

const dbHowell: RecommendedMovement = {
  family: "HOWELL",
  name: "3 Table Howell",
  rounds: 5,
  boardsPerRound: 5,
  boardsPerPair: 25,
  copies: 1,
  pros: ["Every pair plays every other pair", "Full 25 or shorter 20 boards"],
  cons: ["One stationary pair only", "All three tables share the final set"],
  note: "Shuffle and copy the last-round boards in advance if you can.",
  source: "db",
  specRef: { source: "db", id: 7, type: "2" },
};

const meta: Meta<typeof RecommendedMovementCard> = {
  title: "App/Game/Create/RecommendedMovementCard",
  component: RecommendedMovementCard,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  args: {
    onSelect: fn(),
  },
  decorators: [
    (Story) => (
      <div className="w-[28rem] max-w-full p-4">
        <Story />
      </div>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof RecommendedMovementCard>;

export const GeneratedMitchell: Story = {
  args: { movement: generatedMitchell },
};

export const WebMitchellTwoCopies: Story = {
  args: {
    movement: {
      family: "WEB",
      name: "Web Mitchell",
      rounds: 8,
      boardsPerRound: 3,
      boardsPerPair: 24,
      copies: 2,
      pros: ["All pairs play the same 24 boards, none missed"],
      cons: ["Needs two pre-made board sets", "Careful round-one setup"],
      source: "generated",
      specRef: {
        source: "generated",
        spec: { tables: 14, rounds: 8, boardsPerRound: 3, web: true },
      },
    },
  },
};

export const DbHowellWithNote: Story = {
  args: { movement: dbHowell },
};

export const ShortProsCons: Story = {
  args: {
    movement: {
      ...generatedMitchell,
      name: "Standard Mitchell (short)",
      pros: ["Simple and familiar"],
      cons: ["Two-winner game"],
    },
  },
};

export const LongProsCons: Story = {
  args: {
    movement: {
      ...dbHowell,
      name: "13 Round Howell",
      rounds: 13,
      boardsPerRound: 2,
      boardsPerPair: 26,
      pros: [
        "Fairest: every pair plays every other",
        "26 boards in 13 rounds",
        "One-winner game",
      ],
      cons: [
        "Only one stationary pair",
        "Slow: 13 rounds of seat changes",
        "Guide cards needed for every pair",
      ],
      note: undefined,
    },
  },
};
