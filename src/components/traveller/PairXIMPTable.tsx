import { BoardResult } from "@/components/traveller/BoardResult";
import { TableRow } from "@/components/common/table/TableRow";
import { Table } from "@/components/common/table/Table";
import { ScoredTravellerOfType } from "@/scoring/traveller/score-traveller";

type Props = {
  scoredTraveller: ScoredTravellerOfType<"PAIR_XIMP">;
  highlightAssignmentId?: string;
};

export function PairXIMPTable({
  scoredTraveller,
  highlightAssignmentId,
}: Props) {
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
          const highlighted =
            highlightAssignmentId !== undefined &&
            (row.nsId === highlightAssignmentId ||
              row.ewId === highlightAssignmentId);
          return (
            <TableRow
              key={index}
              highlighted={highlighted}
              striped={highlightAssignmentId === undefined}
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
