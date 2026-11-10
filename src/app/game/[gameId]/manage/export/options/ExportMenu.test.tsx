import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

let swrData: Record<string, unknown>;
vi.mock("swr", () => ({
  default: (key: string) => ({ data: swrData[key] }),
}));
vi.mock("@/lib/fetcher", () => ({ fetcher: vi.fn() }));
vi.mock("@/swr/swr-keys", () => ({
  swrKeys: { bridgewebs: () => "bridgewebs", ebu: () => "ebu" },
}));

const mockUseGameStarted = vi.fn();
vi.mock("@/hooks/game-started", () => ({
  useGameStarted: () => mockUseGameStarted(),
}));
const mockUseResultsComplete = vi.fn();
vi.mock("@/hooks/results-complete", () => ({
  useResultsComplete: () => mockUseResultsComplete(),
}));

vi.mock("@/app/game/[gameId]/manage/export/options/ExportMenuPage", () => ({
  ExportMenuPage: (props: Record<string, unknown>) => (
    <div>
      {Object.entries(props).map(([name, value]) =>
        typeof value === "function" ? (
          <button key={name} onClick={value as () => void}>
            {name}
          </button>
        ) : (
          <span key={name} data-testid={`flag-${name}`}>
            {String(value)}
          </span>
        ),
      )}
    </div>
  ),
}));

import { ExportMenu } from "./ExportMenu";

const flag = (n: string) => screen.getByTestId(`flag-${n}`).textContent;

describe("ExportMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    swrData = { bridgewebs: { configured: true }, ebu: { configured: true } };
    mockUseGameStarted.mockReturnValue({ started: true });
    mockUseResultsComplete.mockReturnValue({ allResultsIn: true });
  });

  it("routes each action to its screen", () => {
    render(<ExportMenu gameId="g1" />);
    const routes: Record<string, string> = {
      onBack: "/game/g1/manage/export",
      onDownloadUsebioClick: "/game/g1/manage/download-usebio",
      onDownloadPbnClick: "/game/g1/manage/download-pbn",
      onUploadBridgewebsClick: "/game/g1/manage/upload-bridgewebs",
      onUploadEbuClick: "/game/g1/manage/upload-ebu",
    };
    for (const [name, path] of Object.entries(routes)) {
      fireEvent.click(screen.getByRole("button", { name }));
      expect(mockPush).toHaveBeenLastCalledWith(path);
    }
  });

  it("shows everything enabled when started, configured and complete", () => {
    render(<ExportMenu gameId="g1" />);
    expect(flag("showDownloadUsebio")).toBe("true");
    expect(flag("downloadUsebioDisabled")).toBe("false");
    expect(flag("showDownloadPbn")).toBe("true");
    expect(flag("showUploadBridgewebs")).toBe("true");
    expect(flag("uploadBridgewebsDisabled")).toBe("false");
    expect(flag("showUploadEbu")).toBe("true");
    expect(flag("uploadEbuDisabled")).toBe("false");
  });

  it("disables uploads until results are in", () => {
    mockUseResultsComplete.mockReturnValue({ allResultsIn: false });
    render(<ExportMenu gameId="g1" />);
    expect(flag("downloadUsebioDisabled")).toBe("true");
    expect(flag("uploadBridgewebsDisabled")).toBe("true");
    expect(flag("uploadEbuDisabled")).toBe("true");
  });

  it("hides publishers when unconfigured or not yet loaded", () => {
    swrData = {};
    render(<ExportMenu gameId="g1" />);
    expect(flag("showUploadBridgewebs")).toBe("false");
    expect(flag("showUploadEbu")).toBe("false");
  });

  it("hides everything before the game starts", () => {
    mockUseGameStarted.mockReturnValue({ started: false });
    render(<ExportMenu gameId="g1" />);
    expect(flag("showDownloadUsebio")).toBe("false");
    expect(flag("showDownloadPbn")).toBe("false");
    expect(flag("showUploadBridgewebs")).toBe("false");
    expect(flag("showUploadEbu")).toBe("false");
  });
});
