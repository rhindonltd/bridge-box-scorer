import { ScoredIndividualMPTraveller } from "@/model/scored-traveller";
import { BoardResult } from "@/components/results/traveller/BoardResult";
import { TableRow } from "@/components/common/table/TableRow";
import { Table } from "@/components/common/table/Table";

type Props = {
  scoredTraveller: ScoredIndividualMPTraveller;
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
                `${row.nPlayerId} - ${row.sPlayerId}`,
                `${row.ePlayerId} - ${row.wPlayerId}`,
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
