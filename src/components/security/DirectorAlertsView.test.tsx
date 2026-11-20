import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DirectorAlertsView } from "./DirectorAlertsView";
import type { DirectorAlert } from "@/model/director-alert";

const signedIn: DirectorAlert = {
  id: "a1",
  at: "2026-11-20T19:42:00.000Z",
  kind: "signedIn",
  audience: { kind: "game", gameId: "g1", eventName: "Monday Pairs" },
  method: "adminKey",
  seatedAs: [],
};
const failures: DirectorAlert = {
  id: "a2",
  at: "2026-11-20T19:43:00.000Z",
  kind: "repeatedFailures",
  audience: { kind: "settings" },
  failures: 3,
  blockedMinutes: 5,
  seatedAs: [],
};

describe("DirectorAlertsView", () => {
  it("shows nothing when there are no alerts", () => {
    render(<DirectorAlertsView alerts={[]} onDismiss={vi.fn()} />);
    expect(screen.queryByText(/Security alert/)).not.toBeInTheDocument();
  });

  it("shows one alert with its message", () => {
    render(<DirectorAlertsView alerts={[signedIn]} onDismiss={vi.fn()} />);
    expect(screen.getByText("Security alert")).toBeInTheDocument();
    expect(
      screen.getByText(/became a director of Monday Pairs using the admin key/),
    ).toBeInTheDocument();
  });

  it("stacks several alerts, styling failures as more serious", () => {
    render(
      <DirectorAlertsView alerts={[signedIn, failures]} onDismiss={vi.fn()} />,
    );
    expect(screen.getByText("Alerts (2)")).toBeInTheDocument();
    const cards = screen.getAllByTestId("director-alert");
    expect(cards).toHaveLength(2);
    expect(cards[0].className).toContain("amber");
    expect(cards[1].className).toContain("red");
  });

  it("dismisses one alert at a time", () => {
    const onDismiss = vi.fn();
    render(
      <DirectorAlertsView
        alerts={[signedIn, failures]}
        onDismiss={onDismiss}
      />,
    );
    fireEvent.click(screen.getAllByRole("button", { name: "Dismiss" })[1]);
    expect(onDismiss).toHaveBeenCalledWith("a2");
  });

  it("isn't closed by Escape: only Dismiss removes an alert", () => {
    const onDismiss = vi.fn();
    render(<DirectorAlertsView alerts={[signedIn]} onDismiss={onDismiss} />);
    fireEvent.keyDown(document.activeElement ?? document.body, {
      key: "Escape",
    });
    expect(screen.getByText("Security alert")).toBeInTheDocument();
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("leads a call with the table to go to", () => {
    const call: DirectorAlert = {
      id: "c1",
      at: "2026-11-20T19:44:00.000Z",
      kind: "callDirector",
      audience: { kind: "game", gameId: "g1", eventName: "Monday Pairs" },
      table: { section: null, tableNumber: 3, roundNumber: 2, side: "NS" },
      players: "Mary Smith & John Jones",
      calls: 1,
    };
    const { rerender } = render(
      <DirectorAlertsView alerts={[call]} onDismiss={vi.fn()} />,
    );
    expect(screen.getByText("Director called")).toBeInTheDocument();
    expect(screen.getByText("Go to Table 3, Round 2")).toBeInTheDocument();
    expect(screen.getByTestId("director-alert").className).toContain("blue");
    rerender(
      <DirectorAlertsView alerts={[call, signedIn]} onDismiss={vi.fn()} />,
    );
    expect(screen.getByText("Alerts (2)")).toBeInTheDocument();
  });
});
