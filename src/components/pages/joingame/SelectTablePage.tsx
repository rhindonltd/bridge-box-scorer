import SelectTable from "@/components/player/lobby/SelectTable";

interface Props {
  eventName: string;
  sessionName?: string;
  sectionName?: string;
  tables: number;
  selectTable: (table: number, direction: "NS" | "EW") => void;
}

export function SelectTablePage({
  eventName,
  sessionName,
  sectionName,
  tables,
  selectTable,
}: Props) {
  return (
    <>
      <SelectTable
        eventName={eventName}
        sessionName={sessionName}
        sectionName={sectionName}
        tables={tables}
        selectTable={selectTable}
      />
    </>
  );
}
