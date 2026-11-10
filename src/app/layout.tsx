import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import MathJaxLoader from "@/components/MathJaxLoader";
import ExplorationCaption from "@/components/ExplorationCaption";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MathVoice - 数式アクセシビリティ",
  description: "視覚障害のある学生が講義の数式を構造的に理解できるWebアプリ",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-black focus:rounded">
          メインコンテンツへスキップ
        </a>
        <MathJaxLoader />
        {children}
        <ExplorationCaption />
      </body>
    </html>
  );
}
