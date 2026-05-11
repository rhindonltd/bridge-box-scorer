import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CreateEventForm from "./CreateEventForm";

// Mock TextField
vi.mock("@/components/common/TextField", () => ({
    default: ({ label, value, onChange }: any) => (
        <input
            aria-label={label}
            value={value}
            onChange={(e) => onChange(e.target.value)}
        />
    ),
}));

// Mock SelectField
vi.mock("@/components/common/SelectField", () => ({
    default: ({ label, value, options, onSelect }: any) => (
        <select
            aria-label={label}
            value={value}
            onChange={(e) => onSelect(e.target.value)}
        >
            {options.map((o: string) => (
                <option key={o} value={o}>
                    {o}
                </option>
            ))}
        </select>
    ),
}));

// Mock NumberStepperField
vi.mock("@/components/common/NumberStepperField", () => ({
    NumberStepperField: ({ label, value, onChange }: any) => (
        <input
            type="number"
            aria-label={label}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
        />
    ),
}));

// Mock Button
vi.mock("@/components/common/Button", () => ({
    default: ({ value, type, className }: any) => (
        <button type={type} className={className}>
            {value}
        </button>
    ),
}));

describe("CreateEventForm", () => {
    it("renders all fields", () => {
        render(<CreateEventForm onNext={vi.fn()} />);

        expect(
            screen.getByLabelText("Event Name")
        ).toBeInTheDocument();

        expect(
            screen.getByLabelText("Director Name")
        ).toBeInTheDocument();

        expect(
            screen.getByLabelText("Event Type")
        ).toBeInTheDocument();

        expect(
            screen.getByLabelText("Sessions")
        ).toBeInTheDocument();

        expect(
            screen.getByRole("button", { name: "Next" })
        ).toBeInTheDocument();
    });

    it("submits default values", () => {
        const fn = vi.fn();

        render(<CreateEventForm onNext={fn} />);

        fireEvent.click(
            screen.getByRole("button", { name: "Next" })
        );

        expect(fn).toHaveBeenCalledWith({
            eventName: "",
            director: "",
            eventType: "Teams/Pairs",
            sessions: 1,
        });
    });

    it("updates and submits entered values", () => {
        const fn = vi.fn();

        render(<CreateEventForm onNext={fn} />);

        fireEvent.change(screen.getByLabelText("Event Name"), {
            target: { value: "Club Championship" },
        });

        fireEvent.change(screen.getByLabelText("Director Name"), {
            target: { value: "John Smith" },
        });

        fireEvent.change(screen.getByLabelText("Event Type"), {
            target: { value: "Individual" },
        });

        fireEvent.change(screen.getByLabelText("Sessions"), {
            target: { value: "3" },
        });

        fireEvent.click(
            screen.getByRole("button", { name: "Next" })
        );

        expect(fn).toHaveBeenCalledWith({
            eventName: "Club Championship",
            director: "John Smith",
            eventType: "Individual",
            sessions: 3,
        });
    });

    it("prevents default form submission", () => {
        const fn = vi.fn();

        render(<CreateEventForm onNext={fn} />);

        const form = screen
            .getByRole("button", { name: "Next" })
            .closest("form");

        const submitEvent = new Event("submit", {
            bubbles: true,
            cancelable: true,
        });

        const preventDefaultSpy = vi.spyOn(
            submitEvent,
            "preventDefault"
        );

        form?.dispatchEvent(submitEvent);

        expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it("renders with expected layout classes", () => {
        const { container } = render(
            <CreateEventForm onNext={vi.fn()} />
        );

        expect(container.firstChild).toHaveClass(
            "flex-1",
            "flex",
            "justify-center"
        );
    });
});
