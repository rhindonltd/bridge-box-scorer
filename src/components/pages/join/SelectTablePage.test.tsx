import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SelectTablePage } from "./SelectTablePage";

// Mock dependencies to isolate this page
vi.mock("@/components/common/SectionInfo", () => ({
    SectionInfo: () => <div data-testid="section-info" />,
}));

vi.mock("@/components/join/SelectTable", () => ({
    default: ({ tables, selectTable, assigned }: any) => (
        <div data-testid="select-table">
            Tables: {tables} | Assigned: {assigned.length}
            <button onClick={() => selectTable(1, "NS")}>
                Select Table
            </button>
        </div>
    ),
}));

describe("SelectTablePage", () => {
    const baseProps = {
        tables: 5,
        selectTable: vi.fn(),
        assigned: [
            { table: 1, direction: "NS" as const },
        ],
    };

    it("renders SectionInfo", () => {
        render(<SelectTablePage {...baseProps} />);

        expect(screen.getByTestId("section-info")).toBeInTheDocument();
    });

    it("renders SelectTable component", () => {
        render(<SelectTablePage {...baseProps} />);

        expect(screen.getByTestId("select-table")).toBeInTheDocument();
    });

    it("passes tables prop correctly", () => {
        render(<SelectTablePage {...baseProps} tables={10} />);

        expect(screen.getByText(/Tables: 10/)).toBeInTheDocument();
    });

    it("passes assigned data correctly", () => {
        render(<SelectTablePage {...baseProps} />);

        expect(screen.getByText(/Assigned: 1/)).toBeInTheDocument();
    });

    it("calls selectTable from child", () => {
        const fn = vi.fn();

        render(<SelectTablePage {...baseProps} selectTable={fn} />);

        screen.getByText("Select Table").click();

        expect(fn).toHaveBeenCalledWith(1, "NS");
    });

    it("applies page layout styles", () => {
        const { container } = render(
            <SelectTablePage {...baseProps} />
        );

        const root = container.firstChild as HTMLElement;

        expect(root).toHaveClass(
            "h-screen",
            "flex",
            "flex-col",
            "bg-gray-100"
        );
    });
});
