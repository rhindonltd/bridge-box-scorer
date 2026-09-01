import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/context/GameContext", () => ({
  useRequiredGame: () => ({ game: { gameId: "g1", eventName: "Test" } }),
}));

import { SitOutPage } from "./SitOutPage";

describe("SitOutPage", () => {
  it("shows the table when one is provided", () => {
    render(
      <SitOutPage
        round={5}
        tableNumber={3}
        onHandleSitOutContinue={vi.fn()}
      />,
    );
    expect(screen.getByText("Sit Out at Table 3")).toBeInTheDocument();
  });

  it("falls back to a plain 'Sit Out' when no table is provided", () => {
    render(<SitOutPage round={5} onHandleSitOutContinue={vi.fn()} />);
    expect(screen.getByText("Sit Out")).toBeInTheDocument();
  });
});
