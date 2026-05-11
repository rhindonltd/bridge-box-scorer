import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SimpleCreateGameForm from "./SimpleCreateGameForm";
import { createGame } from "../pages/create/actions/CreateGame";

// Mock createGame action
vi.mock("../pages/create/actions/CreateGame", () => ({
  createGame: vi.fn(),
}));

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

describe("SimpleCreateGameForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders all form fields", () => {
    render(<SimpleCreateGameForm onGameCreated={vi.fn()} />);

    expect(screen.getByLabelText("Event Name")).toBeInTheDocument();

    expect(screen.getByLabelText("Director Name")).toBeInTheDocument();

    expect(screen.getByLabelText("Event Type")).toBeInTheDocument();

    expect(screen.getByLabelText("Tables")).toBeInTheDocument();

    expect(screen.getByRole("button", { name: "Next" })).toBeInTheDocument();
  });

  it("submits default values", async () => {
    vi.mocked(createGame).mockResolvedValue(123);

    const fn = vi.fn();

    render(<SimpleCreateGameForm onGameCreated={fn} />);

    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    await waitFor(() => {
      expect(createGame).toHaveBeenCalledWith({
        eventName: "",
        director: "",
        eventType: "Teams/Pairs",
        tables: 1,
      });
    });

    expect(fn).toHaveBeenCalledWith(123);
  });

  it("submits entered values", async () => {
    vi.mocked(createGame).mockResolvedValue(999);

    const fn = vi.fn();

    render(<SimpleCreateGameForm onGameCreated={fn} />);

    fireEvent.change(screen.getByLabelText("Event Name"), {
      target: { value: "Club Pairs" },
    });

    fireEvent.change(screen.getByLabelText("Director Name"), {
      target: { value: "Jane Doe" },
    });

    fireEvent.change(screen.getByLabelText("Event Type"), {
      target: { value: "Individual" },
    });

    fireEvent.change(screen.getByLabelText("Tables"), {
      target: { value: "8" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    await waitFor(() => {
      expect(createGame).toHaveBeenCalledWith({
        eventName: "Club Pairs",
        director: "Jane Doe",
        eventType: "Individual",
        tables: 8,
      });
    });

    expect(fn).toHaveBeenCalledWith(999);
  });

  it("prevents default form submission", () => {
    render(<SimpleCreateGameForm onGameCreated={vi.fn()} />);

    const form = screen.getByRole("button", { name: "Next" }).closest("form");

    const submitEvent = new Event("submit", {
      bubbles: true,
      cancelable: true,
    });

    const preventDefaultSpy = vi.spyOn(submitEvent, "preventDefault");

    form?.dispatchEvent(submitEvent);

    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it("renders layout container classes", () => {
    const { container } = render(
      <SimpleCreateGameForm onGameCreated={vi.fn()} />,
    );

    expect(container.firstChild).toHaveClass(
      "flex-1",
      "flex",
      "justify-center",
    );
  });
});
