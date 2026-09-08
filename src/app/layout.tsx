import "@/styles/globals.css";
import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";

// Inter, self-hosted (SIL OFL, see src/app/fonts/OFL.txt). Served from the repo
// via next/font/local rather than next/font/google so `next build` makes no
// network calls — the appliance builds on-device with no internet. These are
// the Inter *variable* woff2 files (weight axis 100-900), which cover every
// weight the UI uses (400/500/600/700). The `--font-sans` CSS variable wiring
// is unchanged, so rendering is identical to the previous Google-hosted setup.
const inter = localFont({
  src: [
    {
      path: "./fonts/InterVariable.woff2",
      weight: "100 900",
      style: "normal",
    },
    {
      path: "./fonts/InterVariable-Italic.woff2",
      weight: "100 900",
      style: "italic",
    },
  ],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Bridge Box",
  description: "Bridge Box Scorer",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-gray-100 overflow-hidden">
        <div className="mx-auto max-w-2xl h-dvh bg-white flex flex-col overflow-hidden">
          {children}
        </div>
      </body>
    </html>
  );
}
