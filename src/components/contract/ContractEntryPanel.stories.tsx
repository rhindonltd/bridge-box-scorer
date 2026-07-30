import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import ContractEntryPanel from "./ContractEntryPanel";

const meta: Meta<typeof ContractEntryPanel> = {
  title: "Components/Contract/ContractEntryPanel",
  component: ContractEntryPanel,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    onOk: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof ContractEntryPanel>;

export const DirectorCorrection: Story = {
  args: {
    headerText: "Correcting Board 7",
    subHeaderText: "Table 2, Round 3",
  },
};

export const SimpleHeader: Story = {
  args: {
    headerText: "Enter Contract",
  },
};
