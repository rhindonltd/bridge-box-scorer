import { describe, it, expect } from "vitest";
import { isContractCode, parseContract, isCall } from "./contract";

describe("isContractCode", () => {
  it("returns true for valid undoubled contracts", () => {
    expect(isContractCode("1SN")).toBe(true);
    expect(isContractCode("3NTE")).toBe(true);
    expect(isContractCode("7HS")).toBe(true);
    expect(isContractCode("4DW")).toBe(true);
    expect(isContractCode("2CN")).toBe(true);
  });

  it("returns true for doubled contracts", () => {
    expect(isContractCode("1SXN")).toBe(true);
    expect(isContractCode("4NTXE")).toBe(true);
    expect(isContractCode("6HXS")).toBe(true);
  });

  it("returns true for redoubled contracts", () => {
    expect(isContractCode("1SXXN")).toBe(true);
    expect(isContractCode("7NTXXW")).toBe(true);
  });

  it("returns false for invalid inputs", () => {
    expect(isContractCode("")).toBe(false);
    expect(isContractCode("0SN")).toBe(false);
    expect(isContractCode("8SN")).toBe(false);
    expect(isContractCode("1XN")).toBe(false);
    expect(isContractCode("1SZ")).toBe(false);
    expect(isContractCode("1S")).toBe(false);
    expect(isContractCode("P")).toBe(false);
    expect(isContractCode("X")).toBe(false);
    expect(isContractCode("1SNextra")).toBe(false);
  });
});

describe("parseContract", () => {
  it("parses undoubled contract", () => {
    expect(parseContract("3NTE")).toEqual({
      level: 3,
      suit: "NT",
      doubling: "",
      declarer: "E",
    });
  });

  it("parses a 1-level minor contract", () => {
    expect(parseContract("1CN")).toEqual({
      level: 1,
      suit: "C",
      doubling: "",
      declarer: "N",
    });
  });

  it("parses doubled contract", () => {
    expect(parseContract("4SXW")).toEqual({
      level: 4,
      suit: "S",
      doubling: "X",
      declarer: "W",
    });
  });

  it("parses redoubled contract", () => {
    expect(parseContract("7NTXXS")).toEqual({
      level: 7,
      suit: "NT",
      doubling: "XX",
      declarer: "S",
    });
  });

  it("parses all suit types", () => {
    expect(parseContract("2HN").suit).toBe("H");
    expect(parseContract("2DN").suit).toBe("D");
    expect(parseContract("2SN").suit).toBe("S");
    expect(parseContract("2CN").suit).toBe("C");
    expect(parseContract("2NTN").suit).toBe("NT");
  });
});

describe("isCall", () => {
  it("returns true for valid calls (level + suit)", () => {
    expect(isCall("1S")).toBe(true);
    expect(isCall("3NT")).toBe(true);
    expect(isCall("7H")).toBe(true);
    expect(isCall("2C")).toBe(true);
    expect(isCall("5D")).toBe(true);
  });

  it("returns false for special bids", () => {
    expect(isCall("P")).toBe(false);
    expect(isCall("X")).toBe(false);
    expect(isCall("XX")).toBe(false);
  });

  it("returns false for full contract codes (includes direction)", () => {
    // isCall checks CallCode pattern, which is just level+suit
    expect(isCall("1SN" as any)).toBe(false);
  });
});
