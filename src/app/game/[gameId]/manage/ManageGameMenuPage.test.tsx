import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@/components/layout/GamePageLayout", () => ({
  GamePageLayout: ({
    headerTitle,
    children,
  }: {
    headerTitle: string;
    children: React.ReactNode;
  }) => (
    <div>
      <h1>{headerTitle}</h1>
      {children}
    </div>
  ),
}));

import { ManageGameMenuPage } from "./ManageGameMenuPage";

describe("ManageGameMenuPage", () => {
  const handlers = {
    onSetUpGameClick: vi.fn(),
    onTravellersClick: vi.fn(),
    onMovementClick: vi.fn(),
    onShareDirectorAccessClick: vi.fn(),
    onDownloadUsebioClick: vi.fn(),
    onDeleteGameClick: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders all menu buttons and wires their handlers", () => {
    render(<ManageGameMenuPage {...handlers} />);

    expect(
      screen.getByRole("heading", { name: "Manage Game Menu" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Set Up Game" }));
    expect(handlers.onSetUpGameClick).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Travellers" }));
    expect(handlers.onTravellersClick).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Movement" }));
    expect(handlers.onMovementClick).toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole("button", { name: "Share Director Access" }),
    );
    expect(handlers.onShareDirectorAccessClick).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Download USEBIO" }));
    expect(handlers.onDownloadUsebioClick).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Delete Game" }));
    expect(handlers.onDeleteGameClick).toHaveBeenCalled();
  });
});
