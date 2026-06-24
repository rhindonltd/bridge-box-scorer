// import { Bebas_Neue } from "next/font/google";
import "@/styles/globals.css";
import type { Metadata } from "next";

// const bebas = Bebas_Neue({
//   subsets: ["latin"],
//   weight: "400",
//   variable: "--font-bebas",
// });

export const metadata: Metadata = {
  title: "Bridge Box",
  description: "Bridge Box",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
