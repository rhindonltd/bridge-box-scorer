import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { InlineOpeningLead } from "./InlineOpeningLead";

const meta: Meta<typeof InlineOpeningLead> = {
  title: "Play/InlineOpeningLead",
  component: InlineOpeningLead,
  parameters: { layout: "centered" },
  args: { suit: "S", rank: "A", onSuitChange: fn(), onRankChange: fn() },
};
export default meta;
type Story = StoryObj<typeof InlineOpeningLead>;

export const Default: Story = {};
export const HeartSelected: Story = { args: { suit: "H", rank: "K" } };
export const Disabled: Story = {
  decorators: [
    (Story) => (
      <div className="opacity-50 pointer-events-none">
        <Story />
      </div>
    ),
  ],
};
