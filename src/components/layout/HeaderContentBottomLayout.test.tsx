import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { HeaderContentBottomLayout } from "./HeaderContentBottomLayout";

describe("HeaderContentBottomLayout", () => {
  it("renders heading, content, and bottom", () => {
    render(
      <HeaderContentBottomLayout
        heading={<h1>Title</h1>}
        content={<div>Content Area</div>}
        bottom={<button>Click me</button>}
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
        bottom={<div>B</div>}
      />,
    );
    const root = container.firstChild as HTMLElement;
    expect(root).toHaveClass("flex", "flex-col", "flex-1");
  });

  it("wraps heading in centered container", () => {
    render(
      <HeaderContentBottomLayout
        heading={<span>Heading</span>}
        content={<div />}
        bottom={<div />}
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
        bottom={<div />}
      />,
    );
    const content = screen.getByText("Content").parentElement;
    expect(content).toHaveClass("flex", "items-center", "justify-center");
  });

  it("wraps bottom in padded footer container", () => {
    render(
      <HeaderContentBottomLayout
        heading={<div />}
        content={<div />}
        bottom={<button>Action</button>}
      />,
    );
    const bottom = screen.getByRole("button", { name: "Action" }).parentElement;
    expect(bottom).toHaveClass("w-full", "flex", "justify-center");
  });
});
