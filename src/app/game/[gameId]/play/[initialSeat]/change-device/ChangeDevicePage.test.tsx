import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// Mirrors the real layout's header (an explicit backAction renders a "Go back"
// button) and records the content mode.
vi.mock("@/components/layout/GamePageLayout", () => ({
  GamePageLayout: ({
    headerTitle,
    backAction,
    contentMode,
    children,
  }: {
    headerTitle: string;
    backAction?: () => void;
    contentMode?: string;
    children: React.ReactNode;
  }) => (
    <div data-content-mode={contentMode}>
      {backAction && (
        <button type="button" aria-label="Go back" onClick={backAction} />
      )}
      <h1>{headerTitle}</h1>
      {children}
    </div>
  ),
}));

// The code panel has its own tests; stub it so no code is minted here.
vi.mock("@/app/game/[gameId]/play/[initialSeat]/ChangeDeviceView", () => ({
  ChangeDeviceView: ({
    gameId,
    seat,
    kind,
  }: {
    gameId: string;
    seat: string;
    kind?: string;
  }) => (
    <div data-testid="change-device-view">
      {gameId}/{seat}/{kind ?? "CHANGE_DEVICE"}
    </div>
  ),
}));

import { ChangeDevicePage } from "./ChangeDevicePage";

describe("ChangeDevicePage", () => {
  it("is a page titled Change device showing this seat's change-device code", () => {
    const { container } = render(
      <ChangeDevicePage gameId="g1" seat="A3NS" onBack={vi.fn()} />,
    );
    expect(
      screen.getByRole("heading", { name: "Change device" }),
    ).toBeInTheDocument();
    // Same pair, new device — the default code kind.
    expect(screen.getByTestId("change-device-view")).toHaveTextContent(
      "g1/A3NS/CHANGE_DEVICE",
    );
    // Centred, like the Handover code screen.
    expect(container.firstChild).toHaveAttribute("data-content-mode", "center");
  });

  it("has no separate Done button; the header back arrow leaves", () => {
    const onBack = vi.fn();
    render(<ChangeDevicePage gameId="g1" seat="A3NS" onBack={onBack} />);
    expect(
      screen.queryByRole("button", { name: "Done" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Go back" }));
    expect(onBack).toHaveBeenCalled();
  });
});
