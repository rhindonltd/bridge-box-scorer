import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

// Stub the dialog body so the test never mints a transfer code (no socket).
vi.mock("./ChangeDeviceView", () => ({
  ChangeDeviceView: () => <div data-testid="change-device-view" />,
}));

import { ChangeDeviceButton } from "./ChangeDeviceButton";

describe("ChangeDeviceButton", () => {
  describe("uncontrolled", () => {
    it("opens the dialog when the icon trigger is clicked", async () => {
      const user = userEvent.setup();
      render(<ChangeDeviceButton gameId="g1" seat="A1NS" variant="icon" />);

      expect(screen.queryByTestId("change-device-view")).toBeNull();
      await user.click(screen.getByRole("button", { name: "Change device" }));
      expect(screen.getByTestId("change-device-view")).toBeInTheDocument();
    });

    it("opens the dialog when the button trigger is clicked", async () => {
      const user = userEvent.setup();
      render(<ChangeDeviceButton gameId="g1" seat="A1NS" variant="button" />);

      await user.click(screen.getByRole("button", { name: "Change device" }));
      expect(screen.getByTestId("change-device-view")).toBeInTheDocument();
    });

    it("closes the dialog on Escape (dialog onClose -> internal state)", async () => {
      const user = userEvent.setup();
      render(<ChangeDeviceButton gameId="g1" seat="A1NS" variant="icon" />);

      await user.click(screen.getByRole("button", { name: "Change device" }));
      expect(screen.getByTestId("change-device-view")).toBeInTheDocument();

      // Escape triggers the Dialog's own onClose, which flips the uncontrolled
      // internal open state back to false.
      await user.keyboard("{Escape}");
      expect(screen.queryByTestId("change-device-view")).toBeNull();
    });
  });

  describe("controlled", () => {
    it("shows the dialog when open is true and hides it when false", () => {
      const { rerender } = render(
        <ChangeDeviceButton
          gameId="g1"
          seat="A1NS"
          variant="none"
          open={false}
          onOpenChange={vi.fn()}
        />,
      );

      expect(screen.queryByTestId("change-device-view")).toBeNull();

      rerender(
        <ChangeDeviceButton
          gameId="g1"
          seat="A1NS"
          variant="none"
          open={true}
          onOpenChange={vi.fn()}
        />,
      );

      expect(screen.getByTestId("change-device-view")).toBeInTheDocument();
    });

    it("calls onOpenChange(false) when the dialog is dismissed", async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      render(
        <ChangeDeviceButton
          gameId="g1"
          seat="A1NS"
          variant="none"
          open={true}
          onOpenChange={onOpenChange}
        />,
      );

      // The "Done" button closes the dialog.
      await user.click(screen.getByRole("button", { name: "Done" }));
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe('variant="none"', () => {
    it("renders no trigger button", () => {
      render(
        <ChangeDeviceButton
          gameId="g1"
          seat="A1NS"
          variant="none"
          open={false}
          onOpenChange={vi.fn()}
        />,
      );

      expect(
        screen.queryByRole("button", { name: "Change device" }),
      ).toBeNull();
    });
  });
});
