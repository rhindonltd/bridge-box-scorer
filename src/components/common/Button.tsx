type Props = {
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  value: string;
  textColour?: string;
  bgColour?: string;
  hoverColour?: string;
  className?: string;
  onClick?: () => void;
};

export default function Button({
  type = "button",
  disabled = false,
  value,
  textColour = "text-white",
  bgColour = "bg-blue-600",
  hoverColour = "hover:bg-blue-700",
  className,
  onClick,
}: Props) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={`flex-1 border py-3 text-lg font-semibold rounded-xl active:scale-[0.98] transition disabled:opacity-50 ${textColour} ${bgColour} ${hoverColour} ${className}`}
      onClick={onClick}
    >
      {value}
    </button>
  );
}
