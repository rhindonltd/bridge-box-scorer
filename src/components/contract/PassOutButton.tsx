type Props = {
  className?: string;
  onPassOut: () => void;
};

export default function PassOutButton({ className, onPassOut }: Props) {
  return (
    <button
      className={`w-full mt-2 p-2 text-base bg-blue-400 rounded-xl ${className}`}
      onClick={onPassOut}
    >
      Pass Out
    </button>
  );
}
