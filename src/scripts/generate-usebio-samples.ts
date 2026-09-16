import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

import {
  generateUsebioXml,
  UsebioPairsData,
  UsebioSwissPairsData,
  UsebioSwissTeamsData,
} from "@/lib/usebio/generate-usebio";

/**
 * Generate example USEBIO 1.2 XML files for each supported event kind
 * (MP pairs, Swiss Pairs, Swiss Teams) so they can be run through an external
 * USEBIO validator. Writes to ./usebio-samples/ at the workspace root.
 *
 * Run with: npm run usebio-samples
 *
 * The data is hand-built (not read from a game DB) so the samples are
 * self-contained and reproducible.
 */

const club = { name: "Sample Bridge Club", clubNumber: "12345" };
const eventDate = "2024-11-18T00:00:00.000Z";

/* ---------- MP Pairs ---------- */

function mpPairs(): UsebioPairsData {
  return {
    club,
    eventName: "Monday Afternoon Pairs",
    eventDate,
    scoringType: "MP",
    tables: 2,
    sectionName: "A",
    boards: 2,
    pairs: [
      {
        pairNumber: "A1NS",
        direction: "N",
        player1: { firstName: "Alice", lastName: "Smith", nationalId: "111111" },
        player2: { firstName: "Bob", lastName: "Jones", nationalId: "222222" },
      },
      {
        pairNumber: "A2NS",
        direction: "N",
        player1: { firstName: "Carol", lastName: "Brown", nationalId: "333333" },
        player2: { firstName: "Dave", lastName: "White", nationalId: "444444" },
      },
      {
        pairNumber: "A1EW",
        direction: "E",
        player1: { firstName: "Eve", lastName: "Green", nationalId: "555555" },
        player2: { firstName: "Frank", lastName: "Black", nationalId: "666666" },
      },
      {
        pairNumber: "A2EW",
        direction: "E",
        player1: { firstName: "Grace", lastName: "Red", nationalId: "777777" },
        player2: { firstName: "Henry", lastName: "Blue", nationalId: "888888" },
      },
    ],
    boardResults: [
      {
        table: 1,
        board: 1,
        round: 1,
        nsPairNumber: "A1NS",
        ewPairNumber: "A1EW",
        outcome: "3NTN+1",
        lead: "HK",
      },
      {
        table: 2,
        board: 1,
        round: 1,
        nsPairNumber: "A2NS",
        ewPairNumber: "A2EW",
        outcome: "3NTN=",
        lead: "H5",
      },
      {
        table: 1,
        board: 2,
        round: 1,
        nsPairNumber: "A1NS",
        ewPairNumber: "A1EW",
        outcome: "4SE-1",
        lead: "SA",
      },
      {
        table: 2,
        board: 2,
        round: 1,
        nsPairNumber: "A2NS",
        ewPairNumber: "A2EW",
        outcome: "4SE=",
        lead: "CQ",
      },
    ],
  };
}

/* ---------- Swiss Pairs ---------- */

