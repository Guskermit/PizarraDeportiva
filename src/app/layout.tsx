import "@/app/globals.css";

import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "next-themes";
import { Geist } from "next/font/google";

import { baseURL, meta } from "@/resources/seo";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  metadataBase: new URL(baseURL),
  title: meta.home.title,
  description: meta.home.description,
  alternates: {
    canonical: meta.home.canonical,
  },
  robots: meta.home.robots,
  openGraph: {
    title: meta.home.title,
    description: meta.home.description,
    url: meta.home.path,
    images: [meta.home.image],
  },
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
    <html lang="en" className={geist.variable} suppressHydrationWarning>
      <body className="min-h-dvh bg-background text-foreground antialiased">
        <ThemeProvider attribute="class" defaultTheme="dark">
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
