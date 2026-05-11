import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import RootLayout, { metadata } from "./layout";

describe("metadata", () => {
    it("has the correct title and description", () => {
        expect(metadata).toEqual({
            title: "Bridge Box",
            description: "Bridge Box",
        });
    });
});

describe("RootLayout", () => {
    it("renders children correctly", () => {
        render(
            <RootLayout>
                <div>Test Content</div>
        </RootLayout>
    );

        expect(screen.getByText("Test Content")).toBeInTheDocument();
    });

    it("renders html with lang='en'", () => {
        render(
            <RootLayout>
                <div>Test</div>
            </RootLayout>
        );

        expect(document.documentElement.lang).toBe("en");
    });

    it("renders body element", () => {
        render(
            <RootLayout>
                <div>Body Content</div>
        </RootLayout>
    );

        expect(document.body).toHaveTextContent("Body Content");
    });
});
