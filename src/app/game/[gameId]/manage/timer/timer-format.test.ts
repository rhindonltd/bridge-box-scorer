import { describe, it, expect } from "vitest";

import { breakConfigToDraft, msToResumeAt } from "./timer-format";

describe("breakConfigToDraft", () => {
  it("converts a duration break to a draft in minutes", () => {
    const draft = breakConfigToDraft({
      afterRound: 2,
      mode: "duration",
      durationSeconds: 600,
    });
    expect(draft).toEqual({
      afterRound: 2,
      mode: "duration",
      durationMinutes: 10,
      resumeAt: "",
    });
  });

  // The resumeTime arm formats the stored resume timestamp back into the
  // "HH:MM" the editor's time input expects.
  it("converts a resume-time break to a draft with the local HH:MM", () => {
    const resumeAtMs = new Date("2025-01-01T14:05:00").getTime();
    const draft = breakConfigToDraft({
      afterRound: 3,
      mode: "resumeTime",
      resumeAtMs,
    });
    expect(draft).toEqual({
      afterRound: 3,
      mode: "resumeTime",
      durationMinutes: 0,
      resumeAt: msToResumeAt(resumeAtMs),
    });
    expect(draft.resumeAt).toBe("14:05");
  });
});
