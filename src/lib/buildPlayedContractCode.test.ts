import { describe, it, expect } from "vitest";
import { buildPlayedContractCode } from "./buildPlayedContractCode";

describe("buildPlayedContractCode", () => {
  it("builds a code for an exactly-made contract", () => {
    expect(buildPlayedContractCode(3, "NT", "", "N", 0)).toBe("3NTN=");
  });

  it("builds a code for a contract with overtricks", () => {
    expect(buildPlayedContractCode(4, "S", "", "E", 2)).toBe("4SE+2");
  });

  it("builds a code for a contract with undertricks", () => {
    expect(buildPlayedContractCode(6, "H", "", "W", -3)).toBe("6HW-3");
  });

  it("builds a code for a doubled contract made exactly", () => {
    expect(buildPlayedContractCode(2, "C", "X", "S", 0)).toBe("2CXS=");
  });

  it("builds a code for a redoubled contract with overtricks", () => {
    expect(buildPlayedContractCode(1, "NT", "XX", "N", 1)).toBe("1NTXXN+1");
  });

  it("builds a code for a doubled contract going down", () => {
    expect(buildPlayedContractCode(4, "S", "X", "W", -2)).toBe("4SXW-2");
  });

  it("handles all suit types", () => {
    expect(buildPlayedContractCode(1, "S", "", "N", 0)).toBe("1SN=");
    expect(buildPlayedContractCode(1, "H", "", "N", 0)).toBe("1HN=");
    expect(buildPlayedContractCode(1, "D", "", "N", 0)).toBe("1DN=");
    expect(buildPlayedContractCode(1, "C", "", "N", 0)).toBe("1CN=");
    expect(buildPlayedContractCode(1, "NT", "", "N", 0)).toBe("1NTN=");
  });

  it("handles all declarer directions", () => {
    expect(buildPlayedContractCode(3, "NT", "", "N", 0)).toBe("3NTN=");
    expect(buildPlayedContractCode(3, "NT", "", "E", 0)).toBe("3NTE=");
    expect(buildPlayedContractCode(3, "NT", "", "S", 0)).toBe("3NTS=");
    expect(buildPlayedContractCode(3, "NT", "", "W", 0)).toBe("3NTW=");
  });

  it("handles maximum overtricks (+6)", () => {
    expect(buildPlayedContractCode(1, "C", "", "N", 6)).toBe("1CN+6");
  });

  it("handles maximum undertricks (-7)", () => {
    expect(buildPlayedContractCode(7, "NT", "", "N", -7)).toBe("7NTN-7");
  });
});
