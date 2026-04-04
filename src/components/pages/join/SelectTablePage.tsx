import { SectionInfo } from "@/components/common/SectionInfo";
import SelectTable from "@/components/join/SelectTable";

type Assignment = {
  table: number;
  direction: "NS" | "EW";
};

interface Props {
  tables: number;
  selectTable: (table: number, direction: "NS" | "EW") => void;
  assigned: Assignment[];
}

export function SelectTablePage({ tables, selectTable, assigned }: Props) {
  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <div className="w-full">
        <SectionInfo />
      </div>

      <SelectTable
        tables={tables}
        selectTable={selectTable}
        assigned={assigned}
      />
    </div>
  );
}
