import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import NumberStepper, { Props } from "./NumberStepper";

const meta: Meta<typeof NumberStepper> = {
  title: "Components/Common/NumberStepper",
  component: NumberStepper,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof NumberStepper>;

// 🔁 Interactive wrapper so the component actually updates
const StatefulWrapper = (args: Props) => {
  const [value, setValue] = useState(args.value ?? 0);

  return <NumberStepper {...args} value={value} onChange={setValue} />;
};

// ✅ Default
export const Default: Story = {
  render: (args) => <StatefulWrapper {...args} />,
  args: {
    value: 0,
    showPlus: true,
  },
};

// ➕ Positive values with +
export const PositiveWithPlus: Story = {
  render: (args) => <StatefulWrapper {...args} />,
  args: {
    value: 3,
    showPlus: true,
  },
};

// 🔢 Positive values without +
export const PositiveNoPlus: Story = {
  render: (args) => <StatefulWrapper {...args} />,
  args: {
    value: 3,
    showPlus: false,
  },
};

// ➖ Negative values
export const Negative: Story = {
  render: (args) => <StatefulWrapper {...args} />,
  args: {
    value: -3,
    showPlus: true,
  },
};

// 🟰 Zero state
export const Zero: Story = {
  render: (args) => <StatefulWrapper {...args} />,
  args: {
    value: 0,
    showPlus: true,
  },
};
