import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SubmitButton from "./SubmitButton";

describe("SubmitButton", () => {
    it("renders button text", () => {
        render(<SubmitButton onSubmit={vi.fn()} />);

        expect(
            screen.getByRole("button", { name: "OK" })
        ).toBeInTheDocument();
    });

    it("applies expected classes", () => {
        render(<SubmitButton onSubmit={vi.fn()} />);

        const button = screen.getByRole("button", {
            name: "OK",
        });

        expect(button).toHaveClass(
            "w-full",
            "p-2",
            "text-lg",
            "bg-green-700",
            "text-white",
            "rounded-xl"
        );
    });

    it("calls onSubmit when submit event is fired", () => {
        const fn = vi.fn();

        render(<SubmitButton onSubmit={fn} />);

        const button = screen.getByRole("button", {
            name: "OK",
        });

        fireEvent.submit(button);

        expect(fn).toHaveBeenCalledTimes(1);
    });
});
