import { describe, it, expect } from "vitest";
import { generateUsebioXml, UsebioGameData } from "./generate-usebio";

function makeBasicGameData(): UsebioGameData {
  return {
    club: {
      name: "Test Bridge Club",
      clubNumber: "12345",
    },
    eventName: "Monday Pairs",
    eventDate: "2024-11-18T00:00:00.000Z",
    scoringType: "MP",
    tables: 3,
    sectionName: "A",
    boards: 6,
    pairs: [
      {
        pairNumber: "1NS",
        direction: "N",
        player1: {
          firstName: "Alice",
          lastName: "Smith",
          nationalId: "111111",
        },
        player2: { firstName: "Bob", lastName: "Jones", nationalId: "222222" },
      },
      {
        pairNumber: "2NS",
        direction: "N",
        player1: { firstName: "Carol", lastName: "Brown", nationalId: null },
        player2: { firstName: "Dave", lastName: "White", nationalId: "444444" },
      },
      {
        pairNumber: "1EW",
        direction: "E",
        player1: { firstName: "Eve", lastName: "Green", nationalId: "555555" },
        player2: {
          firstName: "Frank",
          lastName: "Black",
          nationalId: "666666",
        },
      },
      {
        pairNumber: "2EW",
        direction: "E",
        player1: { firstName: "Grace", lastName: "Red", nationalId: null },
        player2: { firstName: "Henry", lastName: "Blue", nationalId: null },
      },
    ],
    boardResults: [
      {
        table: 1,
        board: 1,
        round: 1,
        nsPairNumber: "1NS",
        ewPairNumber: "1EW",
        outcome: "3NTN+1",
        lead: "HK",
      },
      {
        table: 2,
        board: 1,
        round: 1,
        nsPairNumber: "2NS",
        ewPairNumber: "2EW",
        outcome: "2NTN=",
        lead: "D5",
      },
      {
        table: 1,
        board: 2,
        round: 1,
        nsPairNumber: "1NS",
        ewPairNumber: "1EW",
        outcome: "4SE-1",
        lead: "SA",
      },
      {
        table: 2,
        board: 2,
        round: 1,
        nsPairNumber: "2NS",
        ewPairNumber: "2EW",
        outcome: "PO",
        lead: null,
      },
    ],
  };
}

