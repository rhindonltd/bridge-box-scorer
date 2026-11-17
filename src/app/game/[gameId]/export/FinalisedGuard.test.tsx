import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";

const mockGame = vi.fn();
vi.mock("@/context/GameContext", () => ({
  useRequiredGame: () => ({ game: mockGame() }),
}));
const mockIsDirector = vi.fn();
vi.mock("@/hooks/use-is-director", () => ({
  useIsDirector: () => mockIsDirector(),
}));

const guardProps: Array<Record<string, unknown>> = [];
vi.mock("@/app/game/[gameId]/manage/GameStateGuard", () => ({
  GameStateGuard: (props: Record<string, unknown>) => {
    guardProps.push(props);
    return <div>{props.children as React.ReactNode}</div>;
  },
}));

import { FinalisedGuard } from "./FinalisedGuard";

const lastProps = () => guardProps[guardProps.length - 1];

describe("FinalisedGuard", () => {
  beforeEach(() => {
    guardProps.length = 0;
    mockIsDirector.mockReturnValue(false);
  });

  it("allows a finalised game", () => {
    mockGame.mockReturnValue({ finalisedAt: "2026-01-01T00:00:00Z" });
    render(
      <FinalisedGuard gameId="g1">
        <span>x</span>
      </FinalisedGuard>,
    );
    expect(lastProps().allowed).toBe(true);
  });

  it("sends a non-director away from an open game to the main menu", () => {
    mockGame.mockReturnValue({ finalisedAt: null });
    render(
      <FinalisedGuard gameId="g1">
        <span>x</span>
      </FinalisedGuard>,
    );
    expect(lastProps().allowed).toBe(false);
    expect(lastProps().redirectTo).toBe("/");
  });

  it("sends a director to the Finalise Game check", () => {
    mockGame.mockReturnValue({ finalisedAt: null });
    mockIsDirector.mockReturnValue(true);
    render(
      <FinalisedGuard gameId="g1">
        <span>x</span>
      </FinalisedGuard>,
    );
    expect(lastProps().redirectTo).toBe("/game/g1/manage/finalise");
  });
});
