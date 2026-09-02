import { RecommendationEntry } from "./recommendation-types";

/**
 * Curated movement recommendations per table count.
 *
 * Hand-authored from the guidance at
 * https://www.bridgescoreplus.com/movements/recommended.html
 * (recommended movements for pair events), summarized for a snappy director
 * decision. Content was rephrased for compliance with licensing restrictions.
 *
 * Scope: pairs only, integer table counts 2-20 (where the system has concrete
 * movements). Each entry names a movement family; a recommendation is only
 * surfaced when a concrete available movement (generated Mitchell family or a
 * seeded DB spec) matches that family for the table count.
 *
 * `preference` follows the ordering on the reference page (1 = most
 * recommended) and is used only as an ordering tie-breaker. The primary
 * ordering key is boards-a-pair-plays (see matchRecommendations).
 *
 * `targetRounds` / `targetBoardsPerRound` express the reference page's stated
 * profile. For generated Mitchell families they also fix the boards-per-round
 * used to build the movement (there is no boards-per-round stepper).
 * `fallbackBoardsPerPair` is used for ordering when a matched movement does not
 * expose its own numbers.
 */
export const RECOMMENDED_MOVEMENTS: Record<number, RecommendationEntry[]> = {
  2: [
    {
      family: "HOWELL",
      preference: 1,
      targetRounds: 3,
      targetBoardsPerRound: 9,
      fallbackBoardsPerPair: 27,
      pros: [
        "Every pair plays every other pair",
        "Can run as 27, 24 or 21 boards",
      ],
      cons: [
        "Both tables share boards each round",
        "One stationary pair only",
      ],
      note: "Shuffle and copy later-round boards in advance if you can.",
    },
  ],

  3: [
    {
      family: "HOWELL",
      preference: 1,
      targetRounds: 5,
      targetBoardsPerRound: 5,
      fallbackBoardsPerPair: 25,
      pros: [
        "Every pair plays every other pair",
        "Full 25 or shorter 20 boards",
      ],
      cons: [
        "One stationary pair only",
        "All three tables share the final board set",
      ],
      note: "Shuffle and copy the last-round boards in advance if you can.",
    },
    {
      family: "MITCHELL",
      preference: 2,
      targetRounds: 3,
      targetBoardsPerRound: 8,
      fallbackBoardsPerPair: 24,
      pros: ["Simple to run", "Two-winner game"],
      cons: ["Long rounds against the same opponents", "Only three rounds"],
    },
  ],

  4: [
    {
      family: "HOWELL",
      preference: 1,
      targetRounds: 7,
      targetBoardsPerRound: 4,
      fallbackBoardsPerPair: 28,
      pros: [
        "Every pair plays every other pair",
        "Full 28 or shorter 21 boards",
      ],
      cons: ["One stationary pair only", "Frequent seat changes each round"],
    },
    {
      family: "MITCHELL",
      preference: 2,
      targetRounds: 4,
      targetBoardsPerRound: 6,
      fallbackBoardsPerPair: 24,
      pros: ["Stationary N-S pairs", "Simple, regular moves"],
      cons: ["Each pair plays only four of the other seven", "Long rounds"],
    },
  ],

  5: [
    {
      family: "HOWELL",
      preference: 1,
      targetRounds: 9,
      targetBoardsPerRound: 3,
      fallbackBoardsPerPair: 27,
      pros: ["Every pair plays every other pair", "One-winner game"],
      cons: ["One stationary pair only", "Nine short rounds to organise"],
    },
    {
      family: "MITCHELL",
      preference: 2,
      targetRounds: 5,
      targetBoardsPerRound: 5,
      fallbackBoardsPerPair: 25,
      pros: [
        "Simple two-winner game",
        "Good for novices or stationary pairs",
      ],
      cons: ["Each pair meets only half the field"],
    },
  ],

  6: [
    {
      family: "HOWELL",
      preference: 1,
      targetRounds: 9,
      targetBoardsPerRound: 3,
      fallbackBoardsPerPair: 27,
      pros: ["Best balance for six tables", "Three stationary N-S pairs"],
      cons: ["Guide cards needed for direction switches"],
    },
    {
      family: "ROVER",
      preference: 2,
      targetBoardsPerRound: 4,
      fallbackBoardsPerPair: 20,
      pros: ["Two-winner Bye-stand style game", "Familiar Mitchell moves"],
      cons: ["Sit-out pair plays only 20 boards", "Some board sharing"],
    },
  ],

  7: [
    {
      family: "HOWELL",
      preference: 1,
      targetRounds: 13,
      targetBoardsPerRound: 2,
      fallbackBoardsPerPair: 26,
      pros: [
        "Fairest: every pair plays every other",
        "26 boards in 13 rounds",
      ],
      cons: ["Only one stationary pair", "Slow: 13 rounds of seat changes"],
    },
    {
      family: "MITCHELL",
      preference: 2,
      targetRounds: 7,
      targetBoardsPerRound: 4,
      fallbackBoardsPerPair: 28,
      pros: ["Safest and easiest to run", "Runs quickly and smoothly"],
      cons: ["Each pair meets only 7 of the other 13"],
    },
  ],

  8: [
    {
      family: "HOWELL",
      preference: 3,
      targetRounds: 13,
      targetBoardsPerRound: 2,
      fallbackBoardsPerPair: 26,
      pros: ["One-winner game", "Every pair plays nearly all others"],
      cons: ["13 moving pairs; slow to reseat each round"],
    },
    {
      family: "ROVER",
      preference: 1,
      targetBoardsPerRound: 3,
      fallbackBoardsPerPair: 24,
      pros: ["All N-S meet all E-W", "Sharing rarely a problem with 3 boards"],
      cons: ["Two tables share boards each round"],
    },
    {
      family: "MITCHELL",
      preference: 2,
      targetRounds: 7,
      targetBoardsPerRound: 4,
      fallbackBoardsPerPair: 28,
      pros: ["Easiest; familiar 28 or 21 boards", "E-W skip after round four"],
      cons: ["Each pair misses one pair in the other direction"],
    },
    {
      family: "WEB",
      preference: 4,
      targetRounds: 7,
      targetBoardsPerRound: 4,
      fallbackBoardsPerPair: 28,
      pros: ["Easy to run with pre-duplicated boards"],
      cons: ["Needs two pre-made board sets", "Little gain over a Mitchell"],
    },
  ],

  9: [
    {
      family: "MITCHELL",
      preference: 1,
      targetRounds: 9,
      targetBoardsPerRound: 3,
      fallbackBoardsPerPair: 27,
      pros: [
        "Best and easiest for nine tables",
        "Can shorten to 8 or 7 rounds",
      ],
      cons: ["Two-winner game", "Each pair misses four opposing pairs"],
    },
    {
      family: "HOWELL",
      preference: 2,
      targetRounds: 9,
      targetBoardsPerRound: 3,
      fallbackBoardsPerPair: 27,
      pros: ["One-winner game", "Several stationary pairs"],
      cons: ["Pairs miss four of the 17 opponents", "More direction switches"],
    },
  ],

  10: [
    {
      family: "MITCHELL",
      preference: 1,
      targetRounds: 9,
      targetBoardsPerRound: 3,
      fallbackBoardsPerPair: 27,
      pros: ["Easiest and most common", "E-W skip after round five"],
      cons: ["Each pair misses three of the 30 boards"],
    },
    {
      family: "WEB",
      preference: 2,
      targetRounds: 9,
      targetBoardsPerRound: 3,
      fallbackBoardsPerPair: 27,
      pros: ["All pairs play all 27 boards, none missed"],
      cons: ["Needs two pre-made board sets", "Careful round-one setup"],
    },
    {
      family: "HOWELL",
      preference: 3,
      targetRounds: 9,
      targetBoardsPerRound: 3,
      fallbackBoardsPerPair: 27,
      pros: ["One-winner game", "Several stationary pairs"],
      cons: ["More direction switches to manage"],
    },
  ],

  11: [
    {
      family: "MITCHELL",
      preference: 1,
      targetRounds: 9,
      targetBoardsPerRound: 3,
      fallbackBoardsPerPair: 27,
      pros: ["Simple and familiar", "33 boards in play"],
      cons: ["All pairs miss six boards"],
    },
    {
      family: "WEB",
      preference: 2,
      targetRounds: 9,
      targetBoardsPerRound: 3,
      fallbackBoardsPerPair: 27,
      pros: ["All players play the same 27 deals"],
      cons: [
        "Best with pre-duplicated boards",
        "Careful setup at high tables",
      ],
    },
  ],

  12: [
    {
      family: "ROVER",
      preference: 1,
      targetBoardsPerRound: 2,
      fallbackBoardsPerPair: 24,
      pros: [
        "All pairs play the same 24 boards",
        "Bye-stand keeps sharing low",
      ],
      cons: ["Choose fast N-S pairs to share", "Two-winner game"],
    },
    {
      family: "MITCHELL",
      preference: 2,
      targetRounds: 9,
      targetBoardsPerRound: 3,
      fallbackBoardsPerPair: 27,
      pros: ["Standard skip Mitchell", "Familiar to players"],
      cons: ["36 boards in play; each pair misses nine"],
    },
    {
      family: "WEB",
      preference: 3,
      targetRounds: 9,
      targetBoardsPerRound: 3,
      fallbackBoardsPerPair: 27,
      pros: ["Good when more than 24 boards wanted"],
      cons: ["Needs two pre-duplicated board sets"],
    },
  ],

  13: [
    {
      family: "MITCHELL",
      preference: 1,
      targetRounds: 13,
      targetBoardsPerRound: 2,
      fallbackBoardsPerPair: 26,
      pros: [
        "Perfect number: odd tables, no skip",
        "Can end at round 12 or 11",
      ],
      cons: ["Two-winner game", "26 boards over 13 rounds"],
    },
  ],

  14: [
    {
      family: "MITCHELL",
      preference: 1,
      targetRounds: 13,
      targetBoardsPerRound: 2,
      fallbackBoardsPerPair: 26,
      pros: ["Easiest and most common", "E-W skip after round seven"],
      cons: ["Each pair misses two of the 28 boards"],
    },
    {
      family: "WEB",
      preference: 2,
      targetRounds: 13,
      targetBoardsPerRound: 2,
      fallbackBoardsPerPair: 26,
      pros: ["All pairs play all 26 boards, none missed"],
      cons: ["Needs two pre-made board sets", "Careful round-one setup"],
    },
  ],

  15: [
    {
      family: "MITCHELL",
      preference: 1,
      targetRounds: 13,
      targetBoardsPerRound: 2,
      fallbackBoardsPerPair: 26,
      pros: ["Simple and familiar", "30 boards in play"],
      cons: ["All pairs miss four boards"],
    },
    {
      family: "WEB",
      preference: 2,
      targetRounds: 13,
      targetBoardsPerRound: 2,
      fallbackBoardsPerPair: 26,
      pros: ["All players play the same 26 deals"],
      cons: [
        "Best with pre-duplicated boards",
        "Careful setup at high tables",
      ],
    },
  ],

  16: [
    {
      family: "MITCHELL",
      preference: 1,
      targetRounds: 13,
      targetBoardsPerRound: 2,
      fallbackBoardsPerPair: 26,
      pros: ["Easiest and most common", "E-W skip after round seven or eight"],
      cons: ["Each pair misses six of the 32 boards"],
    },
    {
      family: "WEB",
      preference: 2,
      targetRounds: 13,
      targetBoardsPerRound: 2,
      fallbackBoardsPerPair: 26,
      pros: [
        "All pairs play all 26 boards, none missed",
        "No need to split into sections",
      ],
      cons: ["Needs two pre-made board sets", "Careful round-one setup"],
    },
  ],

  17: [
    {
      family: "MITCHELL",
      preference: 1,
      targetRounds: 13,
      targetBoardsPerRound: 2,
      fallbackBoardsPerPair: 26,
      pros: ["Simple and familiar", "34 boards in play"],
      cons: ["All pairs miss eight boards"],
    },
    {
      family: "WEB",
      preference: 2,
      targetRounds: 13,
      targetBoardsPerRound: 2,
      fallbackBoardsPerPair: 26,
      pros: ["Single section; all play the same deals"],
      cons: [
        "Needs at least two pre-duplicated board sets",
        "High tables need close monitoring",
      ],
    },
  ],

  18: [
    {
      family: "MITCHELL",
      preference: 1,
      targetRounds: 13,
      targetBoardsPerRound: 2,
      fallbackBoardsPerPair: 26,
      pros: ["Easiest and most common", "E-W skip after round seven or nine"],
      cons: ["Each pair misses ten of the 36 boards"],
    },
    {
      family: "WEB",
      preference: 2,
      targetRounds: 13,
      targetBoardsPerRound: 2,
      fallbackBoardsPerPair: 26,
      pros: [
        "All pairs play all 26 boards, none missed",
        "No need to split into sections",
      ],
      cons: ["Needs two pre-made board sets", "Careful round-one setup"],
    },
  ],

  19: [
    {
      family: "WEB",
      preference: 1,
      targetRounds: 13,
      targetBoardsPerRound: 2,
      fallbackBoardsPerPair: 26,
      pros: ["Runs as a single section", "All play the same deals"],
      cons: [
        "Needs at least two pre-duplicated board sets",
        "High tables need close monitoring",
      ],
    },
    {
      family: "MITCHELL",
      preference: 2,
      targetRounds: 13,
      targetBoardsPerRound: 2,
      fallbackBoardsPerPair: 26,
      pros: ["Familiar movement"],
      cons: [
        "Pairs miss almost a third of the boards",
        "Extra board sets must be substituted carefully",
      ],
    },
  ],

  20: [
    {
      family: "WEB",
      preference: 1,
      targetRounds: 13,
      targetBoardsPerRound: 2,
      fallbackBoardsPerPair: 26,
      pros: [
        "All pairs play all 26 boards, none missed",
        "No need to split into sections",
      ],
      cons: ["Needs two pre-made board sets", "Careful round-one setup"],
    },
    {
      family: "MITCHELL",
      preference: 2,
      targetRounds: 13,
      targetBoardsPerRound: 2,
      fallbackBoardsPerPair: 26,
      pros: ["Familiar movement with a skip"],
      cons: [
        "Pairs miss over a third of the boards",
        "Extra board sets must be substituted carefully",
      ],
    },
  ],
};
