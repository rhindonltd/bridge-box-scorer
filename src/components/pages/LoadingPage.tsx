import { CaptionedSpinner } from "@/components/common/Spinner";

export function LoadingPage() {
  return (
    <div className="h-screen flex items-center justify-center bg-gray-100">
      <CaptionedSpinner caption="Loading..." />
    </div>
  );
}
