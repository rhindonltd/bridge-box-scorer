import { describe, expect, it } from "vitest";
import { rank } from "./rank";

describe("rank", () => {
  it("ranks values in descending order by default", () => {
    const result = rank(
      [
        { id: "A", score: 10 },
        { id: "B", score: 30 },
        { id: "C", score: 20 },
      ],
      (x) => x.score,
    );

    expect(result).toEqual([
      {
        id: "B",
        score: 30,
        rank: 1,
        tied: false,
      },
      {
        id: "C",
        score: 20,
        rank: 2,
        tied: false,
      },
      {
        id: "A",
        score: 10,
        rank: 3,
        tied: false,
      },
    ]);
  });

  it("supports ascending ranking", () => {
    const result = rank(
      [
        { id: "A", score: 10 },
        { id: "B", score: 30 },
        { id: "C", score: 20 },
      ],
      (x) => x.score,
      { descending: false },
    );

    expect(result).toEqual([
      {
        id: "A",
        score: 10,
        rank: 1,
        tied: false,
      },
      {
        id: "C",
        score: 20,
        rank: 2,
        tied: false,
      },
      {
        id: "B",
        score: 30,
        rank: 3,
        tied: false,
      },
    ]);
  });

  it("assigns equal rank to tied values", () => {
    const result = rank(
      [
        { id: "A", score: 100 },
        { id: "B", score: 100 },
        { id: "C", score: 50 },
      ],
      (x) => x.score,
    );

    expect(result).toEqual([
      {
        id: "A",
        score: 100,
        rank: 1,
        tied: true,
      },
      {
        id: "B",
        score: 100,
        rank: 1,
        tied: true,
      },
      {
        id: "C",
        score: 50,
        rank: 3,
        tied: false,
      },
    ]);
  });

  it("handles multiple tie groups", () => {
    const result = rank(
      [
        { id: "A", score: 100 },
        { id: "B", score: 100 },
        { id: "C", score: 50 },
        { id: "D", score: 50 },
        { id: "E", score: 10 },
      ],
      (x) => x.score,
    );

    expect(result).toEqual([
      {
        id: "A",
        score: 100,
        rank: 1,
        tied: true,
      },
      {
        id: "B",
        score: 100,
        rank: 1,
        tied: true,
      },
      {
        id: "C",
        score: 50,
        rank: 3,
        tied: true,
      },
      {
        id: "D",
        score: 50,
        rank: 3,
        tied: true,
      },
      {
        id: "E",
        score: 10,
        rank: 5,
        tied: false,
      },
    ]);
  });

  it("uses epsilon when comparing values", () => {
    const result = rank(
      [
        { id: "A", score: 100 },
        { id: "B", score: 100.00005 },
        { id: "C", score: 90 },
      ],
      (x) => x.score,
      { epsilon: 0.001 },
    );

    expect(result[0].rank).toBe(1);
    expect(result[1].rank).toBe(1);

    expect(result[0].tied).toBe(true);
    expect(result[1].tied).toBe(true);

    expect(result[2].rank).toBe(3);
  });

  it("does not tie values outside epsilon", () => {
    const result = rank(
      [
        { id: "A", score: 100 },
        { id: "B", score: 100.01 },
      ],
      (x) => x.score,
      { epsilon: 0.001 },
    );

    expect(result).toEqual([
      {
        id: "B",
        score: 100.01,
        rank: 1,
        tied: false,
      },
      {
        id: "A",
        score: 100,
        rank: 2,
        tied: false,
      },
    ]);
  });

  it("returns an empty array for empty input", () => {
    expect(rank([], () => 0)).toEqual([]);
  });

  it("does not mutate the source array", () => {
    const rows = [
      { id: "A", score: 10 },
      { id: "B", score: 30 },
      { id: "C", score: 20 },
    ];

    const original = [...rows];

    rank(rows, (x) => x.score);

    expect(rows).toEqual(original);
  });

  it("marks single rows as not tied", () => {
    const result = rank([{ id: "A", score: 100 }], (x) => x.score);

    expect(result).toEqual([
      {
        id: "A",
        score: 100,
        rank: 1,
        tied: false,
      },
    ]);
  });
});
