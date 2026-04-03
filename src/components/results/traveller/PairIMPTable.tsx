import { ScoredPairIMPTraveller } from "@/model/scored-traveller";
import { BoardResult } from "@/components/results/traveller/BoardResult";
import { TableRow } from "@/components/common/table/TableRow";
import { Table } from "@/components/common/table/Table";

type Props = {
  scoredTraveller: ScoredPairIMPTraveller;
};

export function PairIMPTable({ scoredTraveller }: Props) {
  return (
    <Table
      columns={["NS", "EW", "Contract", "NS Score", "NS IMP", "EW IMP"]}
      body={scoredTraveller.lines
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
