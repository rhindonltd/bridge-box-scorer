type Props = {
  onPassOut: () => void;
};

export default function PassOutButton({ onPassOut }: Props) {
  return (
    <button
      className="w-full mt-2 p-2 text-base bg-blue-400 rounded-xl"
      onSubmit={onPassOut}
    >
      Pass Out
    </button>
  );
}
