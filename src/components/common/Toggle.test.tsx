import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Toggle } from "./Toggle";
import { describe, it, expect, vi } from "vitest";

describe("Toggle", () => {
    it("renders both labels", () => {
        render(
            <Toggle
                value={false}
                offLabel="Off"
                onLabel="On"
                onSwitch={vi.fn()}
            />
        );

        expect(screen.getByText("Off")).toBeInTheDocument();
        expect(screen.getByText("On")).toBeInTheDocument();
    });

    it("highlights off state when value is false", () => {
        render(
            <Toggle
                value={false}
                offLabel="Off"
                onLabel="On"
                onSwitch={vi.fn()}
            />
        );

        const offButton = screen.getByRole("button", { name: "Off" });
        const onButton = screen.getByRole("button", { name: "On" });

        expect(offButton).toHaveClass("bg-white");
        expect(onButton).not.toHaveClass("bg-white");
    });

    it("highlights on state when value is true", () => {
        render(
            <Toggle
                value={true}
                offLabel="Off"
                onLabel="On"
                onSwitch={vi.fn()}
            />
        );

        const offButton = screen.getByRole("button", { name: "Off" });
        const onButton = screen.getByRole("button", { name: "On" });

        expect(onButton).toHaveClass("bg-white");
        expect(offButton).not.toHaveClass("bg-white");
    });

    it("calls onSwitch when clicking off button", async () => {
        const user = userEvent.setup();
        const onSwitch = vi.fn();

        render(
            <Toggle
                value={true}
                offLabel="Off"
                onLabel="On"
                onSwitch={onSwitch}
            />
        );

        await user.click(screen.getByRole("button", { name: "Off" }));

        expect(onSwitch).toHaveBeenCalledTimes(1);
    });

    it("calls onSwitch when clicking on button", async () => {
        const user = userEvent.setup();
        const onSwitch = vi.fn();

        render(
            <Toggle
                value={false}
                offLabel="Off"
                onLabel="On"
                onSwitch={onSwitch}
            />
        );

        await user.click(screen.getByRole("button", { name: "On" }));

        expect(onSwitch).toHaveBeenCalledTimes(1);
    });

    it("calls onSwitch regardless of current state", async () => {
        const user = userEvent.setup();
        const onSwitch = vi.fn();

        render(
            <Toggle
                value={false}
                offLabel="No"
                onLabel="Yes"
                onSwitch={onSwitch}
            />
        );

        await user.click(screen.getByRole("button", { name: "No" }));
        await user.click(screen.getByRole("button", { name: "Yes" }));

        expect(onSwitch).toHaveBeenCalledTimes(2);
    });
});
