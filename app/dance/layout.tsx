import type { PropsWithChildren } from "react";

import type { Metadata } from "next";

import "./dance.css";

export const metadata: Metadata = {
  title: "Lingo Dance",
  description:
    "Gõ đúng từ tiếng Anh, nhấn Enter đúng nhịp nhạc để nhân vật nhảy cùng cả lớp.",
};

const DanceLayout = ({ children }: PropsWithChildren) => {
  return <div className="h-full">{children}</div>;
};

export default DanceLayout;
