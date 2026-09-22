import { ReactNode } from "react";
import { TableHead, type ColumnAlign } from "@/components/common/table/TableHead";
import { TableBody } from "@/components/common/table/TableBody";

type Props = {
  columns: string[];
  body: ReactNode;
  /** Per-column header alignment (indexes match `columns`); defaults to centre. */
  aligns?: ColumnAlign[];
  /**
   * By default the table owns its own vertical scroll region, so its header
   * sticks within that region. Set this false when an ancestor already scrolls
   * (e.g. the room-display leaderboard auto-scrolls its own container): the
   * table then grows to its natural height and its sticky header pins to that
   * outer scroll region instead of a redundant inner one.
   */
  scroll?: boolean;
};

export function Table({ columns, body, aligns, scroll = true }: Props) {
  return (
    <div
      // `mt-2` insets the table when it owns its scroll region. When an ancestor
      // scrolls (scroll=false), that top margin would be scrollable slack the
      // auto-scroll eats before any row moves (the table appears to "creep up"
      // first), so drop it — the display provides its own top spacing.
      className={`flex flex-col mx-2 ${scroll ? "mt-2 h-full min-h-0" : ""}`}
    >
      {/*
        When `scroll` is true the inner wrapper is the vertical scroll region
        and the sticky header pins to it. When false, it must NOT clip on any
        axis: any non-`visible` overflow (even `overflow-x-auto`) makes this
        element the sticky containing block, which would pin the header to this
        non-scrolling wrapper instead of the ancestor that actually scrolls.
      */}
      <div
        className={
          scroll ? "flex-1 min-h-0 overflow-auto" : "overflow-visible"
        }
      >
        <table className="min-w-full shadow-sm rounded-lg border border-gray-200 divide-y divide-gray-200 text-sm">
          <TableHead columns={columns} aligns={aligns} />
          <TableBody body={body} />
        </table>
      </div>
    </div>
  );
}
