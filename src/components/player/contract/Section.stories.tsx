import { Meta, StoryObj } from "@storybook/nextjs-vite";
import Section from "@/components/player/contract/Section";
import { ToggleButton } from "@/components/common/ToggleButton";

const meta: Meta<typeof Section> = {
  title: "Player/Contract/Section",
  component: Section,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Section>;

export const Example: Story = {
  render: () => (
    <Section title="Level" gridCols={3}>
      <ToggleButton>1</ToggleButton>
      <ToggleButton>2</ToggleButton>
      <ToggleButton active>3</ToggleButton>
      <ToggleButton>4</ToggleButton>
      <ToggleButton>5</ToggleButton>
      <ToggleButton>6</ToggleButton>
    </Section>
  ),
};
