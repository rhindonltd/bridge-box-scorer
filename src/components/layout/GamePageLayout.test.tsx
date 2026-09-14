import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { GamePageLayout } from "./GamePageLayout";

// GameHeaderBar depends on the game context; stub it so this test stays focused
// on GamePageLayout's own layout branches. The stub echoes the back-related
// props so we can assert they are plumbed through.
vi.mock("./GameHeaderBar", () => ({
  GameHeaderBar: ({
    headerTitle,
    hideBack,
    backFallbackHref,
  }: {
    headerTitle: string;
    hideBack?: boolean;
    backFallbackHref?: string;
  }) => (
    <div
      data-testid="game-header-bar"
      data-hide-back={String(!!hideBack)}
      data-back-fallback={backFallbackHref ?? ""}
    >
      {headerTitle}
    </div>
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

  it("plumbs hideBack and backFallbackHref through to the header", () => {
    render(
      <GamePageLayout headerTitle="Board" hideBack backFallbackHref="/game/g1">
        <p>body</p>
      </GamePageLayout>,
    );

    const header = screen.getByTestId("game-header-bar");
    expect(header).toHaveAttribute("data-hide-back", "true");
    expect(header).toHaveAttribute("data-back-fallback", "/game/g1");
  });

  it("defaults hideBack to false when not set", () => {
    render(
      <GamePageLayout headerTitle="Board">
        <p>body</p>
      </GamePageLayout>,
    );

    expect(screen.getByTestId("game-header-bar")).toHaveAttribute(
      "data-hide-back",
      "false",
    );
  });
});
