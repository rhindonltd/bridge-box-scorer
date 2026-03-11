export class ImpTable {
  private static readonly IMP_RANGE_TABLE: ImpRange[] = [
    { start: 0, end: 10, score: 0 },
    { start: 20, end: 40, score: 1 },
    { start: 50, end: 80, score: 2 },
    { start: 90, end: 120, score: 3 },
    { start: 130, end: 160, score: 4 },
    { start: 170, end: 210, score: 5 },
    { start: 220, end: 260, score: 6 },
    { start: 270, end: 310, score: 7 },
    { start: 320, end: 360, score: 8 },
    { start: 370, end: 420, score: 9 },
    { start: 430, end: 490, score: 10 },
    { start: 500, end: 590, score: 11 },
    { start: 600, end: 740, score: 12 },
    { start: 750, end: 890, score: 13 },
    { start: 900, end: 1090, score: 14 },
    { start: 1100, end: 1290, score: 15 },
    { start: 1300, end: 1490, score: 16 },
    { start: 1500, end: 1740, score: 17 },
    { start: 1750, end: 1990, score: 18 },
    { start: 2000, end: 2240, score: 19 },
    { start: 2250, end: 2490, score: 20 },
    { start: 2500, end: 2990, score: 21 },
    { start: 3000, end: 3490, score: 22 },
    { start: 3500, end: 3990, score: 23 },
    { start: 4000, end: 7600, score: 24 },
  ];

  static calculateImps(score: number): number {
    const absScore = Math.abs(score);

    const range = this.IMP_RANGE_TABLE.find(
      (r) => r.start <= absScore && r.end >= absScore,
    );

    if (!range) {
      throw new Error("Score outside IMP table range");
    }

    return score < 0 ? -range.score : range.score;
  }
}

interface ImpRange {
  start: number;
  end: number;
  score: number;
}
