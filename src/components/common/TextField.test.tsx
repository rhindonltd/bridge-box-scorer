import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TextField from "./TextField";
import { describe, it, expect, vi } from "vitest";

describe("TextField", () => {
  it("renders label", () => {
    render(<TextField label="Name" value="" onChange={vi.fn()} />);

    expect(screen.getByText("Name")).toBeInTheDocument();
  });

  it("renders input with correct value", () => {
    render(<TextField label="Name" value="Alice" onChange={vi.fn()} />);

    const input = screen.getByRole("textbox") as HTMLInputElement;
    expect(input.value).toBe("Alice");
  });

  it("uses label as placeholder", () => {
    render(<TextField label="Email" value="" onChange={vi.fn()} />);

    expect(screen.getByPlaceholderText("Email")).toBeInTheDocument();
  });

  it("calls onChange when typing", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<TextField label="Name" value="" onChange={onChange} />);

    const input = screen.getByRole("textbox");

    await user.type(input, "A");

    expect(onChange).toHaveBeenCalledWith("A");
  });

  it("calls onChange for each typed character", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<TextField label="Name" value="" onChange={onChange} />);

    const input = screen.getByRole("textbox");

    await user.type(input, "Bob");

    expect(onChange).toHaveBeenCalledTimes(3);
    expect(onChange).toHaveBeenNthCalledWith(1, "B");
    expect(onChange).toHaveBeenNthCalledWith(2, "o");
    expect(onChange).toHaveBeenNthCalledWith(3, "b");
  });

  it("renders correct input type", () => {
    render(<TextField label="Test" value="" onChange={vi.fn()} />);

    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("type", "text");
  });
});
