import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { playChime, primeChime, resetChime } from "./chime";

function fakeContext(state = "running") {
  const nodes: { connect: ReturnType<typeof vi.fn> }[] = [];
  const ctx = {
    state,
    currentTime: 0,
    destination: {},
    resume: vi.fn(() => Promise.resolve()),
    createOscillator: vi.fn(() => {
      const node = {
        type: "",
        frequency: { value: 0 },
        connect: vi.fn((next) => next),
        start: vi.fn(),
        stop: vi.fn(),
      };
      nodes.push(node);
      return node;
    }),
    createGain: vi.fn(() => ({
      gain: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
    })),
  };
  return { ctx, nodes };
}

describe("chime", () => {
  beforeEach(() => resetChime());
  afterEach(() => {
    vi.unstubAllGlobals();
    resetChime();
  });

  it("plays two notes", () => {
    const { ctx } = fakeContext();
    vi.stubGlobal(
      "AudioContext",
      vi.fn(function () {
        return ctx;
      }),
    );
    playChime();
    expect(ctx.createOscillator).toHaveBeenCalledTimes(2);
    expect(ctx.resume).not.toHaveBeenCalled();
    // The context is reused.
    playChime();
    expect(AudioContext).toHaveBeenCalledTimes(1);
  });

  it("tries to resume a suspended context", () => {
    const { ctx } = fakeContext("suspended");
    ctx.resume.mockReturnValue(Promise.reject(new Error("blocked")));
    vi.stubGlobal(
      "AudioContext",
      vi.fn(function () {
        return ctx;
      }),
    );
    expect(() => playChime()).not.toThrow();
    expect(ctx.resume).toHaveBeenCalled();
  });

  it("falls back to the webkit-prefixed context", () => {
    const { ctx } = fakeContext();
    vi.stubGlobal("AudioContext", undefined);
    vi.stubGlobal(
      "webkitAudioContext",
      vi.fn(function () {
        return ctx;
      }),
    );
    playChime();
    expect(ctx.createOscillator).toHaveBeenCalled();
  });

  it("stays silent without Web Audio, or if it can't start", () => {
    vi.stubGlobal("AudioContext", undefined);
    expect(() => playChime()).not.toThrow();
    vi.stubGlobal(
      "AudioContext",
      vi.fn(() => {
        throw new Error("no audio");
      }),
    );
    expect(() => playChime()).not.toThrow();
  });

  it("stays silent if building the sound fails", () => {
    const { ctx } = fakeContext();
    ctx.createOscillator.mockImplementation(() => {
      throw new Error("bad");
    });
    vi.stubGlobal(
      "AudioContext",
      vi.fn(function () {
        return ctx;
      }),
    );
    expect(() => playChime()).not.toThrow();
  });

  it("unlocks audio on the first tap", async () => {
    const { ctx } = fakeContext("suspended");
    ctx.resume.mockReturnValue(Promise.reject(new Error("still blocked")));
    vi.stubGlobal(
      "AudioContext",
      vi.fn(function () {
        return ctx;
      }),
    );
    primeChime();
    window.dispatchEvent(new Event("pointerdown"));
    window.dispatchEvent(new Event("pointerdown"));
    await Promise.resolve();
    expect(ctx.resume).toHaveBeenCalledTimes(1);
  });

  it("does nothing outside a browser", () => {
    vi.stubGlobal("window", undefined);
    expect(() => primeChime()).not.toThrow();
    expect(() => playChime()).not.toThrow();
  });

  it("primes harmlessly when there is no Web Audio", () => {
    vi.stubGlobal("AudioContext", undefined);
    primeChime();
    expect(() => window.dispatchEvent(new Event("pointerdown"))).not.toThrow();
  });
});
