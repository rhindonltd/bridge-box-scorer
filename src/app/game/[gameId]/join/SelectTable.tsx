import { PairDirection } from "@/model/common";
import { PairDirections } from "@/model/common";
import { Pair, PairSeat, seatFor } from "@/model/participants";

export interface SelectableSection {
  section: string;
  label: string;
  tables: number;
}

interface Props {
  sections: SelectableSection[];
  onSeatSelected: (seat: PairSeat) => void;
  startingPositions: Pair[];
}

export default function SelectTable({
  sections,
  onSeatSelected,
  startingPositions,
}: Props) {
  const isTaken = (section: string, table: number, direction: PairDirection) =>
    startingPositions.some(
      (a) => a.initialSeat === seatFor(section, table, direction),
    );

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="shrink-0 px-4 mt-2 mb-2">
        <span>Please select the table and direction you are sitting:</span>
      </div>

      <div className="flex-1 min-h-0 overflow-auto px-4 pb-4 space-y-6">
        {sections.map((s) => {
          const tableNumbers = Array.from(
            { length: s.tables },
            (_, i) => i + 1,
          );
          const multiSection = sections.length > 1;
          return (
            // With several sections each one sits in a grey card with a header
            // strip (matching the section cards on the Tables and Pairs
            // screens). A single section has nothing to disambiguate, so it
            // renders bare.
            <section
              key={s.section}
              className={
                multiSection
                  ? "overflow-hidden rounded-xl border border-gray-200 bg-gray-50"
                  : undefined
              }
            >
              {multiSection && (
                <h2 className="border-b border-gray-200 bg-gray-100 px-4 py-2.5 text-base font-semibold text-gray-800">
                  Section {s.section}
                  {s.label !== s.section ? ` — ${s.label}` : ""}
                </h2>
              )}
              <div
                className={`grid grid-cols-2 md:grid-cols-3 gap-4 w-full ${
                  multiSection ? "p-4" : ""
                }`}
              >
                {tableNumbers.map((table) => (
                  <div
                    key={`${s.section}-${table}`}
                    // A full table is indicated by its disabled seat buttons
                    // below (not by dimming the whole card): whole-card opacity
                    // dropped the header text below the WCAG AA contrast ratio.
                    className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden"
                  >
                    <div className="text-center py-3 text-lg font-semibold text-blue-900 border-b border-blue-200 bg-blue-100">
                      Table {table}
                    </div>

                    <div className="grid grid-cols-2">
                      {PairDirections.map((direction) => {
                        const taken = isTaken(s.section, table, direction);

                        return (
                          <button
                            key={direction}
                            data-testid={`seat-${seatFor(s.section, table, direction)}`}
                            onClick={() =>
                              onSeatSelected(
                                seatFor(s.section, table, direction),
                              )
                            }
                            disabled={taken}
                            className={`py-5 text-lg font-medium transition border-r last:border-r-0 border-gray-200 ${
                              taken
                                ? "bg-gray-200 text-gray-600 cursor-not-allowed line-through"
                                : "text-gray-700 hover:bg-gray-50 active:bg-gray-100"
                            }`}
                          >
                            {direction}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
