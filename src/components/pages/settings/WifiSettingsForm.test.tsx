import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WifiSettingsForm, Network } from "./WifiSettingsForm";
import { describe, it, expect, vi } from "vitest";

const networks: Network[] = [
    { ssid: "Home WiFi", signal: 90 },
    { ssid: "CoffeeShop", signal: 60 },
];

describe("WifiSettingsForm UI", () => {
    it("enables Save & Apply after successful network test", async () => {
        const onTestConnection = vi.fn(async (ssid, password) => {
            return ssid === "Home WiFi"; // simulate success for Home WiFi
        });

        const onSaveWifi = vi.fn();

        render(
            <WifiSettingsForm
                networks={networks}
                onTestConnection={onTestConnection}
                onSaveWifi={onSaveWifi}
            />
        );

        // Open dropdown and select "Home WiFi"
        const dropdownButton = screen.getByRole("button", { name: /-- Select WiFi --/i });
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
});