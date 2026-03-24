type Props = {
  columns: string[];
};

export function TableHead({ columns }: Props) {
  return (
    <thead className="bg-blue-600 text-white uppercase text-xs tracking-wide">
      <tr>
        {columns.map((column, index) => (
          <th
            key={index}
            className="sticky top-0 z-10 bg-blue-600 border-b border-blue-700 px-1 py-2 text-center"
          >
            {column}
          </th>
        ))}
      </tr>
    </thead>
  );
}
