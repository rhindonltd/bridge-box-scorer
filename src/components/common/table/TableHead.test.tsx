import { render, screen } from "@testing-library/react";
import { TableHead } from "./TableHead";
import { describe, expect, it } from "vitest";

describe("TableHead", () => {
    it("renders all column headers", () => {
        const columns = ["Name", "Age", "Score"];

        render(
            <table>
                <TableHead columns={columns} />
            </table>
        );

        columns.forEach((col) => {
            expect(screen.getByText(col)).toBeInTheDocument();
        });
    });

        it("renders the correct number of column headers", () => {
        const columns = ["A", "B", "C"];

        render(
            <table>
                <TableHead columns={columns} />
            </table>
        );

        const headers = screen.getAllByRole("columnheader");
        expect(headers).toHaveLength(columns.length);
    });

    it("renders a table head section", () => {
        render(
            <table>
                <TableHead columns={["Test"]} />
            </table>
        );

        const thead = screen.getByRole("rowgroup"); // thead role
        expect(thead).toBeInTheDocument();
    });

    it("renders headers inside a row", () => {
        render(
            <table>
                <TableHead columns={["Col1", "Col2"]} />
            </table>
        );

        const rows = screen.getAllByRole("row");
        expect(rows).toHaveLength(1);
    });

    it("handles empty columns array", () => {
        render(
            <table>
                <TableHead columns={[]} />
            </table>
        );

        const headers = screen.queryAllByRole("columnheader");
        expect(headers).toHaveLength(0);
    });
});
