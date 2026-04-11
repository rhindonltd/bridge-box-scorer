import { render, screen } from "@testing-library/react";
import PlayerCard from "./PlayerCard";
import { describe, it, expect } from "vitest";

describe("PlayerCard", () => {
    it("renders label correctly", () => {
        render(<PlayerCard label="North" player={undefined} />);

        expect(screen.getByText("North")).toBeInTheDocument();
    });

    it("renders 'No Player' when player is missing", () => {
        render(<PlayerCard label="South" player={undefined} />);

        expect(screen.getByText("No")).toBeInTheDocument();
        expect(screen.getByText("Player")).toBeInTheDocument();
    });

    it("renders player name when player is provided", () => {
        render(
            <PlayerCard
                label="East"
                player={{ firstName: "Alice", lastName: "Smith" }}
            />
        );

        expect(screen.getByText("Alice")).toBeInTheDocument();
        expect(screen.getByText("Smith")).toBeInTheDocument();
    });

    it("applies inactive styles when no player", () => {
        render(<PlayerCard label="West" player={undefined} />);

        const container = screen.getByText("No").parentElement;

        expect(container).toHaveClass("bg-gray-100");
        expect(container).toHaveClass("text-gray-400");
        expect(container).toHaveClass("opacity-50");
        expect(container).toHaveClass("cursor-not-allowed");
    });

    it("applies active styles when player exists", () => {
        render(
            <PlayerCard
                label="North"
                player={{ firstName: "John", lastName: "Doe" }}
            />
        );

        const container = screen.getByText("John").parentElement;

        expect(container).toHaveClass("bg-white");
        expect(container).toHaveClass("text-gray-900");
    });

    it("renders full structure correctly", () => {
        render(
            <PlayerCard
                label="Test"
                player={{ firstName: "A", lastName: "B" }}
            />
        );

        expect(screen.getByText("Test")).toHaveClass("text-sm");
        expect(screen.getByText("A")).toBeInTheDocument();
        expect(screen.getByText("B")).toBeInTheDocument();
    });
});
