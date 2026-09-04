import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { ScrollableContent } from "./ScrollableContent";

/**
 * jsdom reports 0 for all layout metrics, so we stub the scroll geometry
 * getters to control the "has more below" fade indicator.
 */
function stubGeometry({
  scrollHeight,
  clientHeight,
  scrollTop = 0,
}: {
  scrollHeight: number;
  clientHeight: number;
  scrollTop?: number;
}) {
  const proto = window.HTMLElement.prototype;
  const spies = [
    vi.spyOn(proto, "scrollHeight", "get").mockReturnValue(scrollHeight),
    vi.spyOn(proto, "clientHeight", "get").mockReturnValue(clientHeight),
    vi.spyOn(proto, "scrollTop", "get").mockReturnValue(scrollTop),
  ];
  return () => spies.forEach((s) => s.mockRestore());
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ScrollableContent", () => {
  it("renders children without a fade when everything fits", () => {
    const restore = stubGeometry({ scrollHeight: 100, clientHeight: 100 });
    const { container } = render(
      <ScrollableContent>
        <p>fits content</p>
      </ScrollableContent>,
    );

    expect(screen.getByText("fits content")).toBeInTheDocument();
    expect(container.querySelector(".bg-gradient-to-t")).toBeNull();
    restore();
  });

  it("shows a fade indicator when more content is below the fold", () => {
    const restore = stubGeometry({ scrollHeight: 500, clientHeight: 100 });
    const { container } = render(
      <ScrollableContent>
        <p>overflowing content</p>
      </ScrollableContent>,
    );

    expect(container.querySelector(".bg-gradient-to-t")).not.toBeNull();
    restore();
  });

  it("recomputes the fade on scroll", () => {
    const restore = stubGeometry({ scrollHeight: 500, clientHeight: 100 });
    const { container } = render(
      <ScrollableContent>
        <p>scrollable content</p>
      </ScrollableContent>,
    );

    const scrollEl = container.querySelector(".overflow-y-auto")!;
    fireEvent.scroll(scrollEl);
    expect(container.querySelector(".bg-gradient-to-t")).not.toBeNull();
    restore();
  });
});
