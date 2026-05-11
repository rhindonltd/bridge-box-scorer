import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import NotPlayedButton from "./NotPlayedButton";

describe("NotPlayedButton", () => {
  it("renders button text", () => {
    render(<NotPlayedButton onNotPlayed={vi.fn()} />);

    expect(
      screen.getByRole("button", { name: "Not Played" }),
    ).toBeInTheDocument();
  });

  it("calls onNotPlayed when clicked", () => {
    const fn = vi.fn();

    render(<NotPlayedButton onNotPlayed={fn} />);

    fireEvent.click(screen.getByRole("button", { name: "Not Played" }));

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("applies default classes", () => {
    render(<NotPlayedButton onNotPlayed={vi.fn()} />);

    const button = screen.getByRole("button", {
      name: "Not Played",
    });

    expect(button).toHaveClass(
      "w-full",
      "mt-2",
      "p-2",
      "text-base",
      "bg-blue-400",
      "rounded-xl",
    );
  });

  it("applies custom className", () => {
    render(<NotPlayedButton className="custom-class" onNotPlayed={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Not Played" })).toHaveClass(
      "custom-class",
    );
  });
});
