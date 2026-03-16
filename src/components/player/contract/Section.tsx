type Props = {
  title: string;
  children: React.ReactNode;
  gridCols?: number;
};

export default function Section({ title, children, gridCols = 1 }: Props) {
  return (
    <div className="border border-gray-300 rounded-lg p-1 bg-gray-50">
      <div className="text-sm font-bold bg-blue-600 text-white px-2 py-1 rounded mb-1">
        {title}
      </div>

      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${gridCols},1fr)` }}
      >
        {children}
      </div>
    </div>
  );
}
