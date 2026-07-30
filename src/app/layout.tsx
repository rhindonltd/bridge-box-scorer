import "@/styles/globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bridge Box",
  description: "Bridge Box Scorer",
  viewport: "width=device-width, initial-scale=1, viewport-fit=cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-gray-100">
        <div className="mx-auto max-w-2xl min-h-dvh">
          {children}
        </div>
      </body>
    </html>
  );
}
