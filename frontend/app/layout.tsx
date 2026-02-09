import type { Metadata } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/contexts/ToastContext";
import ToastContainer from "@/components/Toast";
import ErrorBoundary from "@/components/ErrorBoundary";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-body" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-display" });

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
      <body className={`${manrope.variable} ${spaceGrotesk.variable} bg-animated`}>
        <ErrorBoundary>
          <ToastProvider>
            {children}
            <ToastContainer />
          </ToastProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
