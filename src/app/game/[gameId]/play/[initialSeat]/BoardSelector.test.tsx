import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BoardSelector } from "@/app/game/[gameId]/play/[initialSeat]/BoardSelector";

describe("BoardSelector", () => {
  it("renders a plain label when there is only one board", () => {
    render(
      <BoardSelector board={3} playedBoards={[3]} onBoardSelected={vi.fn()} />,
    );
    expect(screen.getByText("Board 3")).toBeInTheDocument();
    // No toggle button in single-board mode.
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("opens the dropdown and selects a different board", () => {
    const onBoardSelected = vi.fn();
    render(
      <BoardSelector
        board={3}
        playedBoards={[3, 4, 5]}
        onBoardSelected={onBoardSelected}
      />,
    );

    const toggle = screen.getByRole("button", { name: /Board 3/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");

    // The current board (highlighted) and the others are all listed.
    fireEvent.click(screen.getByRole("button", { name: "Board 4" }));
    expect(onBoardSelected).toHaveBeenCalledWith(4);
    // Selecting closes the dropdown.
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("closes the dropdown when clicking outside", () => {
    render(
      <BoardSelector
        board={3}
        playedBoards={[3, 4]}
        onBoardSelected={vi.fn()}
      />,
    );

    const toggle = screen.getByRole("button", { name: /Board 3/ });
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");

    fireEvent.mouseDown(document.body);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("keeps the dropdown open when clicking inside it", () => {
    render(
      <BoardSelector
        board={3}
        playedBoards={[3, 4]}
        onBoardSelected={vi.fn()}
      />,
    );

    const toggle = screen.getByRole("button", { name: /Board 3/ });
    fireEvent.click(toggle);
    // mousedown inside the dropdown container should not close it.
    fireEvent.mouseDown(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
  });

  it("toggles closed again when the button is clicked twice", () => {
    render(
      <BoardSelector
        board={3}
        playedBoards={[3, 4]}
        onBoardSelected={vi.fn()}
      />,
    );
    const toggle = screen.getByRole("button", { name: /Board 3/ });
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });
});
