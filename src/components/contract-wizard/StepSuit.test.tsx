import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { StepSuit } from "./StepSuit";

describe("StepSuit", () => {
  it("renders a button per suit and reports the selected suit", () => {
    const onSuitSelected = vi.fn();
    render(<StepSuit level={4} onSuitSelected={onSuitSelected} />);

    // Five suit buttons (C, D, H, S, NT).
    expect(screen.getAllByRole("button")).toHaveLength(5);

    // NT button shows the level + NT text.
    fireEvent.click(screen.getByRole("button", { name: "4NT" }));
    expect(onSuitSelected).toHaveBeenCalledWith("NT");
  });

  it("reports a chosen suit when a suited button is clicked", () => {
    const onSuitSelected = vi.fn();
    render(<StepSuit level={3} onSuitSelected={onSuitSelected} />);

    // Suited buttons render as "<level><symbol>"; click the first non-NT one.
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[0]); // Clubs (SUIT_ORDER starts with C)
    expect(onSuitSelected).toHaveBeenCalledWith("C");
  });
});
