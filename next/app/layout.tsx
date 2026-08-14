import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const metadata: Metadata = {
  title: "小导片场 · 先查后讲",
  description:
    "小导随机甩你一个话题，你上网查 10 分钟资料，再用 1 分钟把它讲清楚。一个练「把陌生东西讲到别人听懂」的表达训练场。",
  openGraph: {
    title: "小导片场 · 先查后讲",
    description: "抽个词，查 10 分钟，讲 1 分钟。练的是把查到的东西讲明白的本事。",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="zh-CN"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
    >
      <body className="bg-white text-zinc-900 antialiased dark:bg-zinc-950 dark:text-zinc-100">
        {children}
      </body>
    </html>
  );
}
