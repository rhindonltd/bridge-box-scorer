import type { Meta, StoryObj } from "@storybook/react-vite";
import { PlayedContract } from "@/components/results/traveller/PlayedContract";

const meta: Meta<typeof PlayedContract> = {
  title: "Components/Results/Traveller/PlayedContract",
  component: PlayedContract,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof PlayedContract>;

export const BlackSuitContract: Story = {
  args: {
    playedContractCode: "4SN+1",
  },
};

export const RedSuitContract: Story = {
  args: {
    playedContractCode: "4HN+1",
  },
};

export const NoTrumpsContract: Story = {
  args: {
    playedContractCode: "3NTN+1",
  },
};
