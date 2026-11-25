import { describe, it, expect } from "vitest";
import { normaliseAbsenceTreatment } from "./absence";

describe("normaliseAbsenceTreatment", () => {
  it("defaults to AVERAGE and maps the legacy values", () => {
    expect(normaliseAbsenceTreatment(null)).toBe("AVERAGE");
    expect(normaliseAbsenceTreatment("AVERAGE")).toBe("AVERAGE");
    expect(normaliseAbsenceTreatment("PENALISED")).toBe("AVERAGE");
    expect(normaliseAbsenceTreatment("REMOVED")).toBe("REMOVED");
    expect(normaliseAbsenceTreatment("REMOVE")).toBe("REMOVED");
  });
});
