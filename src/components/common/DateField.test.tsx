import { render, screen, fireEvent } from "@testing-library/react";
import DateField from "./DateField";
import { describe, it, expect, vi } from "vitest";

describe("DateField", () => {
  it("renders label", () => {
    render(<DateField label="Date Played" value="" onChange={vi.fn()} />);

    expect(screen.getByText("Date Played")).toBeInTheDocument();
  });

  it("renders input with correct value", () => {
    render(
      <DateField label="Date Played" value="2026-01-15" onChange={vi.fn()} />,
    );

    const input = screen.getByLabelText("Date Played") as HTMLInputElement;
    expect(input.value).toBe("2026-01-15");
  });

  it("renders a date input", () => {
    render(<DateField label="Date Played" value="" onChange={vi.fn()} />);

    const input = screen.getByLabelText("Date Played");
    expect(input).toHaveAttribute("type", "date");
  });

  it("calls onChange with the new date string", () => {
    const onChange = vi.fn();

    render(<DateField label="Date Played" value="" onChange={onChange} />);

    const input = screen.getByLabelText("Date Played");
    fireEvent.change(input, { target: { value: "2026-02-20" } });

    expect(onChange).toHaveBeenCalledWith("2026-02-20");
  });
});
