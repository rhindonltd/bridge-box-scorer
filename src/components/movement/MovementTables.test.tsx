import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import MovementTables from "./MovementTables";

vi.mock("@/components/movement/MovementTable", () => ({
    default: ({ table }: any) => (
        <div data-testid="movement-table">{table.table}</div>
    ),
}));

describe("MovementTables", () => {
    const tablesMock = {
        tables: [
            { table: 1, rounds: [] },
            { table: 2, rounds: [] },
            { table: 3, rounds: [] },
        ],
    } as any;

    it("renders all tables", () => {
        render(<MovementTables tables={tablesMock} />);

        expect(screen.getAllByTestId("movement-table")).toHaveLength(3);
    });

    it("passes correct table numbers", () => {
        render(<MovementTables tables={tablesMock} />);

        expect(screen.getByText("1")).toBeInTheDocument();
        expect(screen.getByText("2")).toBeInTheDocument();
        expect(screen.getByText("3")).toBeInTheDocument();
    });

    it("renders empty state when no tables exist", () => {
        render(<MovementTables tables={{ tables: [] } as any} />);

        expect(
            screen.queryAllByTestId("movement-table")
        ).toHaveLength(0);
    });

    it("applies container spacing classes", () => {
        const { container } = render(
            <MovementTables tables={tablesMock} />
        );

        const root = container.firstChild as HTMLElement;

        expect(root).toHaveClass("p-6", "space-y-8");
    });
});
