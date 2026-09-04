import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ErrorPage } from "./ErrorPage";

describe("ErrorPage", () => {
  it("shows the operation and the error message, and resets on click", () => {
    const reset = vi.fn();
    render(
      <ErrorPage
        operation="loading game"
        error={new Error("boom")}
        reset={reset}
      />,
    );

    expect(screen.getByText("Error loading game")).toBeInTheDocument();
    expect(screen.getByText("boom")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Try Again" }));
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("falls back to a generic message when the error has no message", () => {
    render(
      <ErrorPage operation="saving" error={new Error("")} reset={vi.fn()} />,
    );
    expect(
      screen.getByText("An unexpected error occurred."),
    ).toBeInTheDocument();
  });
});
