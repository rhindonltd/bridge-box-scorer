import { describe, it, expect } from "vitest";
import { isPlayedContractCode, parsePlayedContract } from "./result";
import type { PlayedContractCode } from "./result";

describe("isPlayedContractCode", () => {
  it("returns true for made contracts (=)", () => {
    expect(isPlayedContractCode("3NTN=")).toBe(true);
    expect(isPlayedContractCode("4SE=")).toBe(true);
    expect(isPlayedContractCode("1CW=")).toBe(true);
  });

  it("returns true for contracts with overtricks", () => {
    expect(isPlayedContractCode("3NTN+1")).toBe(true);
    expect(isPlayedContractCode("2HS+3")).toBe(true);
    expect(isPlayedContractCode("1DE+6")).toBe(true);
  });

  it("returns true for contracts with undertricks", () => {
    expect(isPlayedContractCode("4SN-1")).toBe(true);
    expect(isPlayedContractCode("6HE-3")).toBe(true);
    expect(isPlayedContractCode("7NTW-7")).toBe(true);
  });

  it("returns true for doubled and redoubled played contracts", () => {
    expect(isPlayedContractCode("4SXN=")).toBe(true);
    expect(isPlayedContractCode("3NTXXE+1")).toBe(true);
    expect(isPlayedContractCode("2HXW-2")).toBe(true);
  });

  it("returns false for invalid played contract codes", () => {
    expect(isPlayedContractCode("")).toBe(false);
    expect(isPlayedContractCode("3NTN")).toBe(false); // no result
    expect(isPlayedContractCode("3NTN+0")).toBe(false); // +0 not valid
    expect(isPlayedContractCode("3NTN+7")).toBe(false); // max overtrick is +6
    expect(isPlayedContractCode("3NTN-8")).toBe(false); // max undertrick is -7
    expect(isPlayedContractCode("PO")).toBe(false);
    expect(isPlayedContractCode("NP")).toBe(false);
  });
});

describe("parsePlayedContract", () => {
  it("parses a made undoubled contract", () => {
    expect(parsePlayedContract("3NTN=" as PlayedContractCode)).toEqual({
      level: 3,
      suit: "NT",
      doubling: "",
      declarer: "N",
      result: "=",
    });
  });

  it("parses a contract with overtricks", () => {
    expect(parsePlayedContract("4SE+2" as PlayedContractCode)).toEqual({
      level: 4,
      suit: "S",
      doubling: "",
      declarer: "E",
      result: "+2",
    });
  });

  it("parses a contract with undertricks", () => {
    expect(parsePlayedContract("6HW-3" as PlayedContractCode)).toEqual({
      level: 6,
      suit: "H",
      doubling: "",
      declarer: "W",
      result: "-3",
    });
  });

  it("parses a doubled contract", () => {
    expect(parsePlayedContract("2CXS+1" as PlayedContractCode)).toEqual({
      level: 2,
      suit: "C",
      doubling: "X",
      declarer: "S",
      result: "+1",
    });
  });

  it("parses a redoubled contract", () => {
    expect(parsePlayedContract("1NTXXN-1" as PlayedContractCode)).toEqual({
      level: 1,
      suit: "NT",
      doubling: "XX",
      declarer: "N",
      result: "-1",
    });
  });

  it("throws on invalid contract code", () => {
    expect(() => parsePlayedContract("INVALID" as PlayedContractCode)).toThrow(
      "Invalid contract",
    );
  });
});
