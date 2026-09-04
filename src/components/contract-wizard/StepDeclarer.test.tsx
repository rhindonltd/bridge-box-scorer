import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { StepDeclarer } from "./StepDeclarer";

describe("StepDeclarer", () => {
  it("reports the chosen declarer with no doubling for an NT contract", () => {
    const onDeclarerSelected = vi.fn();
    render(
      <StepDeclarer level={3} suit="NT" onDeclarerSelected={onDeclarerSelected} />,
    );

    // NT rendering path: "3NTN".
    fireEvent.click(screen.getByRole("button", { name: "3NTN" }));
    expect(onDeclarerSelected).toHaveBeenCalledWith("N", "");
  });

  it("reports the chosen declarer for a suit contract with doubling", () => {
    const onDeclarerSelected = vi.fn();
    render(
      <StepDeclarer level={4} suit="H" onDeclarerSelected={onDeclarerSelected} />,
    );

    // Select the doubled option first.
    fireEvent.click(screen.getByRole("button", { name: "X" }));

    // Suit rendering path: level + suit symbol + direction + doubling.
    const east = screen
      .getAllByRole("button")
      .find((b) => b.textContent === "4♥EX");
    fireEvent.click(east!);
    expect(onDeclarerSelected).toHaveBeenCalledWith("E", "X");
  });

  it("supports the redoubled option", () => {
    const onDeclarerSelected = vi.fn();
    render(
      <StepDeclarer level={2} suit="S" onDeclarerSelected={onDeclarerSelected} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "XX" }));
    const west = screen
      .getAllByRole("button")
      .find((b) => b.textContent === "2♠WXX");
    fireEvent.click(west!);
    expect(onDeclarerSelected).toHaveBeenCalledWith("W", "XX");
  });
});
