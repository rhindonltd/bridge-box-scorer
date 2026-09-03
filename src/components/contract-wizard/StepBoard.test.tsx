import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { StepBoard } from "./StepBoard";

describe("StepBoard", () => {
  it("renders a button per board and selects an available one", () => {
    const onBoardSelected = vi.fn();
    render(
      <StepBoard
        boards={[1, 2, 3]}
        playedBoards={[]}
        onBoardSelected={onBoardSelected}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "2" }));
    expect(onBoardSelected).toHaveBeenCalledWith(2);
  });

  it("disables played boards", () => {
    const onBoardSelected = vi.fn();
    render(
      <StepBoard
        boards={[1, 2]}
        playedBoards={[1]}
        onBoardSelected={onBoardSelected}
      />,
    );

    const board1 = screen.getByRole("button", { name: "1" });
    expect(board1).toBeDisabled();
    fireEvent.click(board1);
    expect(onBoardSelected).not.toHaveBeenCalled();
  });
});
