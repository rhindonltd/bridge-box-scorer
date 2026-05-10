import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Header from "./Header";

describe("Header", () => {
    it("renders contract with empty result when result is null", () => {
        render(<Header contract="4♠" result={null} />);

        expect(screen.getByText("4♠")).toBeInTheDocument();
    });

    it("renders '=' when result is 0", () => {
        render(<Header contract="3NT" result={0} />);

        expect(screen.getByText("3NT =")).toBeInTheDocument();
    });

    it("renders positive result with '+' prefix", () => {
        render(<Header contract="4♥" result={2} />);

        expect(screen.getByText("4♥ +2")).toBeInTheDocument();
    });

    it("renders negative result normally", () => {
        render(<Header contract="5♦" result={-1} />);

        expect(screen.getByText("5♦ -1")).toBeInTheDocument();
    });

    // it("renders null contract", () => {
    //     render(<Header contract={null} result={1} />);
    //
    //     expect(screen.getByText(" +1")).toBeInTheDocument();
    // });

    it("applies expected styling classes", () => {
        const { container } = render(
            <Header contract="4♠" result={0} />
        );

        expect(container.firstChild).toHaveClass(
            "text-center",
            "mb-2"
        );

        expect(container.querySelector(".text-2xl")).toBeInTheDocument();
    });
});
