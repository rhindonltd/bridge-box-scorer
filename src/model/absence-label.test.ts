import { describe, it, expect } from "vitest";
import { absencesScreenLabel } from "./absence-label";

describe("absencesScreenLabel", () => {
  const none = {
    lateArrivals: false,
    withdrawals: false,
    substitutions: false,
  };

  it("is null when there is nothing to show", () => {
    expect(absencesScreenLabel(none)).toBeNull();
  });

  it("names a single kind", () => {
    expect(absencesScreenLabel({ ...none, lateArrivals: true })).toBe(
      "Late Arrivals",
    );
    expect(absencesScreenLabel({ ...none, withdrawals: true })).toBe(
      "Withdrawals",
    );
    expect(absencesScreenLabel({ ...none, substitutions: true })).toBe(
      "Substitutions",
    );
  });

  it("joins two kinds with &", () => {
    expect(
      absencesScreenLabel({ ...none, lateArrivals: true, substitutions: true }),
    ).toBe("Late Arrivals & Substitutions");
  });

  it("joins three kinds in a fixed order", () => {
    expect(
      absencesScreenLabel({
        lateArrivals: true,
        withdrawals: true,
        substitutions: true,
      }),
    ).toBe("Late Arrivals, Withdrawals & Substitutions");
  });
});
