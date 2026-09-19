import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { WifiUnavailablePage } from "./WifiUnavailablePage";

describe("WifiUnavailablePage", () => {
  it("explains that WiFi cannot be changed on this device", () => {
    render(<WifiUnavailablePage />);

    expect(
      screen.getByText("WiFi settings can't be changed on this device"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("wifi-unavailable")).toHaveTextContent(
      "This device does not support changing WiFi settings from the app.",
    );
  });
});
