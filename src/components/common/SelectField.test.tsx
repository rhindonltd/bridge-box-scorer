import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SelectField from "./SelectField";
import { describe, expect, it, vi } from "vitest";

describe("SelectField", () => {
    it("renders label", () => {
        render(
            <SelectField
                label="Choose option"
                value="A"
                options={["A", "B"]}
                onSelect={vi.fn()}
            />
        );

        expect(screen.getByText("Choose option")).toBeInTheDocument();
    });

    it("renders all options", () => {
        const options = ["A", "B", "C"];

        render(
            <SelectField
                label="Options"
                value="A"
                options={options}
                onSelect={vi.fn()}
            />
        );

        options.forEach((opt) => {
            expect(screen.getByRole("option", { name: opt })).toBeInTheDocument();
        });
    });

    it("sets the selected value", () => {
        render(
            <SelectField
                label="Options"
                value="B"
                options={["A", "B", "C"]}
                onSelect={vi.fn()}
            />
        );

        const select = screen.getByRole("combobox") as HTMLSelectElement;
        expect(select.value).toBe("B");
    });

    it("calls onSelect when value changes", async () => {
        const user = userEvent.setup();
        const onSelect = vi.fn();

        render(
            <SelectField
                label="Options"
                value="A"
                options={["A", "B", "C"]}
                onSelect={onSelect}
            />
        );

        const select = screen.getByRole("combobox");

        await user.selectOptions(select, "B");

        expect(onSelect).toHaveBeenCalledWith("B");
    });

    it("works with number options", async () => {
        const user = userEvent.setup();
        const onSelect = vi.fn();

        render(
            <SelectField
                label="Numbers"
                value={1}
                options={[1, 2, 3]}
                onSelect={onSelect}
            />
        );

        const select = screen.getByRole("combobox");

        await user.selectOptions(select, "2");

        // ⚠️ value comes from DOM as string
        expect(onSelect).toHaveBeenCalledWith("2");
    });

    it("renders without a value (uncontrolled initial)", () => {
        render(
            <SelectField
                label="Options"
                options={["A", "B"]}
                onSelect={vi.fn()}
            />
        );

        const select = screen.getByRole("combobox");
        expect(select).toBeInTheDocument();
    });
});
