import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { HeaderContentBottomLayout } from "./HeaderContentBottomLayout";

describe("HeaderContentBottomLayout", () => {
  it("renders heading, content, and button", () => {
    render(
      <HeaderContentBottomLayout
        heading={<h1>Title</h1>}
        content={<div>Content Area</div>}
        button={<button>Click me</button>}
      />,
    );

    expect(screen.getByText("Title")).toBeInTheDocument();
    expect(screen.getByText("Content Area")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Click me" }),
    ).toBeInTheDocument();
  });

  it("applies layout structure classes", () => {
    const { container } = render(
      <HeaderContentBottomLayout
        heading={<div>H</div>}
        content={<div>C</div>}
        button={<div>B</div>}
      />,
    );

    const root = container.firstChild as HTMLElement;

    expect(root).toHaveClass(
      "flex",
      "flex-col",
      "justify-between",
      "items-center",
      "h-screen",
      "bg-gray-100",
    );
  });

  it("wraps heading in centered container", () => {
    render(
      <HeaderContentBottomLayout
        heading={<span>Heading</span>}
        content={<div />}
        button={<div />}
      />,
    );

    const heading = screen.getByText("Heading").parentElement;

    expect(heading).toHaveClass("text-center");
  });

  it("wraps content in full-width centered container", () => {
    render(
      <HeaderContentBottomLayout
        heading={<div />}
        content={<span>Content</span>}
        button={<div />}
      />,
    );

    const content = screen.getByText("Content").parentElement;

    expect(content).toHaveClass(
      "w-full",
      "flex",
      "items-center",
      "justify-center",
    );
  });

  it("wraps button in padded footer container", () => {
    render(
      <HeaderContentBottomLayout
        heading={<div />}
        content={<div />}
        button={<button>Action</button>}
      />,
    );

    const button = screen.getByRole("button", { name: "Action" }).parentElement;

    expect(button).toHaveClass(
      "w-full",
      "flex",
      "justify-center",
      "pl-2",
      "pr-2",
      "pb-2",
    );
  });
});
