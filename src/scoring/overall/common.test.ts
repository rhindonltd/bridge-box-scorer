import { describe, it, expect } from "vitest";
import { buildOverallScore } from "./common";

describe("buildOverallScore", () => {
  it("aggregates values across travellers for same id", () => {
    const travellers = [
      { lines: [{ id: "A", value: 10 }, { id: "B", value: 5 }] },
      { lines: [{ id: "A", value: 8 }, { id: "B", value: 12 }] },
    ];

    const result = buildOverallScore({
      travellers,
      project: (line) => [{ id: line.id, value: line.value }],
      toResult: (id, data) => ({
        id,
        total: data.value,
        boards: data.boards,
      }),
      sort: (r) => r.total,
    });

    const a = result.find((r) => r.id === "A")!;
    const b = result.find((r) => r.id === "B")!;

    expect(a.total).toBe(18);
    expect(a.boards).toBe(2);
    expect(b.total).toBe(17);
    expect(b.boards).toBe(2);
  });

  it("ranks results by sort value descending by default", () => {
    const travellers = [
      { lines: [{ id: "A", value: 5 }, { id: "B", value: 10 }] },
    ];

    const result = buildOverallScore({
      travellers,
      project: (line) => [{ id: line.id, value: line.value }],
      toResult: (id, data) => ({ id, total: data.value, boards: data.boards }),
      sort: (r) => r.total,
    });

    expect(result[0].id).toBe("B");
    expect(result[0].rank).toBe(1);
    expect(result[1].id).toBe("A");
    expect(result[1].rank).toBe(2);
  });

  it("handles multiple projections per line", () => {
    const travellers = [
      {
        lines: [
          { nsId: "1", ewId: "2", nsVal: 4, ewVal: 0 },
          { nsId: "3", ewId: "1", nsVal: 2, ewVal: 6 },
        ],
      },
    ];

    const result = buildOverallScore({
      travellers,
      project: (line) => [
        { id: line.nsId, value: line.nsVal },
        { id: line.ewId, value: line.ewVal },
      ],
      toResult: (id, data) => ({ id, total: data.value, boards: data.boards }),
      sort: (r) => r.total,
    });

    const p1 = result.find((r) => r.id === "1")!;
    expect(p1.total).toBe(10); // 4 + 6
    expect(p1.boards).toBe(2);
  });

  it("returns empty array for empty travellers", () => {
    const result = buildOverallScore({
      travellers: [],
      project: (line: any) => [{ id: line.id, value: line.value }],
      toResult: (id, data) => ({ id, total: data.value }),
      sort: (r) => r.total,
    });

    expect(result).toEqual([]);
  });

  it("handles tied results", () => {
    const travellers = [
      { lines: [{ id: "A", value: 10 }, { id: "B", value: 10 }] },
    ];

    const result = buildOverallScore({
      travellers,
      project: (line) => [{ id: line.id, value: line.value }],
      toResult: (id, data) => ({ id, total: data.value, boards: data.boards }),
      sort: (r) => r.total,
    });

    expect(result[0].rank).toBe(1);
    expect(result[1].rank).toBe(1);
    expect(result[0].tied).toBe(true);
    expect(result[1].tied).toBe(true);
  });
});