function swissPairs(): UsebioSwissPairsData {
  return {
    kind: "SWISS_PAIRS",
    club,
    eventName: "Tuesday Swiss Pairs",
    eventDate,
    sectionName: "A",
    boards: 4,
    pairs: [
      {
        pairNumber: "1",
        direction: "N",
        player1: { firstName: "Alice", lastName: "Smith", nationalId: "111111" },
        player2: { firstName: "Bob", lastName: "Jones", nationalId: "222222" },
      },
      {
        pairNumber: "2",
        direction: "N",
        player1: { firstName: "Carol", lastName: "Brown", nationalId: "333333" },
        player2: { firstName: "Dave", lastName: "White", nationalId: "444444" },
      },
      {
        pairNumber: "3",
        direction: "E",
        player1: { firstName: "Eve", lastName: "Green", nationalId: "555555" },
        player2: { firstName: "Frank", lastName: "Black", nationalId: "666666" },
      },
      {
        pairNumber: "4",
        direction: "E",
        player1: { firstName: "Grace", lastName: "Red", nationalId: "777777" },
        player2: { firstName: "Henry", lastName: "Blue", nationalId: "888888" },
      },
    ],
    matches: [
      {
        round: 1,
        nsPairNumber: "1",
        ewPairNumber: "3",
        nsScore: 15,
        ewScore: 5,
        boards: [
          {
            boardNumber: 1,
            contract: "3NT",
            playedBy: "N",
            lead: "S4",
            tricks: "10",
            score: "430",
          },
          {
            boardNumber: 2,
            contract: "4H",
            playedBy: "S",
            lead: "CA",
            tricks: "10",
            score: "420",
          },
        ],
      },
      {
        round: 1,
        nsPairNumber: "2",
        ewPairNumber: "4",
        nsScore: 8,
        ewScore: 12,
        boards: [
          {
            boardNumber: 1,
            contract: "4S",
            playedBy: "E",
            lead: "HK",
            tricks: "10",
            score: "-420",
          },
          {
            boardNumber: 2,
            contract: "2NT",
            playedBy: "N",
            lead: "D6",
            tricks: "8",
            score: "120",
          },
        ],
      },
      {
        round: 2,
        nsPairNumber: "1",
        ewPairNumber: "4",
        nsScore: 12,
        ewScore: 8,
        boards: [
          {
            boardNumber: 3,
            contract: "3S",
            playedBy: "N",
            lead: "DA",
            tricks: "9",
            score: "140",
          },
          {
            boardNumber: 4,
            contract: "5Cx",
            playedBy: "E",
            lead: "SK",
            tricks: "10",
            score: "100",
          },
        ],
      },
      {
        round: 2,
        nsPairNumber: "2",
        ewPairNumber: "3",
        nsScore: 10,
        ewScore: 10,
        boards: [
          {
            boardNumber: 3,
            contract: "3NT",
            playedBy: "S",
            lead: "H2",
            tricks: "9",
            score: "400",
          },
          {
            boardNumber: 4,
            contract: "3NT",
            playedBy: "W",
            lead: "SJ",
            tricks: "9",
            score: "-400",
          },
        ],
      },
    ],
    ranking: [
      { number: "1", sectionId: "A", totalVP: 27, place: 1 },
      { number: "4", sectionId: "A", totalVP: 20, place: 2 },
      { number: "2", sectionId: "A", totalVP: 18, place: 3 },
      { number: "3", sectionId: "A", totalVP: 15, place: 4 },
    ],
  };
}

/* ---------- Swiss Teams ---------- */

function swissTeams(): UsebioSwissTeamsData {
  const player = (firstName: string, lastName: string, nationalId: string) => ({
    firstName,
    lastName,
    nationalId,
  });

  return {
    kind: "SWISS_TEAMS",
    club,
    eventName: "Wednesday Swiss Teams",
    eventDate,
    sectionName: "A",
    boards: 4,
    teams: [
      {
        teamNumber: "1",
        teamName: "Sharks",
        sectionId: "A",
        players: [
          player("Alice", "Smith", "111111"),
          player("Bob", "Jones", "222222"),
          player("Carol", "Brown", "333333"),
          player("Dave", "White", "444444"),
        ],
      },
      {
        teamNumber: "2",
        teamName: "Dragons",
        sectionId: "A",
        players: [
          player("Eve", "Green", "555555"),
          player("Frank", "Black", "666666"),
          player("Grace", "Red", "777777"),
          player("Henry", "Blue", "888888"),
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
        teamScore: 14,
        opposingTeamScore: 6,
        boards: [
          {
            boardNumber: 1,
            imps: 6,
            travellerLines: [
              {
                direction: "NS",
                contract: "4S",
                playedBy: "S",
                lead: "DK",
                tricks: "11",
                score: "450",
              },
              {
                direction: "EW",
                contract: "4S",
                playedBy: "N",
                lead: "DA",
                tricks: "10",
                score: "-420",
              },
            ],
          },
          {
            boardNumber: 2,
            imps: -5,
            travellerLines: [
              {
                direction: "NS",
                contract: "3NT",
                playedBy: "N",
                lead: "H6",
                tricks: "8",
                score: "-50",
              },
              {
                direction: "EW",
                contract: "3NT",
                playedBy: "S",
                lead: "HQ",
                tricks: "9",
                score: "400",
              },
            ],
          },
        ],
      },
    ],
    ranking: [
      { number: "1", sectionId: "A", totalVP: 14, place: 1 },
      { number: "2", sectionId: "A", totalVP: 6, place: 2 },
    ],
  };
}

/* ---------- write files ---------- */

function main() {
  const outDir = path.join(process.cwd(), "usebio-samples");
  mkdirSync(outDir, { recursive: true });

  const files: Array<[string, string]> = [
    ["mp-pairs.xml", generateUsebioXml(mpPairs())],
    ["swiss-pairs.xml", generateUsebioXml(swissPairs())],
    ["swiss-teams.xml", generateUsebioXml(swissTeams())],
  ];

  for (const [name, xml] of files) {
    const filePath = path.join(outDir, name);
    writeFileSync(filePath, xml + "\n", "utf8");
    console.log(`✅ Wrote ${filePath}`);
  }

  process.exit(0);
}

main();
