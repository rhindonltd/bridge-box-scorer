import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

import SelectField from "./SelectField";

type Option = {
  label: string;
  value: string;
};

describe("SelectField", () => {
  const options: Option[] = [
    { label: "Admin", value: "admin" },
    { label: "User", value: "user" },
  ];

  it("renders label and options", () => {
    render(
      <SelectField
        label="Role"
        value="admin"
        options={options}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByText("Role")).toBeInTheDocument();

    expect(screen.getByRole("option", { name: "Admin" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "User" })).toBeInTheDocument();
  });

  it("sets the correct selected value", () => {
    render(
      <SelectField
        label="Role"
        value="user"
        options={options}
        onSelect={vi.fn()}
      />,
    );

    const select = screen.getByRole("combobox") as HTMLSelectElement;

    expect(select.value).toBe("user");
  });

  it("calls onSelect when a new option is chosen", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <SelectField
        label="Role"
        value="admin"
        options={options}
        onSelect={onSelect}
      />,
    );

    const select = screen.getByRole("combobox");

    await user.selectOptions(select, "user");

    expect(onSelect).toHaveBeenCalledWith("user");
  });

  it("renders option values correctly (label vs value separation)", () => {
    render(
      <SelectField
        label="Role"
        value="admin"
        options={options}
        onSelect={vi.fn()}
      />,
    );

    const adminOption = screen.getByRole("option", { name: "Admin" });

    expect(adminOption).toHaveValue("admin");
  });
});
