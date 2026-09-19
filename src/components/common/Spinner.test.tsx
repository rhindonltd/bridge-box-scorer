import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { Spinner, FullScreenSpinner, CaptionedSpinner } from "./Spinner";

describe("Spinner", () => {
  it("renders the default (md) ring with no extra class", () => {
    const { container } = render(<Spinner />);
    const ring = container.firstChild as HTMLElement;
    expect(ring.className).toContain("animate-spin");
    // md size classes.
    expect(ring.className).toContain("h-8");
    expect(ring.className).toContain("w-8");
    // No trailing whitespace from the empty className default.
    expect(ring.className).toBe(ring.className.trim());
  });

  it("renders the lg size and appended className", () => {
    const { container } = render(<Spinner size="lg" className="mx-auto" />);
    const ring = container.firstChild as HTMLElement;
    expect(ring.className).toContain("h-10");
    expect(ring.className).toContain("w-10");
    expect(ring.className).toContain("mx-auto");
  });
});

describe("FullScreenSpinner", () => {
  it("renders a centered full-height loader", () => {
    const { container } = render(<FullScreenSpinner />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain("h-dvh");
    expect(container.querySelector(".animate-spin")).not.toBeNull();
  });
});

describe("CaptionedSpinner", () => {
  it("renders the spinner with its caption", () => {
    render(<CaptionedSpinner caption="Loading…" />);
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });
});
