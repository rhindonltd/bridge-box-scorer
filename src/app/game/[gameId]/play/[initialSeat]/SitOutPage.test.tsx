import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/context/GameContext", () => ({
  useRequiredGame: () => ({ game: { gameId: "g1", eventName: "Test" } }),
}));

import { SitOutPage } from "./SitOutPage";

describe("SitOutPage", () => {
  it("shows the table where the sit-out is happening", () => {
    render(
      <SitOutPage
        round={5}
        tableNumber={3}
        onHandleSitOutContinue={vi.fn()}
      />,
    );
    expect(screen.getByText("Sit Out at Table 3")).toBeInTheDocument();
  });
});
