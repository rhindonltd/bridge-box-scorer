import { BoardResult } from "@/components/results/traveller/BoardResult";
import { TableRow } from "@/components/common/table/TableRow";
import { Table } from "@/components/common/table/Table";
import { IndividualMatchpointScoredTraveller } from "@/model/scored-traveller";

type Props = {
  scoredTraveller: IndividualMatchpointScoredTraveller;
};

export function IndividualMPTable({ scoredTraveller }: Props) {
  return (
    <Table
      columns={["N-S", "E-W", "", "NS Score", "NS MP", "EW MP"]}
      body={scoredTraveller.lines
        .filter((x) => x.score !== null)
        .map((row, index, arr) => {
          const isLast = index === arr.length - 1;
          return (
            <TableRow
              key={index}
              cells={[
                `${row.nId}-${row.sId}`,
                `${row.eId}-${row.wId}`,
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
