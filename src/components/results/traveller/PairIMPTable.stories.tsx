import type { Meta, StoryObj } from "@storybook/react-vite";
import { PairIMPTable } from "@/components/results/traveller/PairIMPTable";
import { scoreCrossIMP } from "@/model/score-traveller";
import {
  board1,
  board10,
  board11,
  board12,
  board13,
  board14,
  board2,
  board3,
  board4,
  board5,
  board6,
  board7,
  board8,
  board9,
} from "@/mocks/fixtures/ximp-travellers";

const meta: Meta<typeof PairIMPTable> = {
  title: "Components/Results/Traveller/PairIMPTable",
  component: PairIMPTable,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof PairIMPTable>;

export const Board1: Story = {
  args: {
    scoredTraveller: scoreCrossIMP(board1),
  },
};

export const Board2: Story = {
  args: {
    scoredTraveller: scoreCrossIMP(board2),
  },
};

export const Board3: Story = {
  args: {
    scoredTraveller: scoreCrossIMP(board3),
  },
};

export const Board4: Story = {
  args: {
    scoredTraveller: scoreCrossIMP(board4),
  },
};

export const Board5: Story = {
  args: {
    scoredTraveller: scoreCrossIMP(board5),
  },
};

export const Board6: Story = {
  args: {
    scoredTraveller: scoreCrossIMP(board6),
  },
};

export const Board7: Story = {
  args: {
    scoredTraveller: scoreCrossIMP(board7),
  },
};

export const Board8: Story = {
  args: {
    scoredTraveller: scoreCrossIMP(board8),
  },
};

export const Board9: Story = {
  args: {
    scoredTraveller: scoreCrossIMP(board9),
  },
};

export const Board10: Story = {
  args: {
    scoredTraveller: scoreCrossIMP(board10),
  },
};

export const Board11: Story = {
  args: {
    scoredTraveller: scoreCrossIMP(board11),
  },
};

export const Board12: Story = {
  args: {
    scoredTraveller: scoreCrossIMP(board12),
  },
};

export const Board13: Story = {
  args: {
    scoredTraveller: scoreCrossIMP(board13),
  },
};

export const Board14: Story = {
  args: {
    scoredTraveller: scoreCrossIMP(board14),
  },
};
