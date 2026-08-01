type Props = {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  fullWidth?: boolean;
  flex?: number;
};

export function ToggleButton({
  children,
  active = false,
  onClick,
  fullWidth = false,
  flex = 0,
}: Props) {
  return (
    <button
      onClick={onClick}
      className={`
        py-3 px-2 text-base rounded-lg border
        ${!fullWidth && !flex ? "aspect-square" : ""}
        ${active ? "bg-blue-600 text-white" : "bg-white text-black"}
      `}
      style={{
        flex: flex || undefined,
        width: fullWidth ? "100%" : undefined,
      }}
    >
      {children}
    </button>
  );
}
