import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import Error from "./error";

/**
 * The top-level App Router error boundary. There is no non-contrived UI route
 * that throws to it (unknown games route to not-found), so its rendering and
 * the "Try Again" reset are covered here at the component level.
 */
describe("Error boundary", () => {
  it("renders the heading and the error message", () => {
    render(<Error error={new globalThis.Error("Boom")} reset={vi.fn()} />);
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("Boom")).toBeInTheDocument();
  });

  it("falls back to a generic message when the error has none", () => {
    render(<Error error={new globalThis.Error("")} reset={vi.fn()} />);
    expect(
      screen.getByText("An unexpected error occurred."),
    ).toBeInTheDocument();
  });

  it("calls reset when 'Try Again' is clicked", () => {
    const reset = vi.fn();
    render(<Error error={new globalThis.Error("x")} reset={reset} />);
    fireEvent.click(screen.getByRole("button", { name: "Try Again" }));
    expect(reset).toHaveBeenCalledOnce();
  });
});
