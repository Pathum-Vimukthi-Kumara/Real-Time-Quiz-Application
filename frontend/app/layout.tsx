import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LAN Quiz - Real-Time Multiplayer Quiz",
  description: "Host and play real-time quiz games over your local network",
  keywords: ["quiz", "multiplayer", "real-time", "LAN", "game"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-animated`}>{children}</body>
    </html>
  );
}
