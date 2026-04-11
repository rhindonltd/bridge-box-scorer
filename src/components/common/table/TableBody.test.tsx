import { render, screen } from "@testing-library/react";
import { TableBody } from "./TableBody";
import { describe, expect, it } from "vitest";

describe("TableBody", () => {
    it("renders the tbody element", () => {
        render(
            <table>
                <TableBody body={<tr><td>Cell</td></tr>} />
            </table>
        );

        const tbody = screen.getByRole("rowgroup"); // tbody role
        expect(tbody).toBeInTheDocument();
    });

    it("renders the provided body content", () => {
        render(
            <table>
                <TableBody
                    body={
                        <tr>
                            <td>Test Content</td>
                        </tr>
                    }
                />
            </table>
        );

        expect(screen.getByText("Test Content")).toBeInTheDocument();
    });

    it("renders multiple rows correctly", () => {
        render(
            <table>
                <TableBody
                    body={
                        <>
                            <tr><td>Row 1</td></tr>
                            <tr><td>Row 2</td></tr>
                        </>
                    }
                />
            </table>
        );

        expect(screen.getByText("Row 1")).toBeInTheDocument();
        expect(screen.getByText("Row 2")).toBeInTheDocument();
    });
});
