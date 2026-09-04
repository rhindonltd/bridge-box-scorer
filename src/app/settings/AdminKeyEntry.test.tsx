import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const mockSetAdminToken = vi.fn();
vi.mock("@/lib/admin-token", () => ({
  setAdminToken: (...args: unknown[]) => mockSetAdminToken(...args),
}));

vi.mock("@/app/settings/AdminKeyEntryView", () => ({
  AdminKeyEntryView: ({
    code,
    error,
    loading,
    onCodeChange,
    onSubmit,
  }: {
    code: string;
    error: string | null;
    loading: boolean;
    onCodeChange: (c: string) => void;
    onSubmit: () => void;
  }) => (
    <div>
      <input
        aria-label="key"
        value={code}
        onChange={(e) => onCodeChange(e.target.value)}
      />
      <span data-testid="error">{error}</span>
      <span data-testid="loading">{String(loading)}</span>
      <button onClick={onSubmit}>submit</button>
    </div>
  ),
}));

import { AdminKeyEntry } from "./AdminKeyEntry";

function enterKey(value: string) {
  fireEvent.change(screen.getByLabelText("key"), { target: { value } });
}

describe("AdminKeyEntry", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.unstubAllGlobals());

  it("does nothing when the key is blank or whitespace", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    render(<AdminKeyEntry onSuccess={vi.fn()} />);
    enterKey("   ");
    fireEvent.click(screen.getByText("submit"));

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("stores the admin token and reports success", async () => {
    const onSuccess = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          result: { adminToken: "tok" },
        }),
      }),
    );

    render(<AdminKeyEntry onSuccess={onSuccess} />);
    enterKey("  secret  ");
    fireEvent.click(screen.getByText("submit"));

    await waitFor(() => expect(mockSetAdminToken).toHaveBeenCalledWith("tok"));
    expect(onSuccess).toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/system/admin-key/verify",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ key: "secret" }),
      }),
    );
  });

  it("shows the server error when verification is rejected", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ success: false, error: "Bad key" }),
      }),
    );

    render(<AdminKeyEntry onSuccess={vi.fn()} />);
    enterKey("nope");
    fireEvent.click(screen.getByText("submit"));

    await waitFor(() =>
      expect(screen.getByTestId("error")).toHaveTextContent("Bad key"),
    );
    expect(mockSetAdminToken).not.toHaveBeenCalled();
  });

  it("falls back to a default error when the server omits one", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: false }),
      }),
    );

    render(<AdminKeyEntry onSuccess={vi.fn()} />);
    enterKey("nope");
    fireEvent.click(screen.getByText("submit"));

    await waitFor(() =>
      expect(screen.getByTestId("error")).toHaveTextContent(
        "Incorrect admin key",
      ),
    );
  });

  it("shows a network error when the request throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    render(<AdminKeyEntry onSuccess={vi.fn()} />);
    enterKey("secret");
    fireEvent.click(screen.getByText("submit"));

    await waitFor(() =>
      expect(screen.getByTestId("error")).toHaveTextContent(
        "Could not verify admin key. Please try again.",
      ),
    );
    expect(screen.getByTestId("loading")).toHaveTextContent("false");
  });
});
