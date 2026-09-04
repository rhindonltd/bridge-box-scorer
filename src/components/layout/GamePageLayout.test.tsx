import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { GamePageLayout } from "./GamePageLayout";

// GameHeaderBar depends on the game context; stub it so this test stays focused
// on GamePageLayout's own layout branches.
vi.mock("./GameHeaderBar", () => ({
  GameHeaderBar: ({ headerTitle }: { headerTitle: string }) => (
    <div>{headerTitle}</div>
  ),
}));

describe("GamePageLayout", () => {
  it("renders scrollable content with an action bar by default", () => {
    render(
      <GamePageLayout headerTitle="Board" actions={<button>Submit</button>}>
        <p>game body</p>
      </GamePageLayout>,
    );

    expect(screen.getByText("Board")).toBeInTheDocument();
    expect(screen.getByText("game body")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Submit" })).toBeInTheDocument();
  });

  it("renders centered content without an action bar", () => {
    render(
      <GamePageLayout headerTitle="Menu" centerContent>
        <p>centered body</p>
      </GamePageLayout>,
    );

    expect(screen.getByText("centered body")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
