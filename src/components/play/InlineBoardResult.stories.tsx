import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { InlineBoardResult } from "./InlineBoardResult";

const meta: Meta<typeof InlineBoardResult> = {
  title: "Play/InlineBoardResult",
  component: InlineBoardResult,
  parameters: { layout: "centered" },
  args: {
    contract: "4H",
    mode: "made",
    value: 0,
    onModeChange: fn(),
    onValueChange: fn(),
  },
};
export default meta;
type Story = StoryObj<typeof InlineBoardResult>;

export const MadeMode: Story = {};
export const DownMode: Story = { args: { mode: "down", value: 1 } };
export const HighLevel: Story = { args: { contract: "7NT", mode: "made", value: 0 } };
export const LowLevel: Story = { args: { contract: "1C", mode: "made", value: 0 } };
export const Disabled: Story = {
  decorators: [
    (Story) => (
      <div className="opacity-50 pointer-events-none">
        <Story />
      </div>
    ),
  ],
};
