import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ساخت رایگان تعمیرگاه | پیوو",
  description: "ساخت فضای کاری پیوو برای مدیریت پذیرش، تعمیرات، مشتریان و فاکتورها.",
  robots: { index: false, follow: false },
};

export default function SignupLayout({ children }: { children: React.ReactNode }) { return children; }
