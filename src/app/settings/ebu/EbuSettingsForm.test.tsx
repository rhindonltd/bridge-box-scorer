import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EbuSettingsForm } from "./EbuSettingsForm";

function setup(
  over: Partial<React.ComponentProps<typeof EbuSettingsForm>> = {},
) {
  const props = {
    clubName: "",
    ebuNumber: "",
    password: "",
    configured: false,
    saving: false,
    message: null as string | null,
    onClubNameChange: vi.fn(),
    onEbuNumberChange: vi.fn(),
    onPasswordChange: vi.fn(),
    onSave: vi.fn((e: React.FormEvent) => e.preventDefault()),
    onBack: vi.fn(),
    ...over,
  };
  render(<EbuSettingsForm {...props} />);
  return props;
}

describe("EbuSettingsForm", () => {
  it("reports edits and saves", () => {
    const p = setup();
    fireEvent.change(screen.getByLabelText("Club Name"), {
      target: { value: "Anytown BC" },
    });
    fireEvent.change(screen.getByLabelText("EBU Club Number"), {
      target: { value: "123" },
    });
    expect(p.onClubNameChange).toHaveBeenCalledWith("Anytown BC");
    fireEvent.change(screen.getByLabelText("EBU Password"), {
      target: { value: "pw" },
    });
    expect(p.onEbuNumberChange).toHaveBeenCalledWith("123");
    expect(p.onPasswordChange).toHaveBeenCalledWith("pw");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(p.onSave).toHaveBeenCalled();
  });

  it("goes back from the header", () => {
    const p = setup();
    fireEvent.click(screen.getByRole("button", { name: "Go back" }));
    expect(p.onBack).toHaveBeenCalled();
  });

  it("shows the club name and number fields first, prefilled", () => {
    setup({ clubName: "Anytown BC", ebuNumber: "1234" });
    expect(screen.getByLabelText("Club Name")).toHaveValue("Anytown BC");
    expect(screen.getByLabelText("EBU Club Number")).toHaveValue("1234");
  });

  it("explains the password is only needed for EBU submission when not configured", () => {
    setup();
    expect(screen.getByPlaceholderText("Enter password")).toBeInTheDocument();
    expect(screen.getByLabelText("EBU Password")).toHaveAccessibleDescription(
      /Only needed to submit results to the EBU/,
    );
    expect(screen.queryByText(/A password is saved/)).not.toBeInTheDocument();
  });

  it("offers to keep the saved password when configured", () => {
    setup({ configured: true });
    expect(
      screen.getByPlaceholderText("•••••••• (leave blank to keep)"),
    ).toBeInTheDocument();
    expect(screen.getByText(/A password is saved/)).toBeInTheDocument();
  });

  it("disables Save while saving", () => {
    setup({ saving: true });
    expect(screen.getByRole("button", { name: "Saving..." })).toBeDisabled();
  });

  it("styles success and error messages", () => {
    const { unmount } = render(
      <EbuSettingsForm
        clubName=""
        ebuNumber=""
        password=""
        configured={false}
        saving={false}
        message="✅ EBU settings saved"
        onClubNameChange={vi.fn()}
        onEbuNumberChange={vi.fn()}
        onPasswordChange={vi.fn()}
        onSave={vi.fn()}
        onBack={vi.fn()}
      />,
    );
    expect(screen.getByText("✅ EBU settings saved")).toHaveClass(
      "text-green-700",
    );
    unmount();
    setup({ message: "Network error" });
    expect(screen.getByText("Network error")).toHaveClass("text-red-600");
  });
});
