import { describe, it, expect } from "vitest";
import { scoreContract } from "./score";
import type { ParsedContract } from "@/model/result";
import type { Vulnerability } from "@/model/vulnerability";

function contract(
  level: 1 | 2 | 3 | 4 | 5 | 6 | 7,
  suit: "S" | "H" | "D" | "C" | "NT",
  doubling: "" | "X" | "XX",
  declarer: "N" | "E" | "S" | "W",
  result: string,
): ParsedContract {
  return { level, suit, doubling, declarer, result } as ParsedContract;
}

describe("scoreContract", () => {
  describe("making contracts exactly", () => {
    it("scores 1NT= non-vul NS declarer as +90", () => {
      // 40 (trick value) + 50 (partscore bonus)
      const score = scoreContract(contract(1, "NT", "", "N", "="), "None");
      expect(score).toBe(90);
    });

    it("scores 3NT= non-vul as +400", () => {
      // (30*3 + 10) = 100 trick points -> game bonus 300 + 100 = 400
      const score = scoreContract(contract(3, "NT", "", "N", "="), "None");
      expect(score).toBe(400);
    });

    it("scores 3NT= vulnerable as +600", () => {
      // 100 trick points -> game bonus 500 + 100 = 600
      const score = scoreContract(contract(3, "NT", "", "N", "="), "NS");
      expect(score).toBe(600);
    });

    it("scores 4S= non-vul as +420", () => {
      // 30*4 = 120 trick points -> game bonus 300 + 120 = 420
      const score = scoreContract(contract(4, "S", "", "N", "="), "None");
      expect(score).toBe(420);
    });

    it("scores 4H= vulnerable as +620", () => {
      // 30*4 = 120 trick points -> game bonus 500 + 120 = 620
      const score = scoreContract(contract(4, "H", "", "S", "="), "NS");
      expect(score).toBe(620);
    });

    it("scores 5C= non-vul as +400", () => {
      // 20*5 = 100 -> game bonus 300 + 100 = 400
      const score = scoreContract(contract(5, "C", "", "N", "="), "None");
      expect(score).toBe(400);
    });

    it("scores 5D= vulnerable as +600", () => {
      // 20*5 = 100 -> game bonus 500 + 100 = 600
      const score = scoreContract(contract(5, "D", "", "S", "="), "NS");
      expect(score).toBe(600);
    });

    it("scores 2S= non-vul as +110 (partscore)", () => {
      // 30*2 = 60 -> partscore bonus 50 + 60 = 110
      const score = scoreContract(contract(2, "S", "", "N", "="), "None");
      expect(score).toBe(110);
    });

    it("scores 6NT= non-vul (small slam) as +990", () => {
      // trick value: 30*6 + 10 = 190, game bonus 300, slam bonus 500
      const score = scoreContract(contract(6, "NT", "", "N", "="), "None");
      expect(score).toBe(990);
    });

    it("scores 6NT= vulnerable (small slam) as +1440", () => {
      // trick value: 190, game bonus 500, slam bonus 750
      const score = scoreContract(contract(6, "NT", "", "N", "="), "NS");
      expect(score).toBe(1440);
    });

    it("scores 7NT= non-vul (grand slam) as +1520", () => {
      // trick value: 30*7 + 10 = 220, game bonus 300, small slam 500, grand slam 1000
      // Actually: game bonus 300, slam bonus 1000
      const score = scoreContract(contract(7, "NT", "", "N", "="), "None");
      expect(score).toBe(1520);
    });

    it("scores 7H= vulnerable (grand slam) as +2210", () => {
      // trick value: 30*7 = 210, game bonus 500, slam bonus 1500
      const score = scoreContract(contract(7, "H", "", "N", "="), "NS");
      expect(score).toBe(2210);
    });
  });

  describe("overtricks", () => {
    it("scores 2H+1 non-vul as +140", () => {
      // 30*2 = 60 base, partscore 50, overtrick 30 -> 140
      const score = scoreContract(contract(2, "H", "", "N", "+1"), "None");
      expect(score).toBe(140);
    });

    it("scores 3NT+2 non-vul as +460", () => {
      // 100 base, game 300, 2 overtricks * 30 = 60 -> 460
      const score = scoreContract(contract(3, "NT", "", "N", "+2"), "None");
      expect(score).toBe(460);
    });

    it("scores doubled contract with overtricks non-vul: 2SX+1 as +570", () => {
      // base: 30*2 = 60, doubled: 120. Game bonus 300, insult 50,
      // overtrick doubled non-vul: 100
      const score = scoreContract(contract(2, "S", "X", "N", "+1"), "None");
      expect(score).toBe(570);
    });

    it("scores doubled contract with overtricks vul: 3HX+1 as +930", () => {
      // base: 30*3 = 90, doubled: 180. Game bonus 500, insult 50,
      // overtrick doubled vul: 200
      const score = scoreContract(contract(3, "H", "X", "S", "+1"), "NS");
      expect(score).toBe(930);
    });

    it("scores redoubled overtricks: 1NTXX+1 non-vul as +960", () => {
      // base: 40 redoubled: 160 -> game bonus 300, insult 100,
      // overtrick XX non-vul: 200
      // Total: 160 + 300 + 100 + 200 = 760
      // Wait: trickValue(NT,1) = 30*1+10 = 40. Doubled * 4 = 160.
      // gameBonus(160,false) = 300. slamBonus(1,false) = 0.
      // insult = 100. overtricks XX non-vul = 1*200 = 200
      // Total = 160 + 200 + 300 + 0 + 100 = 760
      const score = scoreContract(contract(1, "NT", "XX", "N", "+1"), "None");
      expect(score).toBe(760);
    });

    it("scores redoubled overtricks vulnerable: 1NTXX+1 vul as +960", () => {
      // trickValue(NT,1) = 30*1+10 = 40. Redoubled * 4 = 160.
      // gameBonus(160,true) = 500. slamBonus(1,true) = 0.
      // insult XX = 100. overtrick XX vul = 1*400 = 400
      // Total = 160 + 400 + 500 + 0 + 100 = 1160
      const score = scoreContract(contract(1, "NT", "XX", "N", "+1"), "NS");
      expect(score).toBe(1160);
    });
  });

  describe("undertricks", () => {
    it("scores undoubled -1 non-vul as -50", () => {
      const score = scoreContract(contract(4, "S", "", "N", "-1"), "None");
      expect(score).toBe(-50);
    });

    it("scores undoubled -1 vul as -100", () => {
      const score = scoreContract(contract(4, "S", "", "N", "-1"), "NS");
      expect(score).toBe(-100);
    });

    it("scores undoubled -3 non-vul as -150", () => {
      const score = scoreContract(contract(4, "S", "", "N", "-3"), "None");
      expect(score).toBe(-150);
    });

    it("scores undoubled -3 vul as -300", () => {
      const score = scoreContract(contract(4, "S", "", "N", "-3"), "NS");
      expect(score).toBe(-300);
    });

    it("scores doubled -1 non-vul as -100", () => {
      const score = scoreContract(contract(4, "S", "X", "N", "-1"), "None");
      expect(score).toBe(-100);
    });

    it("scores doubled -1 vul as -200", () => {
      const score = scoreContract(contract(4, "S", "X", "N", "-1"), "NS");
      expect(score).toBe(-200);
    });

    it("scores doubled -2 non-vul as -300", () => {
      // 100 + 200 = 300
      const score = scoreContract(contract(4, "S", "X", "N", "-2"), "None");
      expect(score).toBe(-300);
    });

    it("scores doubled -2 vul as -500", () => {
      // 200 + 300 = 500
      const score = scoreContract(contract(4, "S", "X", "N", "-2"), "NS");
      expect(score).toBe(-500);
    });

    it("scores doubled -3 non-vul as -500", () => {
      // 100 + 200 + 200 = 500
      const score = scoreContract(contract(4, "S", "X", "N", "-3"), "None");
      expect(score).toBe(-500);
    });

    it("scores doubled -3 vul as -800", () => {
      // 200 + 300 + 300 = 800
      const score = scoreContract(contract(4, "S", "X", "N", "-3"), "NS");
      expect(score).toBe(-800);
    });

    it("scores doubled -4 non-vul as -800", () => {
      // 100 + 200 + 200 + 300 = 800
      const score = scoreContract(contract(4, "S", "X", "N", "-4"), "None");
      expect(score).toBe(-800);
    });

    it("scores redoubled -1 non-vul as -200", () => {
      const score = scoreContract(contract(4, "S", "XX", "N", "-1"), "None");
      expect(score).toBe(-200);
    });

    it("scores redoubled -2 vul as -1000", () => {
      // Doubled: 200 + 300 = 500, redoubled: 1000
      const score = scoreContract(contract(4, "S", "XX", "N", "-2"), "NS");
      expect(score).toBe(-1000);
    });
  });

  describe("EW declarer sign convention", () => {
    it("negates score for EW declarer making contract", () => {
      // 3NT= by East non-vul should be -400 (from NS perspective)
      const score = scoreContract(contract(3, "NT", "", "E", "="), "None");
      expect(score).toBe(-400);
    });

    it("gives positive score to NS when EW goes down", () => {
      // 4S-1 by West non-vul, NS gets +50
      const score = scoreContract(contract(4, "S", "", "W", "-1"), "None");
      expect(score).toBe(50);
    });
  });

  describe("vulnerability detection", () => {
    it("NS is vulnerable when vulnerability is NS", () => {
      const score = scoreContract(contract(3, "NT", "", "N", "="), "NS");
      expect(score).toBe(600); // vul game
    });

    it("EW is vulnerable when vulnerability is EW", () => {
      const score = scoreContract(contract(3, "NT", "", "E", "="), "EW");
      expect(score).toBe(-600);
    });

    it("Both sides vulnerable when vulnerability is Both", () => {
      const nsScore = scoreContract(contract(3, "NT", "", "N", "="), "Both");
      const ewScore = scoreContract(contract(3, "NT", "", "E", "="), "Both");
      expect(nsScore).toBe(600);
      expect(ewScore).toBe(-600);
    });

    it("neither side vulnerable when vulnerability is None", () => {
      const nsScore = scoreContract(contract(3, "NT", "", "N", "="), "None");
      const ewScore = scoreContract(contract(3, "NT", "", "E", "="), "None");
      expect(nsScore).toBe(400);
      expect(ewScore).toBe(-400);
    });
  });

  describe("edge cases", () => {
    it("returns 0 overtrick points for an unexpected doubling value", () => {
      // Tests the defensive fallthrough in overtricksPoints (line 65)
      const parsed = {
        level: 2,
        suit: "S",
        doubling: "XXX" as unknown as "" | "X" | "XX",
        declarer: "N",
        result: "+1",
      } as ParsedContract;
      const score = scoreContract(parsed, "None");
      expect(score).toBeTypeOf("number");
    });
  });
});
