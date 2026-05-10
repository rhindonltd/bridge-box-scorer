import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import MovementRound from "./MovementRound";

// Mock formatter so tests are deterministic
vi.mock("@/movement/shared", () => ({
    formatBoards: vi.fn((boards: number[]) => boards.join(",")),
}));

describe("MovementRound", () => {
    const roundMock = {
        round: 1,
        tables: [
            {
                table: 1,
                participants: { nsId: "A", ewId: "B" },
                boards: [1, 2],
            },
            {
                table: 2,
                participants: { nsId: "C", ewId: "D" },
                boards: [3, 4],
            },
        ],
    } as any;

    it("renders round title", () => {
        render(<MovementRound round={roundMock} />);

        expect(screen.getByText("Round 1")).toBeInTheDocument();
    });

    it("renders table headers", () => {
        render(<MovementRound round={roundMock} />);

        expect(screen.getByText("Table")).toBeInTheDocument();
        expect(screen.getByText("NS")).toBeInTheDocument();
        expect(screen.getByText("EW")).toBeInTheDocument();
        expect(screen.getByText("Boards")).toBeInTheDocument();
    });

    it("renders all table rows", () => {
        render(<MovementRound round={roundMock} />);

        expect(screen.getByText("1")).toBeInTheDocument();
        expect(screen.getByText("2")).toBeInTheDocument();
    });

    it("renders participant IDs", () => {
        render(<MovementRound round={roundMock} />);

        expect(screen.getByText("A")).toBeInTheDocument();
        expect(screen.getByText("B")).toBeInTheDocument();
        expect(screen.getByText("C")).toBeInTheDocument();
        expect(screen.getByText("D")).toBeInTheDocument();
    });

    it("calls formatBoards for each row", async () => {
        const { formatBoards } = await import("@/movement/shared");

        render(<MovementRound round={roundMock} />);

        expect(formatBoards).toHaveBeenCalledWith([1, 2]);
        expect(formatBoards).toHaveBeenCalledWith([3, 4]);
    });

    it("renders formatted boards output", () => {
        render(<MovementRound round={roundMock} />);

        expect(screen.getByText("1,2")).toBeInTheDocument();
        expect(screen.getByText("3,4")).toBeInTheDocument();
    });

    it("applies table structure", () => {
        const { container } = render(
            <MovementRound round={roundMock} />
        );

        expect(container.querySelector("table")).toBeInTheDocument();
        expect(container.querySelector("thead")).toBeInTheDocument();
        expect(container.querySelector("tbody")).toBeInTheDocument();
    });

    it("applies container styling classes", () => {
        const { container } = render(
            <MovementRound round={roundMock} />
        );

        expect(container.firstChild).toHaveClass(
            "w-full",
            "border",
            "rounded-lg",
            "shadow-md",
            "overflow-hidden"
        );
    });
});
