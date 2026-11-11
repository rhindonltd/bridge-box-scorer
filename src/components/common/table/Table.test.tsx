import { render, screen } from "@testing-library/react";
import { Table } from "./Table";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/common/table/TableHead", () => ({
  TableHead: ({ columns }: { columns: string[] }) => (
    <thead>
      <tr>
        {columns.map((col) => (
          <th key={col}>{col}</th>
        ))}
      </tr>
    </thead>
  ),
}));

vi.mock("@/components/common/table/TableBody", () => ({
  TableBody: ({ body }: { body: React.ReactNode }) => <tbody>{body}</tbody>,
}));

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
      />,
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
      />,
    );

    expect(screen.getByText("Jane")).toBeInTheDocument();
  });
  it("lets an ancestor scroll when scroll is false", () => {
    const { container } = render(
      <Table
        columns={["Name"]}
        scroll={false}
        body={
          <tr>
            <td>Jane</td>
          </tr>
        }
      />,
    );
    expect(container.querySelector(".overflow-visible")).not.toBeNull();
    expect(container.querySelector(".overflow-auto")).toBeNull();
    expect(container.firstElementChild?.className).not.toContain("mt-2");
  });
});
