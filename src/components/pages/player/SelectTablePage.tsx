import SelectTable from "@/components/player/lobby/SelectTable";

interface Props {
  tables: number;
  selectTable: (table: number, direction: "NS" | "EW") => void;
}

export function SelectTablePage({ tables, selectTable }: Props) {
  return (
    <>
      <SelectTable tables={tables} selectTable={selectTable} />
    </>
  );
}
