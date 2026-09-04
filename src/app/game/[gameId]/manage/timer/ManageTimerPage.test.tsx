import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("./TimerSetup", () => ({
  TimerSetup: () => <div data-testid="timer-setup" />,
}));

import ManageTimerPage from "./ManageTimerPage";

describe("ManageTimerPage", () => {
  it("renders the TimerSetup controls", () => {
    render(<ManageTimerPage />);
    expect(screen.getByTestId("timer-setup")).toBeInTheDocument();
  });
});
