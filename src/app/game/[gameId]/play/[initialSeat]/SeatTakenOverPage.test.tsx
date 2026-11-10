import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

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

import { SeatTakenOverPage } from "./SeatTakenOverPage";

describe("SeatTakenOverPage", () => {
  it("explains the seat moved and returns to the main menu", () => {
    render(<SeatTakenOverPage />);
    expect(
      screen.getByText("This seat has moved to another device"),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByText("Back to main menu"));
    expect(mockReplace).toHaveBeenCalledWith("/");
  });
});
