import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  WifiSettingsForm,
  Network,
} from "@/app/settings/wifi/WifiSettingsForm";
import { describe, it, expect, vi } from "vitest";

const networks: Network[] = [
  { ssid: "Home WiFi", signal: 90 },
  { ssid: "CoffeeShop", signal: 60 },
];

describe("WifiSettingsForm UI", () => {
  it("enables Save & Apply after successful network test", async () => {
    const onTestConnection = vi.fn(async (ssid, _password) => {
      return ssid === "Home WiFi"; // simulate success for Home WiFi
    });

    const onSaveWifi = vi.fn();

    render(
      <WifiSettingsForm
        networks={networks}
        onTestConnection={onTestConnection}
        onSaveWifi={onSaveWifi}
      />,
    );

    // Open dropdown and select "Home WiFi"
    const dropdownButton = screen.getByRole("button", {
      name: /-- Select WiFi --/i,
    });
    await userEvent.click(dropdownButton);
    await userEvent.click(screen.getByText("Home WiFi"));

    // Enter password
    const passwordInput = screen.getByPlaceholderText("Enter WiFi password");
    await userEvent.type(passwordInput, "password123");

    // "Test Connection" should be enabled
    const testButton = screen.getByRole("button", { name: /Test Connection/i });
    expect(testButton).toBeEnabled();

    // "Save & Apply" should initially be disabled
    const saveButton = screen.getByRole("button", { name: /Save & Apply/i });
    expect(saveButton).toBeDisabled();

    // Click test
    await userEvent.click(testButton);

    // Wait for async test to complete
    expect(onTestConnection).toHaveBeenCalledWith("Home WiFi", "password123");

    // After successful test, Save & Apply should be enabled
    expect(saveButton).toBeEnabled();

    // Click Save & Apply
    await userEvent.click(saveButton);
    expect(onSaveWifi).toHaveBeenCalledWith("Home WiFi", "password123");
  });

  it("keeps Save disabled when the connection test fails", async () => {
    const onTestConnection = vi.fn(async () => false);

    render(
      <WifiSettingsForm networks={networks} onTestConnection={onTestConnection} />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: /-- Select WiFi --/i }),
    );
    await userEvent.click(screen.getByText("CoffeeShop"));

    await userEvent.click(
      screen.getByRole("button", { name: /Test Connection/i }),
    );

    expect(onTestConnection).toHaveBeenCalled();
    // Failed test -> testedSSID reset to null -> Save stays disabled.
    expect(screen.getByRole("button", { name: /Save & Apply/i })).toBeDisabled();
  });

  it("does nothing when testing with no network selected or no handler", async () => {
    const onTestConnection = vi.fn(async () => true);

    const { rerender } = render(
      <WifiSettingsForm networks={networks} onTestConnection={onTestConnection} />,
    );

    // No selection: Test Connection is disabled, and handler guards on selection.
    expect(
      screen.getByRole("button", { name: /Test Connection/i }),
    ).toBeDisabled();

    // Select a network but drop the onTestConnection handler.
    rerender(<WifiSettingsForm networks={networks} />);
    await userEvent.click(
      screen.getByRole("button", { name: /-- Select WiFi --/i }),
    );
    await userEvent.click(screen.getByText("Home WiFi"));
    await userEvent.click(
      screen.getByRole("button", { name: /Test Connection/i }),
    );
    // No handler -> nothing to assert other than no crash.
    expect(onTestConnection).not.toHaveBeenCalled();
  });

  it("guards save when there is no save handler despite a successful test", async () => {
    const onTestConnection = vi.fn(async () => true);

    render(
      <WifiSettingsForm networks={networks} onTestConnection={onTestConnection} />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: /-- Select WiFi --/i }),
    );
    await userEvent.click(screen.getByText("Home WiFi"));
    await userEvent.click(
      screen.getByRole("button", { name: /Test Connection/i }),
    );

    const saveButton = screen.getByRole("button", { name: /Save & Apply/i });
    expect(saveButton).toBeEnabled();
    // Clicking save with no onSaveWifi handler is a no-op (guard returns early).
    await userEvent.click(saveButton);
  });

  it("renders a status message and the testing/loading labels", () => {
    render(
      <WifiSettingsForm
        networks={networks}
        testing
        loading
        message="Applying changes"
      />,
    );

    expect(screen.getByText("Testing...")).toBeInTheDocument();
    expect(screen.getByText("Saving...")).toBeInTheDocument();
    expect(screen.getByText("Applying changes")).toBeInTheDocument();
  });
});
