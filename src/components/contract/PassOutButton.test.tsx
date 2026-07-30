import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PassOutButton from "./PassOutButton";

describe("PassOutButton", () => {
  it("renders button text", () => {
    render(<PassOutButton onPassOut={vi.fn()} />);

    expect(
      screen.getByRole("button", { name: "Pass Out" }),
    ).toBeInTheDocument();
  });

  it("calls onPassOut when clicked", () => {
    const fn = vi.fn();

    render(<PassOutButton onPassOut={fn} />);

    fireEvent.click(screen.getByRole("button", { name: "Pass Out" }));

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("applies default classes", () => {
    render(<PassOutButton onPassOut={vi.fn()} />);

    const button = screen.getByRole("button", {
      name: "Pass Out",
    });

    expect(button).toHaveClass(
      "w-full",
      "mt-2",
      "p-2",
      "text-base",
      "bg-gray-200",
      "rounded-xl",
    );
  });

  it("applies custom className", () => {
    render(<PassOutButton className="custom-class" onPassOut={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Pass Out" })).toHaveClass(
      "custom-class",
    );
  });
});
