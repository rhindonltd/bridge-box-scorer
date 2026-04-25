import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Button from "./Button";
import { describe, expect, it, vi } from "vitest";

describe("Button", () => {
  it("renders with value text", () => {
    render(<Button value="Click me" />);

    expect(
      screen.getByRole("button", { name: "Click me" }),
    ).toBeInTheDocument();
  });

  it("uses default props", () => {
    render(<Button value="Default" />);

    const button = screen.getByRole("button");

    expect(button).toHaveAttribute("type", "button");
    expect(button).not.toBeDisabled();

    expect(button).toHaveClass("text-white");
    expect(button).toHaveClass("bg-blue-600");
    expect(button).toHaveClass("hover:bg-blue-700");
  });

  it("applies custom className and styles", () => {
    render(
      <Button
        value="Styled"
        textColour="text-red-500"
        bgColour="bg-black"
        hoverColour="hover:bg-gray-800"
        className="extra-class"
      />,
    );

    const button = screen.getByRole("button");

    expect(button).toHaveClass("text-red-500");
    expect(button).toHaveClass("bg-black");
    expect(button).toHaveClass("hover:bg-gray-800");
    expect(button).toHaveClass("extra-class");
  });

  it("calls onClick when clicked", async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(<Button value="Click" onClick={handleClick} />);

    const button = screen.getByRole("button");
    await user.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("does not call onClick when disabled", async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(<Button value="Disabled" onClick={handleClick} disabled />);

    const button = screen.getByRole("button");
    await user.click(button);

    expect(handleClick).not.toHaveBeenCalled();
    expect(button).toBeDisabled();
  });

  it("supports different button types", () => {
    render(<Button value="Submit" type="submit" />);

    expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
  });
});
