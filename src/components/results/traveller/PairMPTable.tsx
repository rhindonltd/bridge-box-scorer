import { ScoredPairMPTraveller } from "@/model/scored-traveller";
import { BoardResult } from "@/components/results/traveller/BoardResult";
import { TableRow } from "@/components/common/table/TableRow";
import { Table } from "@/components/common/table/Table";

type Props = {
  scoredTraveller: ScoredPairMPTraveller;
};

export function PairMPTable({ scoredTraveller }: Props) {
  return (
    <Table
      columns={["NS", "EW", "Contract", "NS Score", "NS MP", "EW MP"]}
      body={scoredTraveller.lines
        .filter((x) => x.score !== null)
        .map((row, index, arr) => {
          const isLast = index === arr.length - 1;
          return (
            <TableRow
              key={index}
              cells={[
                `${row.nsPairId}`,
                `${row.ewPairId}`,
                <BoardResult key={index} boardOutcome={row.outcome} />,
                row.score,
                row.nsMatchPoints,
                row.ewMatchPoints,
              ]}
              className={isLast ? "rounded-bl-lg rounded-br-lg" : ""}
            />
          );
        })}
    />
  );
}
