import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { OddRoundOptionInfo } from "./OddRoundOptionInfo";

describe("OddRoundOptionInfo", () => {
  it("shows the option name with an info button and no dialog", () => {
    render(
      <OddRoundOptionInfo option="Bye">
        <p>One pair sits out.</p>
      </OddRoundOptionInfo>,
    );

    expect(screen.getByText("Bye")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "What does Bye mean?" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens a dialog explaining the option, and OK closes it", async () => {
    render(
      <OddRoundOptionInfo option="Bye">
        <p>One pair sits out.</p>
      </OddRoundOptionInfo>,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "What does Bye mean?" }),
    );

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("Bye");
    expect(dialog).toHaveTextContent("One pair sits out.");

    fireEvent.click(screen.getByRole("button", { name: "OK" }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
  });
});
