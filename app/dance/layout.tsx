import type { PropsWithChildren } from "react";

import type { Metadata, Viewport } from "next";
import { Bebas_Neue, Be_Vietnam_Pro } from "next/font/google";

import { cn } from "@/lib/utils";

import "./dance.css";

const display = Bebas_Neue({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
});

const body = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "Lingo Dance",
  description:
    "Gõ đúng từ tiếng Anh, nhấn Enter đúng nhịp nhạc để vũ công của bạn trình diễn cùng cả lớp.",
};

export const viewport: Viewport = {
  themeColor: "#07060c",
};

const DanceLayout = ({ children }: PropsWithChildren) => {
  return (
    <div
      className={cn("dance-root min-h-full", display.variable, body.variable)}
    >
      {children}
    </div>
  );
};

export default DanceLayout;
