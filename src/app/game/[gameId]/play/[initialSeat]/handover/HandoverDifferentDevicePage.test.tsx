import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@/app/game/[gameId]/play/[initialSeat]/ChangeDeviceView", () => ({
  ChangeDeviceView: ({ gameId, seat, kind }: any) => (
    <div data-testid="cdv">{`${gameId}|${seat}|${kind}`}</div>
  ),
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

import { HandoverDifferentDevicePage } from "./HandoverDifferentDevicePage";

describe("HandoverDifferentDevicePage", () => {
  it("renders a HANDOVER ChangeDeviceView and goes back", () => {
    const onBack = vi.fn();
    render(
      <HandoverDifferentDevicePage gameId="g1" seat="A3NS" onBack={onBack} />,
    );
    expect(screen.getByTestId("cdv")).toHaveTextContent("g1|A3NS|HANDOVER");
    fireEvent.click(screen.getByRole("button", { name: /back/i }));
    expect(onBack).toHaveBeenCalled();
  });
});
