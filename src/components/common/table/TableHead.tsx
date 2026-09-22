/** Horizontal alignment of a header cell. Defaults to centre. */
export type ColumnAlign = "left" | "center";

type Props = {
  columns: string[];
  /**
   * Per-column header alignment (indexes match `columns`). Omit, or use
   * "center", to centre a header; use "left" to left-align it so it sits over
   * left-aligned cell content such as a Pair/Team name column.
   */
  aligns?: ColumnAlign[];
};

export function TableHead({ columns, aligns }: Props) {
  return (
    <thead className="bg-blue-600 text-white uppercase text-xs tracking-wide">
      <tr>
        {columns.map((column, index) => (
          <th
            key={index}
            // Header stays pinned at `top-0` (so it never shifts before
            // catching), and the upward box-shadow (`shadow-[0_-1px_0_#2563eb]`,
            // the header's own blue) paints over the sub-pixel seam where a
            // sliver of the scrolling row would otherwise peek above it.
            className={`sticky top-0 z-10 bg-blue-600 shadow-[0_-1px_0_#2563eb] border-b border-blue-700 px-1 py-2 ${
              aligns?.[index] === "left" ? "text-left" : "text-center"
            }`}
          >
            {column}
          </th>
        ))}
      </tr>
    </thead>
  );
}
