import { ReactNode, FormEvent } from "react";
import Button from "@/components/common/Button";

type Props = {
  header: string;
  headerColor?: string;

  children: ReactNode;

  onSubmit: (e: FormEvent) => void;

  primaryText?: string;
  secondaryText?: string;

  onSecondaryClick?: () => void;

  loading?: boolean;
  disabled?: boolean;
};

export default function FormCardLayout({
  header,
  headerColor = "bg-blue-600",
  children,
  onSubmit,
  primaryText = "Continue",
  secondaryText,
  onSecondaryClick,
  loading = false,
  disabled = false,
}: Props) {
  return (
    <div className="flex items-center justify-center min-h-screen font-sans ml-2 mr-4">
      <div className="w-full max-w-sm bg-white shadow-lg overflow-hidden">
        {/* Header */}
        <div
          className={`${headerColor} text-white text-center py-4 text-xl font-bold`}
        >
          {header}
        </div>

        <form onSubmit={onSubmit} className="p-6 flex flex-col gap-5">
          {children}

          {/* Buttons */}
          <div className="flex flex-col gap-3 pt-2">
            <Button
              type="submit"
              disabled={disabled || loading}
              value={loading ? "Loading..." : primaryText}
            />
            {secondaryText && onSecondaryClick && (
              <Button
                type="button"
                textColour="text-gray-700"
                bgColour="bg-gray-200"
                hoverColour="hover:bg-gray-300"
                value={secondaryText}
                onClick={onSecondaryClick}
              />
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
