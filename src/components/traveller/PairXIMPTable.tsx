import { BoardResult } from "@/components/traveller/BoardResult";
import { TableRow } from "@/components/common/table/TableRow";
import { Table } from "@/components/common/table/Table";
import { ScoredTravellerOfType } from "@/scoring/traveller/score-traveller";

type Props = {
  scoredTraveller: ScoredTravellerOfType<"PAIR_XIMP">;
};

export function PairXIMPTable({ scoredTraveller }: Props) {
  const rows = scoredTraveller.lines
    .filter((x) => x.score !== null)
    .sort((a, b) => b.nsCrossImps - a.nsCrossImps);

  return (
    <Table
      columns={["NS", "EW", "Contract", "NS Score", "NS IMP", "EW IMP"]}
      body={rows
        .filter((x) => x.score !== null)
        .map((row, index, arr) => {
          const isLast = index === arr.length - 1;
          return (
            <TableRow
              key={index}
              cells={[
                `${row.nsId}`,
                `${row.ewId}`,
                <BoardResult key={index} boardOutcome={row.outcome} />,
                row.score,
                row.nsCrossImps.toFixed(2),
                row.ewCrossImps.toFixed(2),
              ]}
              className={isLast ? "rounded-bl-lg rounded-br-lg" : ""}
            />
          );
        })}
    />
  );
}
