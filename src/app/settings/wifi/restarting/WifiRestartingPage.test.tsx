import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { WifiRestartingPage } from "./WifiRestartingPage";

describe("WifiRestartingPage", () => {
  it("renders the status and reconnect countdown", () => {
    render(<WifiRestartingPage seconds={7} status="Restarting WiFi" />);

    expect(
      screen.getByRole("heading", { name: "Restarting WiFi" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Reconnecting in 7s...")).toBeInTheDocument();
    expect(
      screen.getByText("If disconnected, reconnect to BridgeBox WiFi"),
    ).toBeInTheDocument();
  });

  it("hides the back arrow (transient screen the user must keep open)", () => {
    render(<WifiRestartingPage seconds={7} status="Restarting WiFi" />);
    expect(screen.queryByLabelText("Go back")).not.toBeInTheDocument();
  });
});
