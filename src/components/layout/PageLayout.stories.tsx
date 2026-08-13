import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { PageLayout } from "./PageLayout";

const meta: Meta<typeof PageLayout> = {
  title: "Components/Layout/PageLayout",
  component: PageLayout,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof PageLayout>;

export const Default: Story = {
  args: {
    header: (
      <div className="bg-gray-100 p-4">
        <h1 className="text-xl font-semibold">Page Header</h1>
      </div>
    ),
    subHeader: (
      <div className="border-b p-3">
        <p className="text-sm text-gray-600">Page sub-header</p>
      </div>
    ),
    children: (
      <div className="flex-1 p-6">
        <p>Main page content goes here.</p>
      </div>
    ),
    actions: (
      <div className="flex justify-end gap-2">
        <button className="rounded border px-4 py-2">Cancel</button>
        <button className="rounded bg-blue-600 px-4 py-2 text-white">
          Continue
        </button>
      </div>
    ),
  },
};

export const WithoutHeader: Story = {
  args: {
    children: (
      <div className="flex-1 p-6">
        <p>Content without a header.</p>
      </div>
    ),
  },
};

export const WithHeaderOnly: Story = {
  args: {
    header: (
      <div className="border-b p-4">
        <h1 className="text-xl font-semibold">Page Header</h1>
      </div>
    ),
    children: (
      <div className="flex-1 p-6">
        <p>Main page content.</p>
      </div>
    ),
  },
};

export const WithActionsOnly: Story = {
  args: {
    children: (
      <div className="flex-1 p-6">
        <p>Main page content.</p>
      </div>
    ),
    actions: (
      <div className="flex justify-end">
        <button className="rounded bg-blue-600 px-4 py-2 text-white">
          Save
        </button>
      </div>
    ),
  },
};

export const LongContent: Story = {
  args: {
    header: (
      <div className="border-b p-4">
        <h1 className="text-xl font-semibold">Long Content</h1>
      </div>
    ),
    subHeader: (
      <div className="border-b p-3 text-sm text-gray-600">
        Scrollable content example
      </div>
    ),
    children: (
      <div className="flex-1 overflow-auto p-6">
        <div className="space-y-4">
          {Array.from({ length: 20 }, (_, index) => (
            <p key={index}>
              This is example content paragraph {index + 1}. The content area
              can grow and scroll independently of the fixed header and actions.
            </p>
          ))}
        </div>
      </div>
    ),
    actions: (
      <div className="flex justify-end border-t">
        <button className="rounded bg-blue-600 px-4 py-2 text-white">
          Continue
        </button>
      </div>
    ),
  },
};
