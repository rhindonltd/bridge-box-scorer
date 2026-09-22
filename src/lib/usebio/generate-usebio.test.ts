import { describe, it, expect } from "vitest";
import {
  generateUsebioXml,
  UsebioPairsData,
  UsebioSwissPairsData,
  UsebioSwissTeamsData,
  UsebioBoardComparisonTeamsData,
} from "./generate-usebio";

function makeBasicGameData(): UsebioPairsData {
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
    it("produces valid XML with the USEBIO 1.2 prolog and DOCTYPE", () => {
      const xml = generateUsebioXml(makeBasicGameData());
      expect(xml).toContain('<?xml version="1.0" encoding="iso-8859-1"?>');
      expect(xml).toContain(
        '<!DOCTYPE USEBIO SYSTEM "http://www.ebu.co.uk/usebio/usebio_v1_2.dtd">',
      );
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

    it("uses the PAIRS event type", () => {
      const xml = generateUsebioXml(makeBasicGameData());
      expect(xml).toContain('<EVENT EVENT_TYPE="PAIRS">');
      expect(xml).toContain(
        "<EVENT_DESCRIPTION>Monday Pairs</EVENT_DESCRIPTION>",
      );
      expect(xml).toContain("</EVENT>");
    });

    it("includes DATE in DD/MM/YYYY format", () => {
      const xml = generateUsebioXml(makeBasicGameData());
      expect(xml).toContain("<DATE>18/11/2024</DATE>");
    });

    it("includes BOARD_SCORING_METHOD as MATCH_POINTS for MP", () => {
      const xml = generateUsebioXml(makeBasicGameData());
      expect(xml).toContain(
        "<BOARD_SCORING_METHOD>MATCH_POINTS</BOARD_SCORING_METHOD>",
      );
    });

    it("includes the event header counts", () => {
      const xml = generateUsebioXml(makeBasicGameData());
      expect(xml).toContain("<SESSION_COUNT>1</SESSION_COUNT>");
      expect(xml).toContain("<SECTION_COUNT>1</SECTION_COUNT>");
      expect(xml).toContain("<PAIRS>4</PAIRS>");
      expect(xml).toContain("<EW_PAIRS>2</EW_PAIRS>");
      expect(xml).toContain("<BOARDS_PLAYED>6</BOARDS_PLAYED>");
      expect(xml).toContain("<WINNER_TYPE>1</WINNER_TYPE>");
    });

    it("nests results in SESSION > SECTION", () => {
      const xml = generateUsebioXml(makeBasicGameData());
      expect(xml).toContain('<SESSION SESSION_ID="1">');
      expect(xml).toContain('<SECTION SECTION_ID="A">');
    });
  });

  describe("PARTICIPANTS section", () => {
    it("includes all pairs with number and direction", () => {
      const xml = generateUsebioXml(makeBasicGameData());
      expect(xml).toContain("<PAIR_NUMBER>1NS</PAIR_NUMBER>");
      expect(xml).toContain("<PAIR_NUMBER>2NS</PAIR_NUMBER>");
      expect(xml).toContain("<PAIR_NUMBER>1EW</PAIR_NUMBER>");
      expect(xml).toContain("<PAIR_NUMBER>2EW</PAIR_NUMBER>");
      expect(xml).toContain("<DIRECTION>NS</DIRECTION>");
      expect(xml).toContain("<DIRECTION>EW</DIRECTION>");
    });

    it("includes inline placing (PERCENTAGE and PLACE) per pair", () => {
      const xml = generateUsebioXml(makeBasicGameData());
      expect(xml).toContain("<PERCENTAGE>");
      expect(xml).toContain("<PLACE>1</PLACE>");
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

  describe("BOARD / TRAVELLER_LINE section", () => {
    it("emits one BOARD per board number with a child BOARD_NUMBER", () => {
      const xml = generateUsebioXml(makeBasicGameData());
      expect(xml).toContain("<BOARD_NUMBER>1</BOARD_NUMBER>");
      expect(xml).toContain("<BOARD_NUMBER>2</BOARD_NUMBER>");
    });

    it("includes pair numbers on each traveller line", () => {
      const xml = generateUsebioXml(makeBasicGameData());
      expect(xml).toContain("<NS_PAIR_NUMBER>1NS</NS_PAIR_NUMBER>");
      expect(xml).toContain("<EW_PAIR_NUMBER>1EW</EW_PAIR_NUMBER>");
    });

    it("formats the contract in the compact form", () => {
      const xml = generateUsebioXml(makeBasicGameData());
      expect(xml).toContain("<CONTRACT>3NT</CONTRACT>");
      expect(xml).toContain("<CONTRACT>4S</CONTRACT>");
    });

    it("includes PLAYED_BY (declarer)", () => {
      const xml = generateUsebioXml(makeBasicGameData());
      expect(xml).toContain("<PLAYED_BY>N</PLAYED_BY>");
      expect(xml).toContain("<PLAYED_BY>E</PLAYED_BY>");
    });

    it("includes TRICKS (total tricks taken)", () => {
      const xml = generateUsebioXml(makeBasicGameData());
      // 3NTN+1 -> 10 total tricks.
      expect(xml).toContain("<TRICKS>10</TRICKS>");
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

    it("does not emit a separate RANKING block (placings are inline)", () => {
      const xml = generateUsebioXml(makeBasicGameData());
      expect(xml).not.toContain("<RANKING>");
    });

    it("never emits deal/hand data — deals are exported separately as PBN", () => {
      const xml = generateUsebioXml(makeBasicGameData());

      // The USEBIO file carries players + results only; the dealt cards and the
      // board vulnerability travel in the separate PBN export (BridgeWebs takes
      // both files).
      expect(xml).not.toContain("<HAND>");
      expect(xml).not.toContain("<VULNERABILITY>");
      expect(xml).not.toContain("<SPADES>");
      expect(xml).not.toContain("<HEARTS>");
      expect(xml).not.toContain("<DIAMONDS>");
      expect(xml).not.toContain("<CLUBS>");
    });
  });

  describe("multi-section events", () => {
    // A two-section game: sections A and B each have their own pairs playing the
    // same board numbers. Pair numbers are unprefixed and carry a `section`.
    function makeTwoSectionData(): UsebioPairsData {
      const base = makeBasicGameData();
      return {
        ...base,
        sections: ["A", "B"],
        pairs: [
          { ...base.pairs[0], section: "A" },
          { ...base.pairs[2], section: "A" },
          { ...base.pairs[0], section: "B" },
          { ...base.pairs[2], section: "B" },
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
            section: "A",
          },
          {
            table: 1,
            board: 1,
            round: 1,
            nsPairNumber: "1NS",
            ewPairNumber: "1EW",
            outcome: "4SE-1",
            lead: "SA",
            section: "B",
          },
        ],
      };
    }

    it("emits one SECTION per section with the right SECTION_COUNT", () => {
      const xml = generateUsebioXml(makeTwoSectionData());
      expect(xml).toContain("<SECTION_COUNT>2</SECTION_COUNT>");
      expect(xml).toContain('<SECTION SECTION_ID="A">');
      expect(xml).toContain('<SECTION SECTION_ID="B">');
      // Both sections live under one SESSION.
      expect(xml.match(/<SESSION /g)?.length).toBe(1);
      expect(xml.match(/<SECTION /g)?.length).toBe(2);
    });

    it("does not prefix pair numbers with the section id", () => {
      const xml = generateUsebioXml(makeTwoSectionData());
      expect(xml).toContain("<PAIR_NUMBER>1NS</PAIR_NUMBER>");
      expect(xml).toContain("<PAIR_NUMBER>1EW</PAIR_NUMBER>");
      // The prefixed form must never appear.
      expect(xml).not.toContain("A1NS");
      expect(xml).not.toContain("B1NS");
    });

    it("places each section's boards under its own SECTION", () => {
      const xml = generateUsebioXml(makeTwoSectionData());
      const sectionA = xml
        .split('SECTION_ID="A"')[1]
        .split('SECTION_ID="B"')[0];
      const sectionB = xml.split('SECTION_ID="B"')[1];
      // Section A's board 1 was 3NT; section B's board 1 was 4S.
      expect(sectionA).toContain("<CONTRACT>3NT</CONTRACT>");
      expect(sectionA).not.toContain("<CONTRACT>4S</CONTRACT>");
      expect(sectionB).toContain("<CONTRACT>4S</CONTRACT>");
      expect(sectionB).not.toContain("<CONTRACT>3NT</CONTRACT>");
    });

    it("still emits a single SECTION when no section list is given", () => {
      const xml = generateUsebioXml(makeBasicGameData());
      expect(xml).toContain("<SECTION_COUNT>1</SECTION_COUNT>");
      expect(xml.match(/<SECTION /g)?.length).toBe(1);
    });
  });

  describe("scoring type mapping", () => {
    it("maps MP to MATCH_POINTS", () => {
      const data = makeBasicGameData();
      data.scoringType = "MP";
      const xml = generateUsebioXml(data);
      expect(xml).toContain(
        "<BOARD_SCORING_METHOD>MATCH_POINTS</BOARD_SCORING_METHOD>",
      );
    });

    it("maps IMP_VP to BUTLER", () => {
      const data = makeBasicGameData();
      data.scoringType = "IMP_VP";
      const xml = generateUsebioXml(data);
      expect(xml).toContain(
        "<BOARD_SCORING_METHOD>BUTLER</BOARD_SCORING_METHOD>",
      );
    });

    it("maps IMP (aggregate) to IMPS", () => {
      const data = makeBasicGameData();
      data.scoringType = "IMP";
      const xml = generateUsebioXml(data);
      expect(xml).toContain("<BOARD_SCORING_METHOD>IMPS</BOARD_SCORING_METHOD>");
    });

    it("maps XIMP to CROSS_IMPS", () => {
      const data = makeBasicGameData();
      data.scoringType = "XIMP";
      const xml = generateUsebioXml(data);
      expect(xml).toContain(
        "<BOARD_SCORING_METHOD>CROSS_IMPS</BOARD_SCORING_METHOD>",
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
      // Still produces a valid section with participants, just no BOARD rows.
      expect(xml).toMatch(/SECTION/);
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
      expect(xml).toContain("<BOARD_NUMBER>1</BOARD_NUMBER>");
      expect(xml).toContain("<SCORE>90</SCORE>");
    });

    it("uses section A when sectionName is empty", () => {
      const data = makeBasicGameData();
      data.sectionName = "";
      const xml = generateUsebioXml(data);
      expect(xml).toContain('<SECTION SECTION_ID="A">');
    });

    it("falls back to MATCH_POINTS for unknown scoring type", () => {
      const data = makeBasicGameData();
      (data as any).scoringType = "UNKNOWN_TYPE";
      const xml = generateUsebioXml(data);
      expect(xml).toContain(
        "<BOARD_SCORING_METHOD>MATCH_POINTS</BOARD_SCORING_METHOD>",
      );
    });

    it("returns raw date string for invalid date", () => {
      const data = makeBasicGameData();
      data.eventDate = "not-a-valid-date";
      const xml = generateUsebioXml(data);
      expect(xml).toContain("<DATE>not-a-valid-date</DATE>");
    });

    it("handles NP (not-played) outcomes with blank detail and null score", () => {
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
      expect(xml).toContain("<PLAYED_BY/>");
      expect(xml).toContain("<TRICKS/>");
      expect(xml).toContain("<SCORE>0</SCORE>");
    });

    it("omits NATIONAL_ID_NUMBER when player has no nationalId", () => {
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
  });

  describe("adjusted scores (A<ns>/<ew> outcomes)", () => {
    // Two lines on the same board so results.length - 1 > 0 (a non-zero max),
    // giving meaningful matchpoints / percentages for the adjusted rows.
    function makeAdjustedData(
      scoringType: UsebioPairsData["scoringType"],
      nsPercent: number,
      ewPercent: number,
    ): UsebioPairsData {
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
      // Blank contract fields + zero score for the adjusted line.
      expect(xml).toContain("<CONTRACT/>");
      expect(xml).toContain("<SCORE>0</SCORE>");
      // maxMp = 2 * (2 - 1) = 2. NS 60% -> round(0.6*2)=1, EW 40% -> round(0.4*2)=1.
      expect(xml).toContain("<NS_MATCH_POINTS>1</NS_MATCH_POINTS>");
      expect(xml).toContain("<EW_MATCH_POINTS>1</EW_MATCH_POINTS>");
    });

    it("emits AVE+ (>50%) as +3 IMPs and AVE- (<50%) as -3 IMPs for IMP scoring", () => {
      const xml = generateUsebioXml(makeAdjustedData("IMP", 60, 40));
      expect(xml).toContain("<NS_IMPS>3</NS_IMPS>");
      expect(xml).toContain("<EW_IMPS>-3</EW_IMPS>");
    });

    it("emits AVE (50%) as 0 IMPs for XIMP scoring", () => {
      const xml = generateUsebioXml(makeAdjustedData("XIMP", 50, 50));
      expect(xml).toContain("<NS_IMPS>0</NS_IMPS>");
      expect(xml).toContain("<EW_IMPS>0</EW_IMPS>");
    });

    it("keeps adjusted-score pairs in the participants list with a placing", () => {
      const xml = generateUsebioXml(makeAdjustedData("MP", 60, 40));
      // The adjusted-score pairs still appear as participants with a placing.
      expect(xml).toContain("<PAIR_NUMBER>1NS</PAIR_NUMBER>");
      expect(xml).toContain("<PAIR_NUMBER>1EW</PAIR_NUMBER>");
      expect(xml).toContain("<PLACE>");
    });

    it("lists adjusted IMP-scored pairs as participants", () => {
      const xml = generateUsebioXml(makeAdjustedData("IMP", 60, 40));
      expect(xml).toContain("<PAIR_NUMBER>1NS</PAIR_NUMBER>");
      expect(xml).toContain("<PAIR_NUMBER>1EW</PAIR_NUMBER>");
    });

    it("gives a 0.00 percentage to a lone adjusted MP result (zero max)", () => {
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
      // With max 0, the inline percentage is the "0.00" fallback.
      expect(xml).toContain("<PAIR_NUMBER>1NS</PAIR_NUMBER>");
      expect(xml).toContain("<PERCENTAGE>0.00</PERCENTAGE>");
    });
  });

  describe("multi-section output", () => {
    function makeMultiSectionData(): UsebioPairsData {
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

    it("lists every pair as a participant under the single section", () => {
      const xml = generateUsebioXml(makeMultiSectionData());
      expect(xml).toContain("<PAIR_NUMBER>A1NS</PAIR_NUMBER>");
      expect(xml).toContain("<PAIR_NUMBER>B1NS</PAIR_NUMBER>");
      // The export nests all pairs under one SECTION (the game's section id).
      expect(xml).toContain('<SECTION SECTION_ID="A">');
    });

    it("uses the game's section id on the SECTION element", () => {
      const xml = generateUsebioXml(makeBasicGameData());
      expect(xml).toContain('<SECTION SECTION_ID="A">');
    });
  });

  describe("Swiss Pairs (SWISS_PAIRS)", () => {
    function makeSwissPairsData(): UsebioSwissPairsData {
      return {
        kind: "SWISS_PAIRS",
        club: { name: "Test Bridge Club", clubNumber: "12345" },
        eventName: "Tuesday Swiss Pairs",
        eventDate: "2024-11-18T00:00:00.000Z",
        sectionName: "A",
        boards: 2,
        pairs: [
          {
            pairNumber: "3",
            direction: "N",
            player1: { firstName: "Al", lastName: "A", nationalId: null },
            player2: { firstName: "Bo", lastName: "B", nationalId: null },
          },
          {
            pairNumber: "12",
            direction: "E",
            player1: { firstName: "Cy", lastName: "C", nationalId: null },
            player2: { firstName: "Di", lastName: "D", nationalId: null },
          },
        ],
        matches: [
          {
            round: 1,
            nsPairNumber: "3",
            ewPairNumber: "12",
            nsScore: 15,
            ewScore: 5,
            boards: [
              {
                boardNumber: 1,
                contract: "3NT",
                playedBy: "N",
                lead: "S4",
                tricks: "9",
                score: "400",
              },
            ],
          },
        ],
        ranking: [
          { number: "3", sectionId: "A", totalVP: 15, place: 1 },
          { number: "12", sectionId: "A", totalVP: 5, place: 2 },
        ],
      };
    }

    it("uses the SWISS_PAIRS event type and VPS match scoring", () => {
      const xml = generateUsebioXml(makeSwissPairsData());
      expect(xml).toContain('<EVENT EVENT_TYPE="SWISS_PAIRS">');
      expect(xml).toContain("<MATCH_SCORING_METHOD>VPS</MATCH_SCORING_METHOD>");
    });

    it("nests everything in SESSION > SECTION", () => {
      const xml = generateUsebioXml(makeSwissPairsData());
      expect(xml).toContain('<SESSION SESSION_ID="1">');
      expect(xml).toContain('<SECTION SECTION_ID="A">');
    });

    it("lists pairs in a global PARTICIPANTS roster with inline placings", () => {
      const xml = generateUsebioXml(makeSwissPairsData());
      expect(xml).toContain("<PAIR_NUMBER>3</PAIR_NUMBER>");
      expect(xml).toContain("<PAIR_NUMBER>12</PAIR_NUMBER>");
      expect(xml).toContain("<PLAYER_NAME>Al A</PLAYER_NAME>");
      // Inline placing: total VP + place per pair (integer VPs).
      expect(xml).toContain("<TOTAL_SCORE>15</TOTAL_SCORE>");
      expect(xml).toContain("<PLACE>1</PLACE>");
    });

    it("emits a MATCH per round with pair numbers and VP scores at match level", () => {
      const xml = generateUsebioXml(makeSwissPairsData());
      const match = xml.split("<MATCH>")[1].split("</MATCH>")[0];
      expect(match).toContain("<ROUND_NUMBER>1</ROUND_NUMBER>");
      expect(match).toContain("<NS_PAIR_NUMBER>3</NS_PAIR_NUMBER>");
      expect(match).toContain("<EW_PAIR_NUMBER>12</EW_PAIR_NUMBER>");
      expect(match).toContain("<NS_SCORE>15</NS_SCORE>");
      expect(match).toContain("<EW_SCORE>5</EW_SCORE>");
    });

    it("nests BOARD/TRAVELLER_LINE without repeating pair numbers", () => {
      const xml = generateUsebioXml(makeSwissPairsData());
      const match = xml.split("<MATCH>")[1].split("</MATCH>")[0];
      const traveller = match
        .split("<TRAVELLER_LINE>")[1]
        .split("</TRAVELLER_LINE>")[0];
      expect(match).toContain("<BOARD_NUMBER>1</BOARD_NUMBER>");
      expect(traveller).toContain("<CONTRACT>3NT</CONTRACT>");
      expect(traveller).toContain("<PLAYED_BY>N</PLAYED_BY>");
      expect(traveller).toContain("<LEAD>S4</LEAD>");
      expect(traveller).toContain("<TRICKS>9</TRICKS>");
      expect(traveller).toContain("<SCORE>400</SCORE>");
      // Pair numbers are NOT repeated inside the traveller line.
      expect(traveller).not.toContain("NS_PAIR_NUMBER");
    });

    it("does not emit a separate RANKING block (placings are inline)", () => {
      const xml = generateUsebioXml(makeSwissPairsData());
      expect(xml).not.toContain("<RANKING>");
    });

    it("defaults a blank section name to 'A'", () => {
      const data = makeSwissPairsData();
      data.sectionName = "";
      const xml = generateUsebioXml(data);
      expect(xml).toContain('<SECTION SECTION_ID="A">');
    });

    it("omits inline placing for a pair with no ranking entry", () => {
      const data = makeSwissPairsData();
      // Drop the ranking for pair "12": its PAIR block must carry no
      // TOTAL_SCORE/PLACE, but the pair is still listed.
      data.ranking = data.ranking.filter((r) => r.number !== "12");
      const xml = generateUsebioXml(data);

      const pair12 = xml
        .split("<PAIR_NUMBER>12</PAIR_NUMBER>")[1]
        .split("</PAIR>")[0];
      expect(pair12).not.toContain("<TOTAL_SCORE>");
      expect(pair12).not.toContain("<PLACE>");
      // The ranked pair still shows its placing.
      expect(xml).toContain("<TOTAL_SCORE>15</TOTAL_SCORE>");
    });
  });

  describe("Swiss Teams (SWISS_TEAMS)", () => {
    function makeSwissTeamsData(): UsebioSwissTeamsData {
      return {
        kind: "SWISS_TEAMS",
        club: { name: "Test Bridge Club", clubNumber: "12345" },
        eventName: "Wednesday Swiss Teams",
        eventDate: "2024-11-18T00:00:00.000Z",
        sectionName: "A",
        boards: 5,
        teams: [
          {
            teamNumber: "11",
            teamName: "Sharks",
            sectionId: "A",
            players: [
              { firstName: "Al", lastName: "A", nationalId: null },
              { firstName: "Bo", lastName: "B", nationalId: null },
              { firstName: "Cy", lastName: "C", nationalId: null },
              { firstName: "Di", lastName: "D", nationalId: null },
            ],
          },
          {
            teamNumber: "2",
            teamName: "Dragons",
            sectionId: "A",
            players: [
              { firstName: "Ed", lastName: "E", nationalId: null },
              { firstName: "Fi", lastName: "F", nationalId: null },
              { firstName: "Gu", lastName: "G", nationalId: null },
              { firstName: "Ha", lastName: "H", nationalId: null },
            ],
          },
        ],
        matches: [
          {
            round: 2,
            team: "11",
            opposingTeam: "2",
            startBoard: 6,
            endBoard: 10,
            teamScore: 19,
            opposingTeamScore: 1,
            boards: [
              {
                boardNumber: 6,
                imps: 10,
                travellerLines: [
                  {
                    direction: "NS",
                    contract: "4 H",
                    playedBy: "S",
                    lead: "DK",
                    tricks: "10",
                    score: "420",
                  },
                ],
              },
            ],
          },
        ],
        ranking: [
          { number: "11", sectionId: "A", totalVP: 19, place: 1 },
          { number: "2", sectionId: "A", totalVP: 1, place: 2 },
        ],
      };
    }

    it("uses the SWISS_TEAMS event type and VPS match scoring", () => {
      const xml = generateUsebioXml(makeSwissTeamsData());
      expect(xml).toContain('<EVENT EVENT_TYPE="SWISS_TEAMS">');
      expect(xml).toContain("<MATCH_SCORING_METHOD>VPS</MATCH_SCORING_METHOD>");
    });

    it("nests everything in SESSION > SECTION", () => {
      const xml = generateUsebioXml(makeSwissTeamsData());
      expect(xml).toContain('<SESSION SESSION_ID="1">');
      expect(xml).toContain('<SECTION SECTION_ID="A">');
    });

    it("lists teams (number, name, placing, four players) in PARTICIPANTS", () => {
      const xml = generateUsebioXml(makeSwissTeamsData());
      expect(xml).toContain('TEAM_ID="11"');
      expect(xml).toContain('TEAM_NAME="Sharks"');
      expect(xml).toContain("<PLAYER_NAME>Al A</PLAYER_NAME>");
      expect(xml).toContain("<PLAYER_NAME>Di D</PLAYER_NAME>");
      // Inline placing on the team.
      expect(xml).toContain("<TOTAL_SCORE>19</TOTAL_SCORE>");
      expect(xml).toContain("<PLACE>1</PLACE>");
    });

    it("emits a MATCH with the competing teams, board range and VP scores", () => {
      const xml = generateUsebioXml(makeSwissTeamsData());
      const match = xml.split("<MATCH>")[1].split("</MATCH>")[0];
      expect(match).toContain("<ROUND_NUMBER>2</ROUND_NUMBER>");
      expect(match).toContain("<TEAM>11</TEAM>");
      expect(match).toContain("<OPPOSING_TEAM>2</OPPOSING_TEAM>");
      expect(match).toContain("<START_BOARD_NUMBER>6</START_BOARD_NUMBER>");
      expect(match).toContain("<END_BOARD_NUMBER>10</END_BOARD_NUMBER>");
      expect(match).toContain("<TEAM_SCORE>19</TEAM_SCORE>");
      expect(match).toContain("<OPPOSING_TEAM_SCORE>1</OPPOSING_TEAM_SCORE>");
    });

    it("writes a triangle as three MATCH nodes sharing one ROUND_NUMBER", () => {
      // A triangle is three ordinary MATCH nodes with the same round: the
      // writer just iterates data.matches, so three same-round entries emit
      // three <MATCH> blocks.
      const data = makeSwissTeamsData();
      const triBoard = {
        boardNumber: 1,
        imps: 0,
        travellerLines: [],
      };
      data.matches = [
        { round: 1, team: "11", opposingTeam: "2", startBoard: 1, endBoard: 4, teamScore: 13, opposingTeamScore: 7, boards: [triBoard] },
        { round: 1, team: "11", opposingTeam: "3", startBoard: 1, endBoard: 4, teamScore: 12, opposingTeamScore: 8, boards: [triBoard] },
        { round: 1, team: "2", opposingTeam: "3", startBoard: 1, endBoard: 4, teamScore: 11, opposingTeamScore: 9, boards: [triBoard] },
      ];

      const xml = generateUsebioXml(data);
      const matchBlocks = xml.match(/<MATCH>/g) ?? [];
      expect(matchBlocks).toHaveLength(3);
      // All three carry the same round number.
      expect(xml.match(/<ROUND_NUMBER>1<\/ROUND_NUMBER>/g)).toHaveLength(3);
    });

    it("emits board IMPS and a direction-tagged traveller line", () => {
      const xml = generateUsebioXml(makeSwissTeamsData());
      const board = xml
        .split('<BOARD EVENT_TYPE="SWISS_TEAMS">')[1]
        .split("</BOARD>")[0];
      expect(board).toContain("<BOARD_NUMBER>6</BOARD_NUMBER>");
      expect(board).toContain("<IMPS>10</IMPS>");
      expect(board).toContain("<DIRECTION>NS</DIRECTION>");
      expect(board).toContain("<CONTRACT>4 H</CONTRACT>");
      expect(board).toContain("<PLAYED_BY>S</PLAYED_BY>");
      expect(board).toContain("<TRICKS>10</TRICKS>");
      expect(board).toContain("<SCORE>420</SCORE>");
    });

    it("does not emit a separate RANKING block (placings are inline)", () => {
      const xml = generateUsebioXml(makeSwissTeamsData());
      expect(xml).not.toContain("<RANKING>");
    });

    it("defaults a blank section name to 'A'", () => {
      const data = makeSwissTeamsData();
      data.sectionName = "";
      const xml = generateUsebioXml(data);
      expect(xml).toContain('<SECTION SECTION_ID="A">');
    });

    it("omits inline placing for a team with no ranking entry", () => {
      const data = makeSwissTeamsData();
      // Drop the ranking for team "2": its TEAM block carries no
      // TOTAL_SCORE/PLACE but the team is still listed.
      data.ranking = data.ranking.filter((r) => r.number !== "2");
      const xml = generateUsebioXml(data);

      const team2 = xml.split('TEAM_NAME="Dragons"')[1].split("</TEAM>")[0];
      expect(team2).not.toContain("<TOTAL_SCORE>");
      expect(team2).not.toContain("<PLACE>");
      expect(xml).toContain("<TOTAL_SCORE>19</TOTAL_SCORE>");
    });
  });

  describe("kind dispatch", () => {
    it("treats a missing kind as MP_PAIRS so existing callers are unaffected", () => {
      const data = makeBasicGameData() as UsebioPairsData & {
        kind?: undefined;
      };
      data.kind = undefined;
      const xml = generateUsebioXml(data);
      // MP_PAIRS renders the PAIRS event type.
      expect(xml).toContain('<EVENT EVENT_TYPE="PAIRS">');
    });

    it("dispatches an explicit MP_PAIRS kind to the pairs generator", () => {
      const data = makeBasicGameData() as UsebioPairsData & {
        kind: "MP_PAIRS";
      };
      data.kind = "MP_PAIRS";
      const xml = generateUsebioXml(data);
      expect(xml).toContain('<EVENT EVENT_TYPE="PAIRS">');
    });
  });

  describe("Board-comparison teams", () => {
    // Build board-comparison teams data on the given scale: BAM win = 1 / tie =
    // 0.5, PAB win = 2 / tie = 1.
    function makeData(
      scoring: "BAM" | "PAB",
    ): UsebioBoardComparisonTeamsData {
      const win = scoring === "PAB" ? 2 : 1;
      const tie = win / 2;
      return {
        kind: "BOARD_COMPARISON_TEAMS",
        scoring,
        club: { name: "Test Bridge Club", clubNumber: "00987654" },
        eventName: `${scoring} Teams`,
        eventDate: "2024-11-18T00:00:00.000Z",
        sectionName: "A",
        boards: 2,
        teams: [
          {
            teamNumber: "1",
            teamName: "Sharks",
            sectionId: "A",
            players: [
              { firstName: "Ann", lastName: "One", nationalId: "1" },
              { firstName: "Bob", lastName: "Two", nationalId: null },
              { firstName: "Cy", lastName: "Three", nationalId: null },
              { firstName: "Di", lastName: "Four", nationalId: null },
            ],
          },
          {
            teamNumber: "2",
            teamName: "Dragons",
            sectionId: "A",
            players: [
              { firstName: "Ed", lastName: "Five", nationalId: null },
              { firstName: "Fi", lastName: "Six", nationalId: null },
              { firstName: "Gu", lastName: "Seven", nationalId: null },
              { firstName: "Ha", lastName: "Eight", nationalId: null },
            ],
          },
        ],
        matches: [
          {
            round: 1,
            team: "1",
            opposingTeam: "2",
            startBoard: 1,
            endBoard: 2,
            teamScore: win + tie,
            opposingTeamScore: tie,
            boards: [
              {
                boardNumber: 1,
                teamPoints: win,
                opposingTeamPoints: 0,
                travellerLines: [
                  {
                    direction: "NS",
                    contract: "4S",
                    playedBy: "N",
                    lead: "HK",
                    tricks: "10",
                    score: "420",
                  },
                  {
                    direction: "EW",
                    contract: "3NT",
                    playedBy: "N",
                    lead: "HK",
                    tricks: "9",
                    score: "400",
                  },
                ],
              },
              {
                boardNumber: 2,
                teamPoints: tie,
                opposingTeamPoints: tie,
                travellerLines: [],
              },
            ],
          },
        ],
        ranking: [
          { number: "1", sectionId: "A", totalWon: win + tie, place: 1 },
          { number: "2", sectionId: "A", totalWon: tie, place: 2 },
        ],
      };
    }

    it("emits a TEAMS event with BAM board and match scoring methods", () => {
      const xml = generateUsebioXml(makeData("BAM"));
      expect(xml).toContain('<EVENT EVENT_TYPE="TEAMS">');
      expect(xml).toContain("<BOARD_SCORING_METHOD>BAM</BOARD_SCORING_METHOD>");
      expect(xml).toContain("<MATCH_SCORING_METHOD>BAM</MATCH_SCORING_METHOD>");
    });

    it("lists teams with total points won and place", () => {
      const xml = generateUsebioXml(makeData("BAM"));
      expect(xml).toContain('<TEAM TEAM_ID="1" TEAM_NAME="Sharks">');
      expect(xml).toContain("<TOTAL_SCORE>1.5</TOTAL_SCORE>");
      expect(xml).toContain("<PLACE>1</PLACE>");
    });

    it("emits per-board TEAM_POINTS / OPPOSING_TEAM_POINTS on the BAM scale", () => {
      const xml = generateUsebioXml(makeData("BAM"));
      expect(xml).toContain("<TEAM_POINTS>1</TEAM_POINTS>");
      expect(xml).toContain("<OPPOSING_TEAM_POINTS>0</OPPOSING_TEAM_POINTS>");
      expect(xml).toContain("<TEAM_POINTS>0.5</TEAM_POINTS>");
    });

    it("emits the match board-points totals as TEAM_SCORE", () => {
      const xml = generateUsebioXml(makeData("BAM"));
      expect(xml).toContain("<TEAM_SCORE>1.5</TEAM_SCORE>");
      expect(xml).toContain("<OPPOSING_TEAM_SCORE>0.5</OPPOSING_TEAM_SCORE>");
    });

    it("does not emit cross-IMP points on traveller lines", () => {
      const xml = generateUsebioXml(makeData("BAM"));
      expect(xml).not.toContain("CROSS_IMP_POINTS");
      // The traveller detail is still present.
      expect(xml).toContain("<CONTRACT>4S</CONTRACT>");
      expect(xml).toContain("<SCORE>420</SCORE>");
    });

    it("emits PAB scoring methods and 0/1/2 points for a Point-a-Board file", () => {
      const xml = generateUsebioXml(makeData("PAB"));
      expect(xml).toContain("<BOARD_SCORING_METHOD>PAB</BOARD_SCORING_METHOD>");
      expect(xml).toContain("<MATCH_SCORING_METHOD>PAB</MATCH_SCORING_METHOD>");
      // Win board -> 2 / 0; tie board -> 1 / 1.
      expect(xml).toContain("<TEAM_POINTS>2</TEAM_POINTS>");
      expect(xml).toContain("<OPPOSING_TEAM_POINTS>0</OPPOSING_TEAM_POINTS>");
      expect(xml).toContain("<TEAM_POINTS>1</TEAM_POINTS>");
      // Match total: win(2) + tie(1) = 3 vs 1.
      expect(xml).toContain("<TEAM_SCORE>3</TEAM_SCORE>");
      expect(xml).toContain("<OPPOSING_TEAM_SCORE>1</OPPOSING_TEAM_SCORE>");
      expect(xml).not.toContain("CROSS_IMP_POINTS");
    });
  });
});
