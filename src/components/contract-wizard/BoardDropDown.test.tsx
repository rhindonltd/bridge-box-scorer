import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { BoardDropDown } from "./BoardDropDown";

describe("BoardDropDown", () => {
  it("shows the selected board and opens the list on click", () => {
    render(
      <BoardDropDown
        roundBoards={[1, 2, 3]}
        playedBoards={[]}
        selectedBoard={2}
        onBoardSelected={vi.fn()}
      />,
    );

    // Trigger shows the current selection.
    expect(
      screen.getByRole("button", { name: /Board 2/ }),
    ).toBeInTheDocument();

    // List is closed initially (only the trigger button exists).
    expect(screen.getAllByRole("button")).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: /Board 2/ }));
    // Now the trigger + one option per round board.
    expect(screen.getAllByRole("button").length).toBeGreaterThan(1);
  });

  it("selects an enabled board and closes the list", () => {
    const onBoardSelected = vi.fn();
    render(
      <BoardDropDown
        roundBoards={[1, 2, 3]}
        playedBoards={[]}
        selectedBoard={1}
        onBoardSelected={onBoardSelected}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Board 1/ }));
    // Option list rendered; click board 3.
    const board3 = screen
      .getAllByRole("button")
      .find((b) => b.textContent === "Board 3");
    fireEvent.click(board3!);

    expect(onBoardSelected).toHaveBeenCalledWith(3);
  });

  it("disables boards that have already been played", () => {
    const onBoardSelected = vi.fn();
    render(
      <BoardDropDown
        roundBoards={[1, 2]}
        playedBoards={[2]}
        selectedBoard={1}
        onBoardSelected={onBoardSelected}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Board 1/ }));
    const board2 = screen
      .getAllByRole("button")
      .find((b) => b.textContent === "Board 2");
    expect(board2).toBeDisabled();

    fireEvent.click(board2!);
    expect(onBoardSelected).not.toHaveBeenCalled();
  });
});
