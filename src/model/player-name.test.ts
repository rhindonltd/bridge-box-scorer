import { describe, it, expect } from "vitest";
import { pairName, playerName } from "./player-name";

describe("playerName", () => {
  it("joins and trims first and last names", () => {
    expect(playerName({ firstName: "Ann", lastName: "" })).toBe("Ann");
  });
});

describe("pairName", () => {
  const ann = { firstName: "Ann", lastName: "Smith" };
  const bob = { firstName: "Bob", lastName: "Jones" };

  it("joins both players with an ampersand", () => {
    expect(pairName(ann, bob)).toBe("Ann Smith & Bob Jones");
  });

  it("leaves out a missing player", () => {
    expect(pairName(undefined, bob)).toBe("Bob Jones");
  });
});
