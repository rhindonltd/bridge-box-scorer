import type { Meta, StoryObj } from "@storybook/react-vite";
import { PairMPPercentageTable } from "@/components/results/traveller/PairMPPercentageTable";
import { scoreMatchpoints } from "@/model/score-traveller";
import {
  board1,
  board10,
  board11,
  board12,
  board13,
  board14,
  board15,
  board16,
  board17,
  board18,
  board19,
  board2,
  board20,
  board21,
  board3,
  board4,
  board5,
  board6,
  board7,
  board8,
  board9,
} from "@/mocks/fixtures/mp-travellers";

const meta: Meta<typeof PairMPPercentageTable> = {
  title: "Components/Results/Traveller/PairMPPercentageTable",
  component: PairMPPercentageTable,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof PairMPPercentageTable>;

export const Board1: Story = {
  args: {
    scoredTraveller: scoreMatchpoints(board1),
  },
};

export const Board2: Story = {
  args: {
    scoredTraveller: scoreMatchpoints(board2),
  },
};

export const Board3: Story = {
  args: {
    scoredTraveller: scoreMatchpoints(board3),
  },
};

export const Board4: Story = {
  args: {
    scoredTraveller: scoreMatchpoints(board4),
  },
};

export const Board5: Story = {
  args: {
    scoredTraveller: scoreMatchpoints(board5),
  },
};

export const Board6: Story = {
  args: {
    scoredTraveller: scoreMatchpoints(board6),
  },
};

export const Board7: Story = {
  args: {
    scoredTraveller: scoreMatchpoints(board7),
  },
};

export const Board8: Story = {
  args: {
    scoredTraveller: scoreMatchpoints(board8),
  },
};

export const Board9: Story = {
  args: {
    scoredTraveller: scoreMatchpoints(board9),
  },
};

export const Board10: Story = {
  args: {
    scoredTraveller: scoreMatchpoints(board10),
  },
};

export const Board11: Story = {
  args: {
    scoredTraveller: scoreMatchpoints(board11),
  },
};

export const Board12: Story = {
  args: {
    scoredTraveller: scoreMatchpoints(board12),
  },
};

export const Board13: Story = {
  args: {
    scoredTraveller: scoreMatchpoints(board13),
  },
};

export const Board14: Story = {
  args: {
    scoredTraveller: scoreMatchpoints(board14),
  },
};

export const Board15: Story = {
  args: {
    scoredTraveller: scoreMatchpoints(board15),
  },
};

export const Board16: Story = {
  args: {
    scoredTraveller: scoreMatchpoints(board16),
  },
};

export const Board17: Story = {
  args: {
    scoredTraveller: scoreMatchpoints(board17),
  },
};

export const Board18: Story = {
  args: {
    scoredTraveller: scoreMatchpoints(board18),
  },
};

export const Board19: Story = {
  args: {
    scoredTraveller: scoreMatchpoints(board19),
  },
};

export const Board20: Story = {
  args: {
    scoredTraveller: scoreMatchpoints(board20),
  },
};

export const Board21: Story = {
  args: {
    scoredTraveller: scoreMatchpoints(board21),
  },
};
