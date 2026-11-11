import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
vi.mock("@/components/layout/GamePageLayout", () => ({
  GamePageLayout: ({
    headerTitle,
    backAction,
    headerRight,
    actions,
    children,
  }: any) => (
    <div>
      {backAction && (
        <button aria-label="Go back" onClick={backAction}>
          back
        </button>
      )}
      <h1>{headerTitle}</h1>
      {headerRight}
      {children}
      <div>{actions}</div>
    </div>
  ),
}));

import { LeaderboardModePage } from "./LeaderboardModePage";

describe("LeaderboardModePage", () => {
  it("selects percentage", () => {
    const onSelect = vi.fn();
    render(<LeaderboardModePage onSelect={onSelect} onBack={vi.fn()} />);
    fireEvent.click(screen.getByText("Percentage"));
    expect(onSelect).toHaveBeenCalledWith("percentage");
  });

  it("selects matchpoints", () => {
    const onSelect = vi.fn();
    render(<LeaderboardModePage onSelect={onSelect} onBack={vi.fn()} />);
    fireEvent.click(screen.getByText("Matchpoints"));
    expect(onSelect).toHaveBeenCalledWith("matchpoints");
  });

  it("goes back via the header back button", () => {
    const onBack = vi.fn();
    render(<LeaderboardModePage onSelect={vi.fn()} onBack={onBack} />);
    fireEvent.click(screen.getByRole("button", { name: /back/i }));
    expect(onBack).toHaveBeenCalled();
  });
});
