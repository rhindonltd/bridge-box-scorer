import { render, screen } from "@testing-library/react";
import { Table } from "./Table";
import { describe, expect, it } from "vitest";

describe("Table", () => {
    it("renders column headers", () => {
        render(
            <Table
                columns={["Name", "Age"]}
                body={
                    <tr>
                        <td>John</td>
                        <td>30</td>
                    </tr>
                }
            />
        );

        expect(screen.getByText("Name")).toBeInTheDocument();
        expect(screen.getByText("Age")).toBeInTheDocument();
    });

    it("renders body content", () => {
        render(
            <Table
                columns={["Name"]}
                body={
                    <tr>
                        <td>Jane</td>
                    </tr>
                }
            />
        );

        expect(screen.getByText("Jane")).toBeInTheDocument();
    });
});
