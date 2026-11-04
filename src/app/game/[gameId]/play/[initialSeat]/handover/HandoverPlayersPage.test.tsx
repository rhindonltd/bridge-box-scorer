import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { NewPlayer } from "@/db/games/tables/players";

vi.mock("@/components/layout/GamePageLayout", () => ({
  GamePageLayout: ({
    headerTitle,
    backAction,
    actions,
    children,
  }: {
    headerTitle: string;
    backAction?: () => void;
    actions?: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <div>
      {backAction && (
        <button aria-label="Go back" onClick={backAction}>
          back
        </button>
      )}
      <h1>{headerTitle}</h1>
      {children}
      <div>{actions}</div>
    </div>
  ),
}));

// Stub PlayerSearch as a simple button that selects a fixed player, so we can
// drive the form without the debounced search internals.
vi.mock("@/app/game/[gameId]/join/PlayerSearch", () => ({
  default: ({
    label,
    value,
    onChange,
  }: {
    label: string;
    value: NewPlayer | null;
    onChange: (p: NewPlayer | null) => void;
  }) => (
    <div>
      <span>{label}</span>
      <span>{value ? `${value.firstName} ${value.lastName}` : "(none)"}</span>
      <button
        type="button"
        onClick={() =>
          onChange({ firstName: label, lastName: "Player", nationalId: null })
        }
      >
        select {label}
      </button>
    </div>
  ),
}));

import { HandoverPlayersPage } from "./HandoverPlayersPage";

describe("HandoverPlayersPage", () => {
  const onCancel = vi.fn();
  const onSubmit = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    onSubmit.mockResolvedValue(undefined);
  });

  it("wires the back/cancel action", () => {
    render(<HandoverPlayersPage onCancel={onCancel} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: "Go back" }));
    expect(onCancel).toHaveBeenCalled();
  });

  it("disables submit until both players are chosen", () => {
    render(<HandoverPlayersPage onCancel={onCancel} onSubmit={onSubmit} />);
    const submit = screen.getByRole("button", {
      name: "Take over this device",
    });
    expect(submit).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "select Player 1" }));
    expect(submit).toBeDisabled(); // still only one

    fireEvent.click(screen.getByRole("button", { name: "select Player 2" }));
    expect(submit).toBeEnabled();
  });

  it("submits both chosen players", async () => {
    render(<HandoverPlayersPage onCancel={onCancel} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: "select Player 1" }));
    fireEvent.click(screen.getByRole("button", { name: "select Player 2" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Take over this device" }),
    );

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        { firstName: "Player 1", lastName: "Player", nationalId: null },
        { firstName: "Player 2", lastName: "Player", nationalId: null },
      ),
    );
  });

  it("surfaces a submit error", async () => {
    onSubmit.mockRejectedValueOnce(new Error("already had a handover"));
    render(<HandoverPlayersPage onCancel={onCancel} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: "select Player 1" }));
    fireEvent.click(screen.getByRole("button", { name: "select Player 2" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Take over this device" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "already had a handover",
    );
  });
});
