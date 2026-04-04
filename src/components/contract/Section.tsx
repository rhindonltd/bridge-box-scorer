type Props = {
  className?: string;
  title: string;
  children: React.ReactNode;
  gridCols?: number;
};

export default function Section({
  className,
  title,
  children,
  gridCols = 1,
}: Props) {
  return (
    <div
      className={`border border-gray-300 bg-gray-50 flex flex-col h-full ${className}`}
    >
      <div className="text-sm font-bold bg-blue-600 text-white px-2 py-1 mb-1">
        {title}
      </div>

      <div
        className="grid gap-1 p-1 flex-1 min-h-0"
        style={{ gridTemplateColumns: `repeat(${gridCols},1fr)` }}
      >
        {children}
      </div>
    </div>
  );
}
