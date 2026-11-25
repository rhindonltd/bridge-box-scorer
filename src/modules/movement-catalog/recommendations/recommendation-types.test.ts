import { describe, it, expect } from "vitest";
import { movementTypeToFamily } from "./recommendation-types";

describe("movementTypeToFamily", () => {
  describe("numeric type fallback (generic names)", () => {
    it("maps '0' (MITCHELL) to MITCHELL", () => {
      expect(movementTypeToFamily("0", "3 Table Mitchell")).toBe("MITCHELL");
    });

    it("maps '1' (SWITCHED_MITCHELL) to MITCHELL", () => {
      expect(movementTypeToFamily("1", "Switched Mitchell")).toBe("MITCHELL");
    });

    it("maps '2' (HOWELL) to HOWELL", () => {
      expect(movementTypeToFamily("2", "3 Table Movement")).toBe("HOWELL");
    });

    it("maps '3' (AMERICAN_WHIST) to AMERICAN_WHIST", () => {
      expect(movementTypeToFamily("3", "4 Table Movement")).toBe(
        "AMERICAN_WHIST",
      );
    });

    it("defaults unknown numeric types to MITCHELL", () => {
      expect(movementTypeToFamily("9", "Mystery Movement")).toBe("MITCHELL");
    });
  });

  describe("name heuristics take precedence over numeric type", () => {
    it("detects Rover even under the base Mitchell numeric type", () => {
      expect(movementTypeToFamily("0", "6 Table Mitchell + Rover")).toBe(
        "ROVER",
      );
    });

    it("detects Appendix", () => {
      expect(movementTypeToFamily("0", "18 table Appendix Mitchell")).toBe(
        "APPENDIX",
      );
    });

    it("detects Web", () => {
      expect(movementTypeToFamily("0", "Web Mitchell 9 round SPECIAL")).toBe(
        "WEB",
      );
    });

    it("detects Share and Relay", () => {
      expect(movementTypeToFamily("0", "Mitchell Share and Relay")).toBe(
        "SHARE_AND_RELAY",
      );
    });

    it("detects Skip", () => {
      expect(movementTypeToFamily("0", "Skip Mitchell")).toBe("SKIP_MITCHELL");
    });

    it("detects Howell by name", () => {
      expect(movementTypeToFamily("0", "3 Table Howell")).toBe("HOWELL");
    });

    it("detects American Whist by name", () => {
      expect(movementTypeToFamily("0", "American Whist")).toBe(
        "AMERICAN_WHIST",
      );
    });
  });
});
