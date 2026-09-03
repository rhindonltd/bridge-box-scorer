import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { StepDeclarer } from "./StepDeclarer";

describe("StepDeclarer", () => {
  it("reports the declarer with no doubling by default", () => {
    const onDeclarerSelected = vi.fn();
    render(
      <StepDeclarer
        level={3}
        suit="NT"
        onDeclarerSelected={onDeclarerSelected}
      />,
    );

    // Direction button for a 3NT contract by North.
    fireEvent.click(screen.getByRole("button", { name: "3NTN" }));
    expect(onDeclarerSelected).toHaveBeenCalledWith("N", "");
  });

  it("carries the selected doubling into the callback", () => {
    const onDeclarerSelected = vi.fn();
    render(
      <StepDeclarer
        level={3}
        suit="NT"
        onDeclarerSelected={onDeclarerSelected}
      />,
    );

    // Select the "X" doubling toggle, then a direction.
    fireEvent.click(screen.getByRole("button", { name: "X" }));
    fireEvent.click(screen.getByRole("button", { name: "3NTSX" }));
    expect(onDeclarerSelected).toHaveBeenCalledWith("S", "X");
  });
});
