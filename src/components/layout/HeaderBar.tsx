import { ArrowLeft } from "lucide-react";
import Link from "next/link";

type Props = {
  /** Primary header text (e.g., event name, "Manage Games", "Settings") */
  headerTitle: string;
  /** URL to navigate to when back arrow is tapped. Omit to hide back arrow. */
  backHref?: string;
  /** Secondary line below the title (e.g., session/section info) */
  headerSubtitle?: string;
  /** Secondary line below the title (e.g., session/section info) */
  headerSubtitle2?: string;
  /** Right-aligned content in the header (e.g., "Pair 3") */
  headerRight?: React.ReactNode;
};

export function HeaderBar({
  headerTitle,
  backHref,
  headerSubtitle,
  headerSubtitle2,
  headerRight,
}: Props) {
  return (
    <div className="shrink-0">
      <div className="bg-gray-200 text-gray-800 px-3 py-2 flex items-center gap-2">
        {backHref && (
          <Link
            href={backHref}
            className="p-2 -ml-2 rounded-lg hover:bg-gray-300 transition"
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </Link>
        )}
        <div className="flex-1 flex items-start justify-between min-w-0">
          <div className="truncate">
            <div className="font-semibold">{headerTitle}</div>
            {headerSubtitle && (
              <div className="text-sm text-gray-600">{headerSubtitle}</div>
            )}
            {headerSubtitle2 && (
              <div className="text-sm text-gray-600">{headerSubtitle2}</div>
            )}
          </div>
          {headerRight && (
            <span className="font-semibold whitespace-nowrap ml-2">
              {headerRight}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
