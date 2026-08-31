export function CenteredContent({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex-1 min-h-0">
      <div className={`h-full flex flex-col items-center justify-center`}>
        {children}
      </div>
    </div>
  );
}
