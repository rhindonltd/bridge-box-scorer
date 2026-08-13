import { BoardResult } from "@/components/results/traveller/BoardResult";
import { TableRow } from "@/components/common/table/TableRow";
import { Table } from "@/components/common/table/Table";
import { ScoredTravellerOfType } from "@/scoring/traveller/score-traveller";

type Props = {
  scoredTraveller: ScoredTravellerOfType<"PAIR_MP">;
};

export function PairMPPercentageTable({ scoredTraveller }: Props) {
  function mpToPercent(mp: number): number {
    const maxMP = 2 * (scoredTraveller.lines.length - 1);
    return (mp / maxMP) * 100;
  }

  const rows = scoredTraveller.lines
    .filter((x) => x.score !== null)
    .sort((a, b) => b.nsMatchPoints - a.nsMatchPoints);

  return (
    <Table
      columns={["NS", "EW", "Contract", "NS Score", "NS %", "EW %"]}
      body={rows.map((row, index) => {
        const isLast = index === rows.length - 1;

        return (
          <TableRow
            key={index}
            cells={[
              `${row.nsId}`,
              `${row.ewId}`,
              <BoardResult key={index} boardOutcome={row.outcome} />,
              row.score,
              mpToPercent(row.nsMatchPoints).toFixed(2),
              mpToPercent(row.ewMatchPoints).toFixed(2),
            ]}
            className={isLast ? "rounded-bl-lg rounded-br-lg" : ""}
          />
        );
      })}
    />
  );
}
