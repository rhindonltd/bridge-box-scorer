import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import EnterPlayerNames from "./EnterPlayerNames";

// Mock FormCardLayout
vi.mock("@/components/layout/FormCardLayout", () => ({
  default: ({ header, headerColor, primaryText, onSubmit, children }: any) => (
    <form data-header={header} data-color={headerColor} onSubmit={onSubmit}>
      {children}
      <button type="submit">{primaryText}</button>
    </form>
  ),
}));

// Mock TextField
vi.mock("@/components/common/TextField", () => ({
  default: ({ label, value, onChange }: any) => (
    <input
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

describe("EnterPlayerNames", () => {
  it("renders NS labels correctly", () => {
    render(<EnterPlayerNames direction="NS" submitPlayerNames={vi.fn()} />);

    expect(screen.getByLabelText("North Player")).toBeInTheDocument();

    expect(screen.getByLabelText("South Player")).toBeInTheDocument();
  });

  it("renders EW labels correctly", () => {
    render(<EnterPlayerNames direction="EW" submitPlayerNames={vi.fn()} />);

    expect(screen.getByLabelText("East Player")).toBeInTheDocument();

    expect(screen.getByLabelText("West Player")).toBeInTheDocument();
  });

  // it("applies correct header color for NS", () => {
  //     render(
  //         <EnterPlayerNames
  //             direction="NS"
  //             submitPlayerNames={vi.fn()}
  //         />
  //     );
  //
  //     expect(
  //         screen.getByRole("form")
  //     ).toHaveAttribute("data-color", "bg-blue-600");
  // });

  // it("applies correct header color for EW", () => {
  //     render(
  //         <EnterPlayerNames
  //             direction="EW"
  //             submitPlayerNames={vi.fn()}
  //         />
  //     );
  //
  //     expect(
  //         screen.getByRole("form")
  //     ).toHaveAttribute("data-color", "bg-green-600");
  // });

  it("submits player names", () => {
    const fn = vi.fn();

    render(<EnterPlayerNames direction="NS" submitPlayerNames={fn} />);

    fireEvent.change(screen.getByLabelText("North Player"), {
      target: { value: "Alice" },
    });

    fireEvent.change(screen.getByLabelText("South Player"), {
      target: { value: "Bob" },
    });

    fireEvent.click(screen.getByText("Continue"));

    expect(fn).toHaveBeenCalledWith("Alice", "Bob");
  });

  it("prevents default form submit behavior", () => {
    const fn = vi.fn();

    render(<EnterPlayerNames direction="NS" submitPlayerNames={fn} />);

    const form = screen.getByText("Continue").closest("form")!;

    const event = new Event("submit", {
      bubbles: true,
      cancelable: true,
    });

    const preventDefaultSpy = vi.spyOn(event, "preventDefault");

    form.dispatchEvent(event);

    expect(preventDefaultSpy).toHaveBeenCalled();
  });
});
