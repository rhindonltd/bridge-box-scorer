import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AwaitingMovement } from "./AwaitingMovement";

describe("AwaitingMovement", () => {
    it("renders awaiting text", () => {
        render(<AwaitingMovement />);

        expect(
            screen.getByText("Awaiting movement...")
        ).toBeInTheDocument();
    });

    it("applies layout classes", () => {
        const { container } = render(<AwaitingMovement />);

        const wrapper = container.firstChild as HTMLElement;

        expect(wrapper).toHaveClass(
            "flex",
            "items-center",
            "justify-center",
            "min-h-screen"
        );
    });
});
