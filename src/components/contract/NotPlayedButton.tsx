type Props = {
  className?: string;
  onNotPlayed: () => void;
};

export default function NotPlayedButton({ className, onNotPlayed }: Props) {
  return (
    <button
      className={`w-full mt-2 p-2 text-base bg-blue-400 rounded-xl ${className}`}
      onClick={onNotPlayed}
    >
      Not Played
    </button>
  );
}