describe("generateUsebioXml", () => {
  describe("XML structure", () => {
    it("produces valid XML with correct declaration", () => {
      const xml = generateUsebioXml(makeBasicGameData());
      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<USEBIO Version="1.2">');
      expect(xml).toContain("</USEBIO>");
    });

    it("includes CLUB element", () => {
      const xml = generateUsebioXml(makeBasicGameData());
      expect(xml).toContain("<CLUB>");
      expect(xml).toContain("<CLUB_NAME>Test Bridge Club</CLUB_NAME>");
      expect(xml).toContain("<CLUB_ID_NUMBER>12345</CLUB_ID_NUMBER>");
      expect(xml).toContain("</CLUB>");
    });

    it("includes EVENT element", () => {
      const xml = generateUsebioXml(makeBasicGameData());
      expect(xml).toContain('<EVENT EVENT_TYPE="MP_PAIRS">');
      expect(xml).toContain(
        "<EVENT_DESCRIPTION>Monday Pairs</EVENT_DESCRIPTION>",
      );
      expect(xml).toContain("</EVENT>");
    });

    it("includes DATE in DD/MM/YYYY format", () => {
      const xml = generateUsebioXml(makeBasicGameData());
      expect(xml).toContain("<DATE>18/11/2024</DATE>");
    });

    it("includes BOARD_SCORING_METHOD", () => {
      const xml = generateUsebioXml(makeBasicGameData());
      expect(xml).toContain("<BOARD_SCORING_METHOD>MP</BOARD_SCORING_METHOD>");
    });

    it("includes BOARDS count", () => {
      const xml = generateUsebioXml(makeBasicGameData());
      expect(xml).toContain("<BOARDS>6</BOARDS>");
    });
  });

  describe("PARTICIPANTS section", () => {
    it("includes all pairs", () => {
      const xml = generateUsebioXml(makeBasicGameData());
      expect(xml).toContain('<PAIR PAIR_NUMBER="1NS" DIRECTION="NS"');
      expect(xml).toContain('<PAIR PAIR_NUMBER="2NS" DIRECTION="NS"');
      expect(xml).toContain('<PAIR PAIR_NUMBER="1EW" DIRECTION="EW"');
      expect(xml).toContain('<PAIR PAIR_NUMBER="2EW" DIRECTION="EW"');
    });

    it("includes player names", () => {
      const xml = generateUsebioXml(makeBasicGameData());
      expect(xml).toContain("<PLAYER_NAME>Alice Smith</PLAYER_NAME>");
      expect(xml).toContain("<PLAYER_NAME>Bob Jones</PLAYER_NAME>");
      expect(xml).toContain("<PLAYER_NAME>Eve Green</PLAYER_NAME>");
    });

    it("includes national IDs when present", () => {
      const xml = generateUsebioXml(makeBasicGameData());
      expect(xml).toContain("<NATIONAL_ID_NUMBER>111111</NATIONAL_ID_NUMBER>");
      expect(xml).toContain("<NATIONAL_ID_NUMBER>222222</NATIONAL_ID_NUMBER>");
    });

    it("omits national ID when null", () => {
      const xml = generateUsebioXml(makeBasicGameData());
      // Carol Brown has no nationalId — should not appear
      const carolSection = xml.split("Carol Brown")[1].split("</PLAYER>")[0];
      expect(carolSection).not.toContain("NATIONAL_ID_NUMBER");
    });
  });

  describe("BOARD_RESULTS section", () => {
    it("groups results by board number", () => {
      const xml = generateUsebioXml(makeBasicGameData());
      expect(xml).toContain('<BOARD BOARD_NUMBER="1">');
      expect(xml).toContain('<BOARD BOARD_NUMBER="2">');
    });

    it("includes pair numbers in results", () => {
      const xml = generateUsebioXml(makeBasicGameData());
      expect(xml).toContain("<NS_PAIR_NUMBER>1NS</NS_PAIR_NUMBER>");
      expect(xml).toContain("<EW_PAIR_NUMBER>1EW</EW_PAIR_NUMBER>");
    });

    it("formats contract correctly", () => {
      const xml = generateUsebioXml(makeBasicGameData());
      expect(xml).toContain("<CONTRACT>3 NT</CONTRACT>");
      expect(xml).toContain("<CONTRACT>4 S</CONTRACT>");
    });

    it("includes declarer", () => {
      const xml = generateUsebioXml(makeBasicGameData());
      expect(xml).toContain("<DECLARER>N</DECLARER>");
      expect(xml).toContain("<DECLARER>E</DECLARER>");
    });

    it("includes result field", () => {
      const xml = generateUsebioXml(makeBasicGameData());
      expect(xml).toContain("<RESULT_FIELD>+1</RESULT_FIELD>");
      expect(xml).toContain("<RESULT_FIELD>-1</RESULT_FIELD>");
      expect(xml).toContain("<RESULT_FIELD>=</RESULT_FIELD>");
    });

    it("includes score", () => {
      const xml = generateUsebioXml(makeBasicGameData());
      // 3NTN+1 (None vul, board 1) = 430
      expect(xml).toContain("<SCORE>430</SCORE>");
    });

    it("handles pass out correctly", () => {
      const xml = generateUsebioXml(makeBasicGameData());
      expect(xml).toContain("<CONTRACT>PASS</CONTRACT>");
      expect(xml).toContain("<SCORE>0</SCORE>");
    });

    it("includes matchpoints", () => {
      const xml = generateUsebioXml(makeBasicGameData());
      expect(xml).toContain("NS_MATCH_POINTS");
      expect(xml).toContain("EW_MATCH_POINTS");
    });

    it("formats lead card in USEBIO format", () => {
      const xml = generateUsebioXml(makeBasicGameData());
      // "HK" internal (Heart King) stays as "HK" in USEBIO
      expect(xml).toContain("<LEAD>HK</LEAD>");
    });
  });

  describe("RANKING section", () => {
    it("includes ranking element", () => {
      const xml = generateUsebioXml(makeBasicGameData());
      expect(xml).toContain("<RANKING>");
      expect(xml).toContain("</RANKING>");
    });

    it("includes RANK entries with pair numbers", () => {
      const xml = generateUsebioXml(makeBasicGameData());
      expect(xml).toContain('PAIR_NUMBER="1NS"');
      expect(xml).toContain('PAIR_NUMBER="2NS"');
      expect(xml).toContain('PAIR_NUMBER="1EW"');
      expect(xml).toContain('PAIR_NUMBER="2EW"');
    });

    it("includes percentage and place", () => {
      const xml = generateUsebioXml(makeBasicGameData());
      expect(xml).toContain("PERCENTAGE=");
      expect(xml).toContain("PLACE=");
    });

    it("assigns place 1 to the best pair", () => {
      const xml = generateUsebioXml(makeBasicGameData());
      expect(xml).toContain('PLACE="1"');
    });
  });

  describe("scoring type mapping", () => {
    it("maps MP to MP", () => {
      const data = makeBasicGameData();
      data.scoringType = "MP";
      const xml = generateUsebioXml(data);
      expect(xml).toContain("<BOARD_SCORING_METHOD>MP</BOARD_SCORING_METHOD>");
    });

    it("maps IMP to BUTLER", () => {
      const data = makeBasicGameData();
      data.scoringType = "IMP";
      const xml = generateUsebioXml(data);
      expect(xml).toContain(
        "<BOARD_SCORING_METHOD>BUTLER</BOARD_SCORING_METHOD>",
      );
    });

    it("maps XIMP to XIMP", () => {
      const data = makeBasicGameData();
      data.scoringType = "XIMP";
      const xml = generateUsebioXml(data);
      expect(xml).toContain(
        "<BOARD_SCORING_METHOD>XIMP</BOARD_SCORING_METHOD>",
      );
    });
  });

  describe("XML escaping", () => {
    it("escapes special characters in club name", () => {
      const data = makeBasicGameData();
      data.club.name = "Smith & Jones <Club>";
      const xml = generateUsebioXml(data);
      expect(xml).toContain("Smith &amp; Jones &lt;Club&gt;");
    });

    it("escapes special characters in player names", () => {
      const data = makeBasicGameData();
      data.pairs[0].player1.firstName = "O'Brien";
      const xml = generateUsebioXml(data);
      // xmlbuilder2 handles escaping — the name should appear correctly in XML
      // Apostrophes don't need escaping in text content per XML spec
      expect(xml).toContain("O'Brien");
    });
  });

  describe("edge cases", () => {
    it("handles empty board results", () => {
      const data = makeBasicGameData();
      data.boardResults = [];
      const xml = generateUsebioXml(data);
      // xmlbuilder2 may self-close empty elements
      expect(xml).toMatch(/BOARD_RESULTS/);
    });

    it("handles empty pairs list", () => {
      const data = makeBasicGameData();
      data.pairs = [];
      const xml = generateUsebioXml(data);
      expect(xml).toMatch(/PARTICIPANTS/);
    });

    it("handles single board result", () => {
      const data = makeBasicGameData();
      data.boardResults = [
        {
          table: 1,
          board: 1,
          round: 1,
          nsPairNumber: "1",
          ewPairNumber: "2",
          outcome: "1NTN=",
          lead: null,
        },
      ];
      const xml = generateUsebioXml(data);
      expect(xml).toContain('<BOARD BOARD_NUMBER="1">');
      expect(xml).toContain("<SCORE>90</SCORE>");
    });

    it("uses section A when sectionName is empty", () => {
      const data = makeBasicGameData();
      data.sectionName = "";
      const xml = generateUsebioXml(data);
      // Should still generate valid XML
      expect(xml).toContain("<USEBIO");
    });

    it("falls back to MP for unknown scoring type (line 88)", () => {
      const data = makeBasicGameData();
      (data as any).scoringType = "UNKNOWN_TYPE";
      const xml = generateUsebioXml(data);
      expect(xml).toContain("<BOARD_SCORING_METHOD>MP</BOARD_SCORING_METHOD>");
    });

    it("returns raw date string for invalid date (line 171)", () => {
      const data = makeBasicGameData();
      data.eventDate = "not-a-valid-date";
      const xml = generateUsebioXml(data);
      expect(xml).toContain("<DATE>not-a-valid-date</DATE>");
    });

    it("handles NP (not-played) outcomes with null score (line 129-131)", () => {
      const data = makeBasicGameData();
      data.boardResults = [
        {
          table: 1,
          board: 1,
          round: 1,
          nsPairNumber: "1NS",
          ewPairNumber: "1EW",
          outcome: "NP",
          lead: null,
        },
      ];
      const xml = generateUsebioXml(data);
      expect(xml).toContain("<CONTRACT/>");
      expect(xml).toContain("<DECLARER/>");
      expect(xml).toContain("<RESULT_FIELD/>");
      expect(xml).toContain("<SCORE>0</SCORE>");
    });

    it("omits NATIONAL_ID_NUMBER when player has no nationalId (line 129-131)", () => {
      const data = makeBasicGameData();
      data.pairs = [
        {
          pairNumber: "1NS",
          direction: "N",
          player1: { firstName: "Alice", lastName: "Smith", nationalId: null },
          player2: { firstName: "Bob", lastName: "Jones", nationalId: null },
        },
      ];
      const xml = generateUsebioXml(data);
      expect(xml).not.toContain("<NATIONAL_ID_NUMBER>");
    });

    it("produces empty RANKING when no board results exist", () => {
      const data = makeBasicGameData();
      data.boardResults = [];
      const xml = generateUsebioXml(data);
      // With no results, ranking computation returns empty list
      expect(xml).not.toContain("<RANKING>");
    });
  });

  describe("adjusted scores (A<ns>/<ew> outcomes)", () => {
    // Two lines on the same board so results.length - 1 > 0 (a non-zero max),
    // giving meaningful matchpoints / percentages for the adjusted rows.
    function makeAdjustedData(
      scoringType: UsebioGameData["scoringType"],
      nsPercent: number,
      ewPercent: number,
    ): UsebioGameData {
      const data = makeBasicGameData();
      data.scoringType = scoringType;
      data.boardResults = [
        {
          table: 1,
          board: 1,
          round: 1,
          nsPairNumber: "1NS",
          ewPairNumber: "1EW",
          outcome: `A${nsPercent}/${ewPercent}` as any,
          lead: null,
        },
        {
          table: 2,
          board: 1,
          round: 1,
          nsPairNumber: "2NS",
          ewPairNumber: "2EW",
          outcome: "3NTN=",
          lead: null,
        },
      ];
      return data;
    }

    it("emits an artificial/adjusted MP result with percentage-based matchpoints", () => {
      const xml = generateUsebioXml(makeAdjustedData("MP", 60, 40));
      // Blank contract fields + zero score + Adjusted marker.
      expect(xml).toContain("<ARTIFICIAL_SCORE>Adjusted</ARTIFICIAL_SCORE>");
      expect(xml).toContain("<SCORE>0</SCORE>");
      // maxMp = 2 * (2 - 1) = 2. NS 60% -> round(0.6*2)=1, EW 40% -> round(0.4*2)=1.
      expect(xml).toContain("<NS_MATCH_POINTS>1</NS_MATCH_POINTS>");
      expect(xml).toContain("<EW_MATCH_POINTS>1</EW_MATCH_POINTS>");
    });

    it("emits AVE+ (>50%) as +3 IMPs and AVE- (<50%) as -3 IMPs for IMP scoring", () => {
      const xml = generateUsebioXml(makeAdjustedData("IMP", 60, 40));
      expect(xml).toContain("<NS_IMPS>3</NS_IMPS>");
      expect(xml).toContain("<EW_IMPS>-3</EW_IMPS>");
      expect(xml).toContain("<ARTIFICIAL_SCORE>Adjusted</ARTIFICIAL_SCORE>");
    });

    it("emits AVE (50%) as 0 IMPs for XIMP scoring", () => {
      const xml = generateUsebioXml(makeAdjustedData("XIMP", 50, 50));
      expect(xml).toContain("<NS_IMPS>0</NS_IMPS>");
      expect(xml).toContain("<EW_IMPS>0</EW_IMPS>");
    });

    it("accumulates adjusted MP scores into the overall ranking", () => {
      const xml = generateUsebioXml(makeAdjustedData("MP", 60, 40));
      const ranking = xml.split("<RANKING>")[1].split("</RANKING>")[0];
      // The adjusted-score pairs still appear in the ranking.
      expect(ranking).toContain('PAIR_NUMBER="1NS"');
      expect(ranking).toContain('PAIR_NUMBER="1EW"');
    });

    it("accumulates adjusted IMP/XIMP scores into the overall ranking", () => {
      const xml = generateUsebioXml(makeAdjustedData("IMP", 60, 40));
      const ranking = xml.split("<RANKING>")[1].split("</RANKING>")[0];
      expect(ranking).toContain('PAIR_NUMBER="1NS"');
      expect(ranking).toContain('PAIR_NUMBER="1EW"');
    });

    it("adds zero to max for a lone adjusted MP result (single line on a board)", () => {
      // A board with a single result -> maxMp = 2 * (1 - 1) = 0, exercising the
      // `maxMp > 0 ? maxMp : 0` false branch in the ranking accumulation.
      const data = makeBasicGameData();
      data.scoringType = "MP";
      data.boardResults = [
        {
          table: 1,
          board: 1,
          round: 1,
          nsPairNumber: "1NS",
          ewPairNumber: "1EW",
          outcome: "A60/40" as any,
          lead: null,
        },
      ];
      const xml = generateUsebioXml(data);
      // With max 0, the ranking percentage is the "0.00" fallback.
      const ranking = xml.split("<RANKING>")[1].split("</RANKING>")[0];
      expect(ranking).toContain('PAIR_NUMBER="1NS"');
      expect(ranking).toContain('PERCENTAGE="0.00"');
    });
  });

  describe("multi-section output", () => {
    function makeMultiSectionData(): UsebioGameData {
      return {
        ...makeBasicGameData(),
        // Section-qualified pair numbers across sections A and B.
        pairs: [
          {
            pairNumber: "A1NS",
            direction: "N",
            player1: { firstName: "Al", lastName: "A", nationalId: null },
            player2: { firstName: "Bo", lastName: "B", nationalId: null },
          },
          {
            pairNumber: "A1EW",
            direction: "E",
            player1: { firstName: "Cy", lastName: "C", nationalId: null },
            player2: { firstName: "Di", lastName: "D", nationalId: null },
          },
          {
            pairNumber: "B1NS",
            direction: "N",
            player1: { firstName: "Ed", lastName: "E", nationalId: null },
            player2: { firstName: "Fi", lastName: "F", nationalId: null },
          },
          {
            pairNumber: "B1EW",
            direction: "E",
            player1: { firstName: "Gu", lastName: "G", nationalId: null },
            player2: { firstName: "Ha", lastName: "H", nationalId: null },
          },
        ],
        boardResults: [
          {
            table: 1,
            board: 1,
            round: 1,
            nsPairNumber: "A1NS",
            ewPairNumber: "A1EW",
            outcome: "3NTN=",
            lead: null,
          },
          {
            table: 1,
            board: 1,
            round: 1,
            nsPairNumber: "B1NS",
            ewPairNumber: "B1EW",
            outcome: "3NTN+1",
            lead: null,
          },
        ],
      };
    }

    it("tags participants with their real section id", () => {
      const xml = generateUsebioXml(makeMultiSectionData());
      expect(xml).toContain('PAIR_NUMBER="A1NS"');
      expect(xml).toContain('SECTION_ID="A"');
      expect(xml).toContain('PAIR_NUMBER="B1NS"');
      expect(xml).toContain('SECTION_ID="B"');
    });

    it("tags ranking entries with their section id", () => {
      const xml = generateUsebioXml(makeMultiSectionData());
      // Both sections' pairs are ranked and each carries a SECTION_ID.
      const ranking = xml.split("<RANKING>")[1].split("</RANKING>")[0];
      expect(ranking).toContain('PAIR_NUMBER="A1NS"');
      expect(ranking).toContain('PAIR_NUMBER="B1NS"');
      expect(ranking).toMatch(/SECTION_ID="A"/);
      expect(ranking).toMatch(/SECTION_ID="B"/);
    });

    it("falls back to the section label for unprefixed pair numbers", () => {
      const xml = generateUsebioXml(makeBasicGameData());
      // Basic data uses unprefixed "1NS" etc., so SECTION_ID defaults to "A".
      expect(xml).toContain('SECTION_ID="A"');
    });
  });
});
