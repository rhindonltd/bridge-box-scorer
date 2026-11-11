import { describe, it, expect, vi } from "vitest";
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { WaitingForConfirmation } from "@/app/game/[gameId]/play/[initialSeat]/WaitingForConfirmation";

vi.mock("@/components/layout/GamePageLayout", () => ({
  GamePageLayout: ({
    headerTitle,
    headerRight,
    backAction,
    hideBack,
    children,
  }: {
    headerTitle: string;
    headerRight?: React.ReactNode;
    backAction?: () => void;
    hideBack?: boolean;
    children: React.ReactNode;
  }) => (
    <div>
      {!hideBack && backAction && (
        <button data-testid="back" onClick={backAction}>
          back
        </button>
      )}
      <div data-testid="header">{headerTitle}</div>
      <div data-testid="header-right">{headerRight}</div>
      {children}
    </div>
  ),
}));

describe("WaitingForConfirmation", () => {
  it("renders the board number in the header and the waiting message", () => {
    render(<WaitingForConfirmation boardNumber={7} />);
    expect(screen.getByText("Board 7")).toBeInTheDocument();
    expect(screen.getByText("Waiting for confirmation")).toBeInTheDocument();
    expect(
      screen.getByText(
        "The other pair needs to enter their result for this board.",
      ),
    ).toBeInTheDocument();
  });

  it("shows the contract the player entered", () => {
    render(<WaitingForConfirmation boardNumber={7} result="3NTN+1" />);
    const entered = screen.getByTestId("waiting-entered-result");
    expect(entered).toHaveTextContent("You entered");
    expect(entered).toHaveTextContent("3NTN+1");
  });

  it("shows a pass-out or not-played result in words", () => {
    const { unmount } = render(
      <WaitingForConfirmation boardNumber={7} result="PO" />,
    );
    expect(screen.getByTestId("waiting-entered-result")).toHaveTextContent(
      "Pass Out",
    );
    unmount();
    render(<WaitingForConfirmation boardNumber={7} result="NP" />);
    expect(screen.getByTestId("waiting-entered-result")).toHaveTextContent(
      "Not Played",
    );
  });

  it("shows no entered result when it isn't known", () => {
    render(<WaitingForConfirmation boardNumber={7} />);
    expect(
      screen.queryByTestId("waiting-entered-result"),
    ).not.toBeInTheDocument();
  });

  it("offers no back action when onBack isn't provided", () => {
    render(<WaitingForConfirmation boardNumber={7} />);
    expect(screen.queryByTestId("back")).not.toBeInTheDocument();
  });

  it("calls onBack when the back action is used", async () => {
    const onBack = vi.fn().mockResolvedValue(undefined);
    render(<WaitingForConfirmation boardNumber={7} onBack={onBack} />);
    fireEvent.click(screen.getByTestId("back"));
    await waitFor(() => expect(onBack).toHaveBeenCalledTimes(1));
  });

  it("shows the server's message and stays put when going back fails", async () => {
    const onBack = vi.fn().mockRejectedValue(new Error("Already confirmed"));
    render(<WaitingForConfirmation boardNumber={7} onBack={onBack} />);
    fireEvent.click(screen.getByTestId("back"));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Already confirmed",
    );
  });

  it("renders the headerRight slot content", () => {
    render(
      <WaitingForConfirmation
        boardNumber={7}
        headerRight={<span data-testid="play-menu">menu</span>}
      />,
    );
    expect(screen.getByTestId("play-menu")).toBeInTheDocument();
  });
});
