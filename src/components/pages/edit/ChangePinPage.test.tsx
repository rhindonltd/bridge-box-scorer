import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ChangePinPage } from "./ChangePinPage";

vi.mock("@/components/common/GameInfo", () => ({
  GameInfo: () => <div data-testid="game-info" />,
}));

describe("ChangePinPage", () => {
  it("renders GameInfo", () => {
    render(<ChangePinPage directorPin={1234} onChangePin={vi.fn()} />);
    expect(screen.getByTestId("game-info")).toBeInTheDocument();
  });

  it("displays director PIN", () => {
    render(<ChangePinPage directorPin={9999} onChangePin={vi.fn()} />);
    expect(screen.getByText("Director PIN:")).toBeInTheDocument();
    expect(screen.getByText("9999")).toBeInTheDocument();
  });

  it("renders Change PIN button", () => {
    render(<ChangePinPage directorPin={1234} onChangePin={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: "Change PIN" }),
    ).toBeInTheDocument();
  });

  it("calls onChangePin when button is clicked", () => {
    const fn = vi.fn();
    render(<ChangePinPage directorPin={1234} onChangePin={fn} />);
    fireEvent.click(screen.getByRole("button", { name: "Change PIN" }));
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("applies correct layout classes", () => {
    const { container } = render(
      <ChangePinPage directorPin={1234} onChangePin={vi.fn()} />,
    );
    const root = container.firstChild as HTMLElement;
    expect(root).toHaveClass("flex-1", "flex", "flex-col");
  });

  it("button has correct styling", () => {
    render(<ChangePinPage directorPin={1234} onChangePin={vi.fn()} />);
    const button = screen.getByRole("button", { name: "Change PIN" });
    expect(button).toHaveClass(
      "w-full",
      "mt-3",
      "p-3",
      "text-lg",
      "bg-green-700",
      "text-white",
      "rounded-xl",
    );
  });
});
