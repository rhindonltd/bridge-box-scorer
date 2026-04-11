import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToggleButton } from "./ToggleButton";
import { describe, it, expect, vi } from "vitest";

describe("ToggleButton", () => {
    it("renders children", () => {
        render(<ToggleButton>Click Me</ToggleButton>);

        expect(screen.getByText("Click Me")).toBeInTheDocument();
    });

    it("applies active styles when active is true", () => {
        render(<ToggleButton active>Active</ToggleButton>);

        const button = screen.getByRole("button");

        expect(button).toHaveClass("bg-blue-600");
        expect(button).toHaveClass("text-white");
    });

    it("applies inactive styles when active is false", () => {
        render(<ToggleButton active={false}>Inactive</ToggleButton>);

        const button = screen.getByRole("button");

        expect(button).toHaveClass("bg-white");
        expect(button).toHaveClass("text-black");
    });

    it("calls onClick when clicked", async () => {
        const user = userEvent.setup();
        const handleClick = vi.fn();

        render(
            <ToggleButton onClick={handleClick}>
                Click
            </ToggleButton>
        );

        await user.click(screen.getByRole("button"));

        expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("applies full width when fullWidth is true", () => {
        render(<ToggleButton fullWidth>Full</ToggleButton>);

        const button = screen.getByRole("button");

        expect(button).toHaveStyle({ width: "100%" });
    });

    it("does not apply width when fullWidth is false", () => {
        render(<ToggleButton fullWidth={false}>Normal</ToggleButton>);

        const button = screen.getByRole("button");

        expect(button.style.width).toBe("");
    });

    it("applies flex style when provided", () => {
        render(<ToggleButton flex={2}>Flex</ToggleButton>);

        const button = screen.getByRole("button");

        expect(button).toHaveStyle({ flex: "2" });
    });

    it("does not apply flex style when flex is 0", () => {
        render(<ToggleButton flex={0}>No Flex</ToggleButton>);

        const button = screen.getByRole("button");

        expect(button.style.flex).toBe("");
    });
});
