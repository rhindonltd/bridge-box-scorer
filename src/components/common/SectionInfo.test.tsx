import { render, screen } from "@testing-library/react";
import { describe, vi, it, expect, afterEach, Mock } from "vitest";
import { SectionInfo } from "./SectionInfo";

vi.mock("@/context/GameContext", () => ({
  useGame: vi.fn(),
}));

import { useGame } from "@/context/GameContext";

const mockedUseGame = useGame as unknown as Mock;

describe("SectionInfo", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when gameSelection is missing", () => {
    mockedUseGame.mockReturnValue({
      gameSelection: null,
      assignmentSelection: null,
    });

    const { container } = render(<SectionInfo />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders event name", () => {
    mockedUseGame.mockReturnValue({
      gameSelection: {
        eventName: "Championship",
        sessionName: null,
        sectionName: null,
      },
      assignmentSelection: null,
    });

    render(<SectionInfo />);

    expect(screen.getByText("Championship")).toBeInTheDocument();
  });

  it("renders session and section with comma", () => {
    mockedUseGame.mockReturnValue({
      gameSelection: {
        eventName: "Event",
        sessionName: "Morning",
        sectionName: "A1",
      },
      assignmentSelection: null,
    });

    render(<SectionInfo />);

    expect(screen.getByText("Morning")).toBeInTheDocument();
    expect(screen.getByText(",")).toBeInTheDocument();
    expect(screen.getByText("A1")).toBeInTheDocument();
  });

  it("renders only session when section is missing", () => {
    mockedUseGame.mockReturnValue({
      gameSelection: {
        eventName: "Event",
        sessionName: "Morning",
        sectionName: null,
      },
      assignmentSelection: null,
    });

    render(<SectionInfo />);

    expect(screen.getByText("Morning")).toBeInTheDocument();
    expect(screen.queryByText(",")).not.toBeInTheDocument();
  });

  it("renders INDIVIDUAL participant", () => {
    mockedUseGame.mockReturnValue({
      gameSelection: {
        eventName: "Event",
      },
      assignmentSelection: {
        type: "INDIVIDUAL",
        playerId: "P123",
      },
    });

    render(<SectionInfo />);

    expect(screen.getByText("Player")).toBeInTheDocument();
    expect(screen.getByText("P123")).toBeInTheDocument();
  });

  it("renders PAIR participant", () => {
    mockedUseGame.mockReturnValue({
      gameSelection: {
        eventName: "Event",
      },
      assignmentSelection: {
        type: "PAIR",
        pairId: "PAIR-9",
      },
    });

    render(<SectionInfo />);

    expect(screen.getByText("Pair")).toBeInTheDocument();
    expect(screen.getByText("PAIR-9")).toBeInTheDocument();
  });

  it("renders TEAM participant", () => {
    mockedUseGame.mockReturnValue({
      gameSelection: {
        eventName: "Event",
      },
      assignmentSelection: {
        type: "TEAM",
        teamId: "TEAM-X",
      },
    });

    render(<SectionInfo />);

    expect(screen.getByText("Team")).toBeInTheDocument();
    expect(screen.getByText("TEAM-X")).toBeInTheDocument();
  });

  it("does not render participant for unknown type", () => {
    mockedUseGame.mockReturnValue({
      gameSelection: {
        eventName: "Event",
      },
      assignmentSelection: {
        type: "UNKNOWN",
      },
    });

    render(<SectionInfo />);

    expect(screen.queryByText("Player")).not.toBeInTheDocument();
    expect(screen.queryByText("Pair")).not.toBeInTheDocument();
    expect(screen.queryByText("Team")).not.toBeInTheDocument();
  });
});
