import { render, screen } from "@testing-library/react";
import {describe, expect, it, vi } from "vitest";
import CardTable from "./CardTable";

/**
 * Mock PlayerCard
 */
vi.mock("@/components/common/PlayerCard", () => ({
    default: ({ label, player }: any) => (
        <div data-testid={`player-${label.toLowerCase()}`}>
            {label}: {player?.firstName ?? "Empty"}
        </div>
    ),
}));

/**
 * Mock TableCompassLayout to just render slots
 */
vi.mock("@/components/layout/TableCompassLayout", () => ({
    default: ({ north, south, east, west, center }: any) => (
        <div>
            <div data-testid="north">{north}</div>
            <div data-testid="south">{south}</div>
            <div data-testid="east">{east}</div>
            <div data-testid="west">{west}</div>
            <div data-testid="center">{center}</div>
        </div>
    ),
}));

describe("CardTable", () => {
    const players = {
        N: { firstName: "Alice", lastName: "North" },
        S: { firstName: "Bob", lastName: "South" },
        E: { firstName: "Carol", lastName: "East" },
        W: { firstName: "Dan", lastName: "West" },
    };

    it("renders table number in center", () => {
        render(<CardTable players={players} tableNumber={12} />);

        expect(screen.getByText("Table")).toBeInTheDocument();
        expect(screen.getByText("12")).toBeInTheDocument();
    });

    it("passes correct players to PlayerCard slots", () => {
        render(<CardTable players={players} tableNumber={1} />);

        expect(screen.getByTestId("player-north")).toHaveTextContent("Alice");
        expect(screen.getByTestId("player-south")).toHaveTextContent("Bob");
        expect(screen.getByTestId("player-east")).toHaveTextContent("Carol");
        expect(screen.getByTestId("player-west")).toHaveTextContent("Dan");
    });

    it("handles missing players gracefully", () => {
        render(<CardTable players={{}} tableNumber={99} />);

        expect(screen.getByTestId("player-north")).toHaveTextContent("Empty");
        expect(screen.getByTestId("player-south")).toHaveTextContent("Empty");
        expect(screen.getByTestId("player-east")).toHaveTextContent("Empty");
        expect(screen.getByTestId("player-west")).toHaveTextContent("Empty");
    });

    it("renders correct table number styling content", () => {
        render(<CardTable players={players} tableNumber={7} />);

        const tableNumber = screen.getByText("7");
        expect(tableNumber).toHaveClass("text-xl");
        expect(tableNumber).toHaveClass("font-bold");
    });
});
